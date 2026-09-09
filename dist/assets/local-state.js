/* Local learner notebook. MIT. Device state is never account authentication. */
(function () {
  'use strict';
  var Q = window.QEVA, E = Q.Learning, KEY = 'qeva.learner.v1';
  var state = E.blank(), persistent = true, blocked = false, warning = '', listeners = [];
  function notify() {
    document.querySelectorAll('[data-storage-notice]').forEach(function (el) {
      el.textContent = warning || 'Local notebook · browser-only storage. No account or server sync.';
      el.classList.toggle('storage-warning', !!warning);
    });
    listeners.forEach(function (fn) { fn(state); });
  }
  function unavailable(message) { persistent = false; warning = message + ' Changes are kept only in this tab. Export your notebook before closing it.'; }
  try {
    var raw = localStorage.getItem(KEY);
    if (raw !== null) state = E.validateLearner(E.parse(raw, 1048576));
  } catch (error) {
    blocked = true; unavailable('Local storage is unavailable or contains unreadable data. Existing bytes have not been overwritten.');
  }
  function commit(next, replace) {
    next = E.validateLearner(next);
    if (!blocked) {
      try {
        var existing = localStorage.getItem(KEY);
        if (existing !== null && !replace) next = E.merge(E.validateLearner(E.parse(existing, 1048576)), next);
        var text = JSON.stringify(next);
        if (text.length > 1048576) throw new Error('Notebook size limit reached.');
        localStorage.setItem(KEY, text); persistent = true; warning = '';
      } catch (error) { unavailable('The notebook could not be saved on this device: ' + error.message); }
    }
    state = next; notify(); return state;
  }
  function id() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    if (window.crypto && window.crypto.getRandomValues) {
      var bytes = new Uint32Array(4); window.crypto.getRandomValues(bytes);
      return Array.from(bytes).map(function (v) { return v.toString(16); }).join('-');
    }
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + id.counter++;
  }
  id.counter = 0;
  function copy() { return JSON.parse(JSON.stringify(state)); }
  Q.Local = {
    key: KEY,
    get: copy,
    id: id,
    status: function () { return {persistent: persistent, warning: warning, blocked: blocked}; },
    subscribe: function (fn) { listeners.push(fn); },
    discover: function (ref) {
      if (state.discoveries.indexOf(ref) < 0) { var next = copy(); next.discoveries.push(ref); commit(next); }
    },
    record: function (ref, response) {
      var next = copy(); next.attempts.push({id: id(), at: new Date().toISOString(), activity_ref: ref, response: response});
      commit(next); // all attempts retained, including failures; no outcome is trusted or persisted
    },
    preferences: function (patch) {
      var next = copy(); Object.keys(patch).forEach(function (k) { if (k === 'mode' || k === 'goal') next.preferences[k] = patch[k]; }); commit(next);
    },
    import: function (text) { var imported = E.validateLearner(E.parse(text, 1048576)); return commit(E.merge(state, imported)); },
    reset: function () { blocked = false; return commit(E.blank(), true); },
    rawBackup: function () { try { return localStorage.getItem(KEY); } catch (_) { return null; } },
    refresh: notify
  };
  window.addEventListener('storage', function (event) {
    if (event.key !== KEY || !event.newValue) return;
    try {
      var remote = E.validateLearner(E.parse(event.newValue, 1048576));
      // An explicit reset received from another tab also clears this tab's view.
      state = remote.attempts.length === 0 && remote.discoveries.length === 0 ? remote : E.merge(state, remote);
      notify();
    } catch (_) { unavailable('A conflicting or unreadable notebook appeared in another tab; no evidence was overwritten.'); notify(); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', notify); else notify();
}());
