// background.js — entry point. Boots the controller once DOM is ready.

document.addEventListener('DOMContentLoaded', () => {
  const controller = new BackgroundController();
  window.jintoController = controller;  // expose for debugging
  controller.run().catch((err) => {
    console.error('[jinto/bg] fatal:', err);
  });
});
