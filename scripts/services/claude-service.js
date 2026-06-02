// claude-service.js
// Streams responses from Anthropic Claude API using SSE.
// Supports tool calls (e.g. show_image) parsed inline from the stream.

class ClaudeService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'claude-haiku-4-5';
    this.maxTokens = 512;
    this._abortController = null;
  }

  /**
   * Stream a response.
   * @param {Array} messages — [{role, content}]
   * @param {string} systemPrompt
   * @param {Function} onDelta — (chunkText, accumulatedText) => void
   * @param {Array} [tools] — Anthropic tool definitions
   * @param {Function} [onToolCall] — (toolName, inputObject) => void, fired when a tool_use block completes
   * @returns {Promise<string>} full accumulated text
   */
  async stream(messages, systemPrompt, onDelta, tools, onToolCall) {
    this._abortController = new AbortController();
    const body = {
      model: this.model,
      max_tokens: this.maxTokens,
      stream: true,
      system: systemPrompt,
      messages,
    };
    if (tools && tools.length) {
      body.tools = tools;
    }

    let response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
        signal: this._abortController.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.error('[claude] fetch failed', err);
      throw new Error('Claude fetch failed: ' + err.message);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[claude] HTTP', response.status, errText);
      throw new Error('Claude HTTP ' + response.status + ': ' + errText.slice(0, 200));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    const blocks = {}; // index -> { type, name, jsonBuf }

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop();

      for (const eventBlock of events) {
        const lines = eventBlock.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;
          let data;
          try { data = JSON.parse(dataStr); } catch (_) { continue; }

          if (data.type === 'content_block_start') {
            const cb = data.content_block || {};
            blocks[data.index] = { type: cb.type, name: cb.name, jsonBuf: '' };
          } else if (data.type === 'content_block_delta') {
            const d = data.delta || {};
            if (d.type === 'text_delta') {
              const chunk = d.text || '';
              if (chunk) {
                fullText += chunk;
                if (onDelta) onDelta(chunk, fullText);
              }
            } else if (d.type === 'input_json_delta') {
              const b = blocks[data.index];
              if (b) b.jsonBuf += (d.partial_json || '');
            }
          } else if (data.type === 'content_block_stop') {
            const b = blocks[data.index];
            if (b && b.type === 'tool_use' && onToolCall) {
              let input = {};
              try { input = JSON.parse(b.jsonBuf || '{}'); } catch (_) {}
              try { onToolCall(b.name, input); } catch (e) { console.error('[claude] onToolCall error', e); }
            }
          } else if (data.type === 'error') {
            console.error('[claude] stream error event', data);
            throw new Error('Claude stream error: ' + JSON.stringify(data.error || {}));
          }
        }
      }
    }

    this._abortController = null;
    return fullText;
  }

  abort() {
    if (this._abortController) {
      try { this._abortController.abort(); } catch (_) {}
      this._abortController = null;
    }
  }
}
