// game-state-service.js
// Subscribes to Overwolf's Valorant GEP and maintains current game state in memory.
// Other code (system prompt, refusal gate, overlay) reads from this.

// Overwolf's Valorant team feature has been degraded/wrong (July 2026). While false, the
// player's side stays "unknown" and observed raw values are logged for later verification.
const TRUST_TEAM_FEED = false;

class GameStateService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.state = {
      agent: null,       // e.g. "Viper" (cleaned from Overwolf's "Viper_PC_C")
      map: null,         // e.g. "Breeze"
      side: null,        // "attack" or "defense"
      roundNumber: null, // 1, 2, 3 ...
      roundPhase: null,  // "shopping" | "combat" | "end" | "game_end"
      score: null,       // "5-3" or { ours: 5, theirs: 3 }
      gameState: null,   // "WaitingToStart" | "InProgress" | etc.
      health: null,
    };
    this._registered = false;
  }

  start() {
    overwolf.games.events.onInfoUpdates2.addListener((e) => this._handleInfoUpdate(e));
    overwolf.games.events.onNewEvents.addListener((e) => this._handleEvent(e));
    overwolf.games.events.onError.addListener((err) => {
      console.warn('[gep] onError', err);
      // Retry feature registration after error
      setTimeout(() => this._setRequiredFeatures(), 5000);
    });

    // Try to register immediately (works if Valorant is already running)
    this._setRequiredFeatures();

    // Re-register whenever Valorant launches or is detected
    overwolf.games.onGameLaunched.addListener((info) => {
      if (info && info.classId === 21640) {
        console.log('[gep] Valorant launched — registering features');
        this._setRequiredFeatures();
      }
    });
    overwolf.games.onGameInfoUpdated.addListener((info) => {
      if (info && info.gameInfo && info.gameInfo.classId === 21640 && info.runningChanged && info.gameInfo.isRunning) {
        console.log('[gep] Valorant running detected — registering features');
        this._setRequiredFeatures();
      }
    });

    // Belt-and-suspenders: keep trying every 10s until registered
    const interval = setInterval(() => {
      if (this._registered) {
        clearInterval(interval);
        return;
      }
      overwolf.games.getRunningGameInfo((gameInfo) => {
        if (gameInfo && gameInfo.isRunning && gameInfo.classId === 21640) {
          console.log('[gep] periodic retry — Valorant running, re-registering');
          this._setRequiredFeatures();
        }
      });
    }, 10000);
  }

  _setRequiredFeatures(attempts = 0) {
    const features = ['me', 'match_info', 'game_info', 'kill', 'death'];
    overwolf.games.events.setRequiredFeatures(features, (info) => {
      if (info && info.success) {
        console.log('[gep] features registered. supported:', info.supportedFeatures);
        this._registered = true;
        this._supportedFeatures = info.supportedFeatures || features;
        this.eventBus.trigger('gep-registered', true);
        // After a successful registration, pull a snapshot of current info
        overwolf.games.events.getInfo((res) => {
          if (res && res.success && res.res) {
            this._handleInfoUpdate({ info: res.res });
            console.log('[gep] initial snapshot:', JSON.stringify(res.res).slice(0, 300));
          } else {
            console.warn('[gep] getInfo returned no data', res);
          }
        });
      } else {
        console.warn('[gep] setRequiredFeatures failed, retrying...', info);
        this._registered = false;
        if (attempts < 8) setTimeout(() => this._setRequiredFeatures(attempts + 1), 3000);
      }
    });
  }

  getSupportedFeatures() {
    return this._supportedFeatures || [];
  }

  _handleInfoUpdate(update) {
    if (!update || !update.info) return;
    const info = update.info;
    let changed = false;

    // Record last raw update for debugging
    this._lastRawUpdate = JSON.stringify(update.info).slice(0, 200);
    if (this.eventBus) this.eventBus.trigger('gep-raw', this._lastRawUpdate);

    if (info.me) {
      if (typeof info.me.agent === 'string') {
        const clean = this._cleanAgentName(info.me.agent);
        if (clean !== this.state.agent) {
          this.state.agent = clean;
          changed = true;
          console.log('[gep] agent =', clean);
        }
      }
      if (info.me.health != null) {
        this.state.health = parseInt(info.me.health, 10);
      }
    }

    if (info.match_info) {
      if (typeof info.match_info.map === 'string') {
        const cleanMap = this._cleanMapName(info.match_info.map);
        if (cleanMap !== this.state.map) {
          const prevMap = this.state.map;
          this.state.map = cleanMap;
          changed = true;
          console.log('[gep] map raw =', info.match_info.map, '-> display =', cleanMap);
          // Different real map than the last one → a new match started.
          if (prevMap && cleanMap && prevMap !== cleanMap) this._newMatch('map change');
        }
      }
      if (info.match_info.team != null) {
        // Overwolf's team feature is currently degraded AND has been observed WRONG in play
        // (reported attack while on defense). Wrong side = wrong coaching, so side stays
        // unknown until their feed is green and we've verified real values from these logs.
        // Flip TRUST_TEAM_FEED at the top of this file once verified.
        if (TRUST_TEAM_FEED) {
          const side = this._cleanSide(info.match_info.team);
          if (side !== this.state.side) this.state.side = side;
        } else {
          if (this._lastLoggedTeam !== info.match_info.team) {
            console.log('[gep] team value observed (untrusted, not used):', JSON.stringify(info.match_info.team), 'at round', this.state.roundNumber);
            this._lastLoggedTeam = info.match_info.team;
          }
          this.state.side = null;
        }
      }
      if (info.match_info.round_number != null) {
        const rn = parseInt(info.match_info.round_number, 10);
        // Round counter fell back to 1 → new match (covers same-map-twice).
        if (this.state.roundNumber != null && this.state.roundNumber > 1 && rn === 1) {
          this._newMatch('round reset');
        }
        this.state.roundNumber = rn;
      }
      if (info.match_info.round_phase != null) this.state.roundPhase = info.match_info.round_phase;
      if (info.match_info.score != null) this.state.score = info.match_info.score;
    }

    if (info.game_info) {
      if (info.game_info.state) this.state.gameState = info.game_info.state;
      // scene carries the map name in-game ("Ascent") — use it as a map fallback for
      // mid-match launches where match_info.map never arrived.
      if (typeof info.game_info.scene === 'string' && !this.state.map) {
        const sceneMap = this._cleanMapName(info.game_info.scene);
        if (sceneMap && !/menu|range|lobby|select/i.test(sceneMap)) {
          this.state.map = sceneMap;
          changed = true;
          console.log('[gep] map (from scene) =', sceneMap);
        }
      }
    }

    // Mid-match launch recovery: map/round known but no agent -> GEP never pushed "me".
    // Re-pull the full snapshot until the agent shows up (seen live: dashboard said
    // "agent select on Ascent" during a real match).
    if (!this.state.agent && (this.state.map || this.state.roundPhase)) this._startAgentRecovery();
    else if (this.state.agent) this._stopAgentRecovery();

    if (changed) {
      this.eventBus.trigger('game-state', { ...this.state });
    }
  }

  _startAgentRecovery() {
    if (this._agentRecoveryTimer) return;
    let tries = 0;
    console.log('[gep] agent unknown with a map in view — polling getInfo until it appears');
    this._agentRecoveryTimer = setInterval(() => {
      if (this.state.agent || ++tries > 20) { this._stopAgentRecovery(); return; }
      overwolf.games.events.getInfo((res) => {
        if (res && res.success && res.res) this._handleInfoUpdate({ info: res.res });
      });
    }, 15000);
  }

  _stopAgentRecovery() {
    if (this._agentRecoveryTimer) {
      clearInterval(this._agentRecoveryTimer);
      this._agentRecoveryTimer = null;
    }
  }

  _handleEvent(events) {
    // Discrete events — match_start, kill, death, spike_planted, etc. Not used directly.
  }

  /** A new match started (map changed or round counter reset). Consumers: conversation auto-reset. */
  _newMatch(why) {
    console.log('[gep] new match detected (' + why + ')');
    this.eventBus.trigger('new-match', why);
  }

  /**
   * Overwolf returns Valorant agent names as Riot's internal codenames or *_PC_C variants.
   * Translate to the canonical display name we match against our supported set.
   */
  _cleanAgentName(raw) {
    if (!raw) return null;
    // Strip trailing _PC_X suffix and any leftover underscores
    let name = raw.replace(/_PC_[A-Z0-9]+$/i, '').replace(/_/g, ' ').trim();

    // Riot internal codenames → display names. Add as discovered.
    const codenames = {
      // Confirmed
      'Wushu':     'Jett',     // Jett
      'Pandemic':  'Viper',    // Viper
      'Breach':    'Breach',   // already display
      'Killjoy':   'Killjoy',  // already display
      // Likely (per public leaks/wiki — verify if seen in GEP)
      'Hunter':    'Sova',
      'Gumshoe':   'Cypher',
      'Wraith':    'Omen',
      'Vampire':   'Reyna',
      'Clay':      'Raze',
      'Thorne':    'Sage',
      'Phoenix':   'Phoenix',
      'Sarge':     'Brimstone',
      'Skye':      'Skye',
      'Yoru':      'Yoru',
      'Astra':     'Astra',
      'Chamber':   'Chamber',
      'KAYO':      'KAY/O',
      'Kayo':      'KAY/O',
      'Kay O':     'KAY/O',
      'Neon':      'Neon',
      'Fade':      'Fade',
      'Harbor':    'Harbor',
      'Gekko':     'Gekko',
      'Deadlock':  'Deadlock',
      'Iso':       'Iso',
      'Clove':     'Clove',
      'Vyse':      'Vyse',
      'Tejo':      'Tejo',
      'Waylay':    'Waylay',
    };
    if (codenames[name]) name = codenames[name];

    return name;
  }

  /**
   * The team field must be a real side. The half-recovered feed has sent raw numbers here;
   * showing those (or telling the AI "Side: 3") is worse than showing nothing.
   */
  _cleanSide(raw) {
    const s = String(raw).toLowerCase();
    if (s.includes('att')) return 'attack';
    if (s.includes('def')) return 'defense';
    return null;
  }

  /**
   * Valorant maps also have internal codenames in GEP. Map them to display names.
   */
  _cleanMapName(raw) {
    if (!raw) return null;
    let name = String(raw).trim();

    // Riot internal map codenames → display names. Add as discovered.
    const mapCodenames = {
      // Confirmed display names (no codename used)
      'Ascent':   'Ascent',
      'Range':    'Range',

      // Known internal codenames
      'Duality':   'Bind',
      'Triad':     'Haven',
      'Bonsai':    'Split',
      'Port':      'Icebox',
      'Foxtrot':   'Breeze',
      'Canyon':    'Fracture',
      'Pitt':      'Pearl',
      'Jam':       'Lotus',
      'Juliett':   'Sunset',
      'Infinity':  'Abyss',

      // Fallback: maps that may already report display names
      'Bind':      'Bind',
      'Haven':     'Haven',
      'Split':     'Split',
      'Icebox':    'Icebox',
      'Breeze':    'Breeze',
      'Fracture':  'Fracture',
      'Pearl':     'Pearl',
      'Lotus':     'Lotus',
      'Sunset':    'Sunset',
      'Abyss':     'Abyss',
    };

    if (mapCodenames[name]) name = mapCodenames[name];
    return name;
  }

  /** Snapshot of current state for the system prompt. */
  snapshot() {
    return { ...this.state };
  }

  /** Last raw GEP info-update we received, for debugging. */
  lastRaw() {
    return this._lastRawUpdate || '(none yet)';
  }
}
