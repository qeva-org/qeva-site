/* QEVA Learning Engine 1. Pure data/assessment logic; MIT. No DOM or storage. */
(function (root, factory) {
  'use strict';
  var api = factory(typeof module === 'object' && module.exports ? require('./kernels.js') : root.QEVA.Kernels);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.QEVA = root.QEVA || {}; root.QEVA.Learning = api; }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (Kernels) {
  'use strict';
  var STATES = ['locked', 'available', 'discovered', 'learning', 'understood', 'mastered'];
  var TYPES = ['number', 'choice', 'classification', 'order', 'experiment'];
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var ref = function (o) { return o.id + '@' + o.revision; };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  function stable(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
  }
  function safeData(v, depth) {
    depth = depth || 0;
    if (depth > 24) throw new Error('Data nesting is too deep.');
    if (v && typeof v === 'object') Object.keys(v).forEach(function (k) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') throw new Error('Unsafe object key.');
      safeData(v[k], depth + 1);
    });
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('Non-finite number.');
  }
  function parse(text, maxBytes) {
    if (typeof text !== 'string' || text.length > (maxBytes || 1048576)) throw new Error('File exceeds the supported size limit.');
    var value = JSON.parse(text); safeData(value); return value;
  }
  function assess(activity, response) {
    var c = activity.config, r = response || {}, pass = false;
    try {
      safeData(r);
      if (activity.type === 'number') {
        var raw = String(r.value === undefined ? '' : r.value).trim();
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) return {passed: false, message: 'Enter a finite decimal number; blank text is not zero.'};
        var n = Number(raw); pass = Number.isFinite(n) && Math.abs(n - c.value) <= c.tolerance;
      } else if (activity.type === 'choice') {
        pass = c.options.some(function (o) { return o.id === r.option; }) && r.option === c.correct;
      } else if (activity.type === 'classification') {
        pass = !!r.labels && c.items.every(function (item) { return own(r.labels, item.id) && r.labels[item.id] === item.label; });
      } else if (activity.type === 'order') {
        pass = Array.isArray(r.order) && stable(r.order) === stable(c.correct);
      } else if (activity.type === 'experiment') {
        if (!Array.isArray(r.runs) || r.runs.length < c.minimum_runs || r.runs.length > 12) return {passed: false, message: 'Run the declared experiment ' + c.minimum_runs + ' time(s) before interpreting it.'};
        r.runs.forEach(function (p) {
          Kernels.run(c.kernel_ref, p);
          Object.keys(c.parameters).forEach(function (key) {
            if (c.editable.indexOf(key) < 0 && stable(p[key]) !== stable(c.parameters[key])) throw new Error('A fixed parameter was changed: ' + key);
          });
        });
        if (c.vary && new Set(r.runs.map(function (p) { return stable(p[c.vary]); })).size < 2) return {passed: false, message: 'Change ' + c.vary + ' and run again. Compare the results before making a claim.'};
        pass = r.conclusion === c.correct;
      } else return {passed: false, message: 'This activity type is unsupported. Use its static reading view.'};
      return {passed: pass, message: pass ? activity.feedback.pass : activity.feedback.fail};
    } catch (error) { return {passed: false, message: 'The response could not be checked: ' + error.message}; }
  }
  function Catalog(bundle) {
    if (!bundle || bundle.schema_version !== 'qeva-learning-bundle/1') throw new Error('Unsupported learning bundle.');
    this.bundle = bundle; this.concepts = new Map(); this.activities = new Map(); this.aliases = new Map(); this.routes = bundle.routes || [];
    var self = this;
    (bundle.concepts || []).forEach(function (c) {
      var key = ref(c); if (self.concepts.has(key)) throw new Error('Duplicate concept revision ' + key);
      self.concepts.set(key, c); self.aliases.set(key, key);
      self.aliases.set(c.id.split(':').pop(), key); self.aliases.set(c.concept_ref, key);
    });
    (bundle.activities || []).forEach(function (a) {
      var key = ref(a); if (self.activities.has(key)) throw new Error('Duplicate activity revision ' + key);
      if (TYPES.indexOf(a.type) < 0) throw new Error('Unsupported activity type: ' + a.type);
      self.activities.set(key, a);
    });
    this.concepts.forEach(function (c, key) {
      c.prerequisites.forEach(function (p) {
        if (!self.concepts.has(p.ref)) throw new Error('Missing prerequisite: ' + p.ref);
        if (p.minimum_state !== 'understood' && p.minimum_state !== 'mastered') throw new Error('Invalid prerequisite threshold.');
      });
      c.activities.forEach(function (a) {
        if (!self.activities.has(a)) throw new Error('Missing activity: ' + a);
        if (self.activities.get(a).concept_ref !== key) throw new Error('Activity belongs to a different learning profile.');
      });
      ['understood', 'mastered'].forEach(function (level) {
        if (!c.mastery[level].length) throw new Error('Mastery requirements may not be empty.');
        c.mastery[level].forEach(function (a) { if (c.activities.indexOf(a) < 0) throw new Error('Mastery points outside the concept.'); });
      });
    });
    this.activities.forEach(function(a, key) {
      var owner = self.concepts.get(a.concept_ref);
      if (!owner || owner.activities.indexOf(key) < 0) throw new Error('Unowned activity: ' + key);
    });
    this.concepts.forEach(function (_, key) { self.path(key); }); // fail closed on cycles
    this.routes.forEach(function (route) { if (!self.concepts.has(route.goal_ref)) throw new Error('Unresolved route goal.'); });
  }
  Catalog.prototype.get = function (key) { return this.concepts.get(this.aliases.get(key) || key) || null; };
  Catalog.prototype.path = function (key) {
    var goal = this.get(key); if (!goal) throw new Error('This concept does not yet have a learning profile.');
    var self = this, done = new Set(), visiting = new Set(), result = [];
    function visit(r) {
      if (visiting.has(r)) throw new Error('Learning prerequisite cycle at ' + r);
      if (done.has(r)) return;
      var c = self.concepts.get(r); if (!c) throw new Error('Missing prerequisite: ' + r);
      visiting.add(r); c.prerequisites.forEach(function (p) { visit(p.ref); });
      visiting.delete(r); done.add(r); result.push(c);
    }
    visit(ref(goal)); return result;
  };
  Catalog.prototype.progress = function (learner) {
    var self = this, passed = new Set(), attempted = new Set(), discovered = new Set(learner.discoveries), states = new Map();
    learner.attempts.forEach(function (a) {
      var activity = self.activities.get(a.activity_ref); if (!activity) return;
      attempted.add(a.activity_ref);
      // Never trust imported outcome labels. Recheck against the exact activity revision.
      if (assess(activity, a.response).passed) passed.add(a.activity_ref);
    });
    function state(key) {
      if (states.has(key)) return states.get(key);
      var c = self.concepts.get(key); if (!c) return 'unmapped';
      var ready = c.prerequisites.every(function (p) { return STATES.indexOf(state(p.ref)) >= STATES.indexOf(p.minimum_state); });
      var value;
      if (!ready) value = 'locked';
      else if (c.mastery.understood.every(function (a) { return passed.has(a); })) {
        value = c.mastery.mastered.every(function (a) { return passed.has(a); }) ? 'mastered' : 'understood';
      } else if (c.activities.some(function (a) { return attempted.has(a); })) value = 'learning';
      else value = discovered.has(key) ? 'discovered' : 'available';
      states.set(key, value); return value;
    }
    this.concepts.forEach(function (_, k) { state(k); });
    return {states: states, passed: passed, attempted: attempted};
  };
  Catalog.prototype.plan = function (goal, learner) {
    var path = this.path(goal), progress = this.progress(learner);
    var required = new Map(); path.forEach(function (c) {
      if (!required.has(ref(c))) required.set(ref(c), 'understood');
      c.prerequisites.forEach(function (p) {
        if (STATES.indexOf(p.minimum_state) > STATES.indexOf(required.get(p.ref) || 'locked')) required.set(p.ref, p.minimum_state);
      });
    });
    var missing = path.filter(function (c) { return STATES.indexOf(progress.states.get(ref(c))) < STATES.indexOf(required.get(ref(c))); });
    return {path: path, missing: missing, next: missing[0] || null, progress: progress};
  };
  function blank() { return {schema_version: 'qeva-learner/1', discoveries: [], attempts: [], preferences: {mode: 'guided', goal: 'chaos'}}; }
  function validateLearner(v) {
    safeData(v);
    if (!v || v.schema_version !== 'qeva-learner/1') throw new Error('Unsupported learner format. Keep the original file; no migration has been assumed.');
    if (Object.keys(v).sort().join('|') !== ['attempts', 'discoveries', 'preferences', 'schema_version'].join('|')) throw new Error('Unexpected learner fields.');
    if (!Array.isArray(v.discoveries) || v.discoveries.length > 10000 || !v.discoveries.every(function (s) { return typeof s === 'string' && /^qeva:learning:[a-z0-9-]+@[1-9][0-9]*$/.test(s); })) throw new Error('Invalid discovery references.');
    if (!Array.isArray(v.attempts) || v.attempts.length > 2000) throw new Error('A local notebook supports at most 2,000 attempts. Export before starting another notebook.');
    if (new Set(v.discoveries).size !== v.discoveries.length) throw new Error('Duplicate discovery reference.');
    var seen = new Set();
    v.attempts.forEach(function (a) {
      if (!a || Object.keys(a).sort().join('|') !== 'activity_ref|at|id|response' || typeof a.id !== 'string' || !/^[a-zA-Z0-9._-]{1,100}$/.test(a.id) || seen.has(a.id) || typeof a.activity_ref !== 'string' || !/^qeva:activity:[a-z0-9-]+@[1-9][0-9]*$/.test(a.activity_ref) || typeof a.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(a.at) || !Number.isFinite(Date.parse(a.at)) || !a.response || typeof a.response !== 'object' || Array.isArray(a.response) || JSON.stringify(a.response).length > 32000) throw new Error('Invalid or duplicate attempt record.');
      seen.add(a.id);
    });
    if (!v.preferences || Object.keys(v.preferences).sort().join('|') !== 'goal|mode' || ['guided', 'formal'].indexOf(v.preferences.mode) < 0 || typeof v.preferences.goal !== 'string' || !/^[a-z0-9-]{1,80}$/.test(v.preferences.goal)) throw new Error('Invalid preferences.');
    return clone(v);
  }
  function merge(a, b) {
    a = validateLearner(a); b = validateLearner(b);
    var events = new Map(); a.attempts.concat(b.attempts).forEach(function (e) {
      if (events.has(e.id) && stable(events.get(e.id)) !== stable(e)) throw new Error('Conflicting attempt ID; neither version was overwritten.');
      events.set(e.id, e);
    });
    return validateLearner({schema_version: 'qeva-learner/1', discoveries: Array.from(new Set(a.discoveries.concat(b.discoveries))).sort(), attempts: Array.from(events.values()).sort(function (x, y) { return x.at.localeCompare(y.at) || x.id.localeCompare(y.id); }), preferences: b.preferences});
  }
  return {states: STATES, types: TYPES, ref: ref, stable: stable, parse: parse, safeData: safeData, assess: assess, Catalog: Catalog, blank: blank, validateLearner: validateLearner, merge: merge};
}));
