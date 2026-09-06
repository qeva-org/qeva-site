/* QEVA local records. No accounts, network access, or trusted-code imports. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QEVA_RECORDS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_DEPTH = 64;
  const KEY = 'qeva.local-workspace.v1';
  const bytes = text => new TextEncoder().encode(text).length;
  const clone = value => JSON.parse(JSON.stringify(value));
  function parse(text) {
    text = String(text);
    if (bytes(text) > MAX_BYTES) throw new Error('The record exceeds the 2 MB limit.');
    let i = 0;
    const fail = message => { throw new Error(`Invalid JSON at character ${i}: ${message}`); };
    const space = () => { while (/[\t\n\r ]/.test(text[i] || '\u0000')) i += 1; };
    function string() {
      if (text[i] !== '"') fail('expected string');
      const start = i++;
      let escaped = false;
      while (i < text.length) {
        const char = text[i++];
        if (!escaped && char === '"') return JSON.parse(text.slice(start, i));
        if (!escaped && char === '\\') escaped = true; else escaped = false;
      }
      fail('unterminated string');
    }
    function value(depth) {
      if (depth > MAX_DEPTH) fail('nesting exceeds 64 levels');
      space();
      if (text[i] === '"') return string();
      if (text[i] === '[' || text[i] === '{') {
        const object = text[i++] === '{', end = object ? '}' : ']';
        const out = object ? Object.create(null) : [], keys = new Set();
        space();
        if (text[i] === end) { i += 1; return out; }
        while (true) {
          space();
          if (object) {
            const key = string();
            if (keys.has(key)) fail(`duplicate name ${key}`);
            keys.add(key); space();
            if (text[i++] !== ':') fail('expected colon');
            out[key] = value(depth + 1);
          } else out.push(value(depth + 1));
          space();
          if (text[i] === end) { i += 1; return out; }
          if (text[i++] !== ',') fail('expected comma');
        }
      }
      for (const [word, result] of [['true', true], ['false', false], ['null', null]]) {
        if (text.startsWith(word, i)) { i += word.length; return result; }
      }
      const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(i));
      if (!match) fail('expected value');
      i += match[0].length;
      const number = Number(match[0]);
      if (!Number.isFinite(number)) fail('number is not finite');
      return number;
    }
    const result = value(0); space();
    if (i !== text.length) fail('trailing content');
    return result;
  }
  function requireValidExperiment(engine, experiment, expectedHash) {
    const errors = engine.validateExperiment(experiment);
    if (errors.length) throw new Error(errors.slice(0, 3).join(' '));
    if (experiment.executable.artifact_sha256 !== expectedHash) throw new Error('The record requires a different engine artifact.');
    engine.canonical(experiment);
  }
  function replayAnalysis(engine, record, expectedHash) {
    const e = record.experiment, opts = record.analysis_options;
    if (!opts || typeof opts !== 'object' || Array.isArray(opts)) throw new Error('Missing analysis options.');
    switch (record.mode) {
      case 'run': return null;
      case 'observer': return engine.observerSwitch(record.run, opts.left, opts.right);
      case 'sweep': return engine.parameterSweep(e, opts.parameter, opts.minimum, opts.maximum, opts.samples, opts.overrides);
      case 'attack': return engine.attack(e, opts);
      case 'diff': {
        requireValidExperiment(engine, opts.base_experiment, expectedHash);
        const baseRun = engine.runExperiment(opts.base_experiment, engine.parameterDefaults(opts.base_experiment));
        return engine.compareRuns(opts.base_experiment, baseRun, e, record.run);
      }
      default: throw new Error('Unknown analysis mode.');
    }
  }
  function decode(source, engine, expectedHash) {
    const value = typeof source === 'string' ? parse(source) : parse(JSON.stringify(source));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object.');
    if (!Object.prototype.hasOwnProperty.call(value, 'local_export_version')) {
      requireValidExperiment(engine, value, expectedHash);
      return {experiment: value, session: null, analysis_verified: false};
    }
    if (!['0.1', '0.2'].includes(value.local_export_version)) throw new Error('Unsupported local record version.');
    if (!['run', 'diff', 'observer', 'sweep', 'attack'].includes(value.mode)) throw new Error('Unknown analysis mode.');
    const allowed = ['local_export_version', 'mode', 'experiment', 'run', 'analysis', 'analysis_options'];
    if (Object.keys(value).some(k => !allowed.includes(k))) throw new Error('Unexpected field in local record.');
    requireValidExperiment(engine, value.experiment, expectedHash);
    const errors = engine.validateRunAgainstExperiment(value.experiment, value.run);
    if (errors.length) throw new Error('Run replay failed: ' + errors.slice(0, 3).join(' '));
    let verified = false;
    if (value.local_export_version === '0.2') {
      const result = replayAnalysis(engine, value, expectedHash);
      if (engine.canonical(result) !== engine.canonical(value.analysis)) throw new Error('Attached analysis does not match replay.');
      verified = true;
    } else if (value.mode === 'run') {
      if (value.analysis !== null) throw new Error('Unexpected analysis attached to a single run.');
      verified = true;
    }
    return {experiment: value.experiment, session: value, analysis_verified: verified};
  }
  function outcome(mode, run, analysis) {
    if (mode === 'sweep') {
      const partial = analysis.rows.some(row => !row.complete);
      if (analysis.stopped_reason !== 'requested-complete' || partial) {
        return `bounded sweep · ${analysis.rows.length}/${analysis.requested_samples} samples · ${analysis.stopped_reason}${partial ? ' · partial runs' : ''}`;
      }
      return `sampled ${analysis.rows.length} values`;
    }
    if (mode === 'attack') {
      if (analysis.observation.status === 'counterexample') return 'counterexample to stated claim';
      return `bounded search · ${analysis.observation.result.stopped_reason || 'scope complete'}`;
    }
    return run.result.complete ? 'complete' : `bounded stop · ${run.result.stopped_reason || 'resource-bound'}`;
  }
  function createStore(storage, engine, expectedHash) {
    if (!storage || typeof storage.getItem !== 'function') throw new Error('Browser storage is unavailable. Export a JSON file instead.');
    function read() {
      let raw;
      try { raw = storage.getItem(KEY); } catch (_) { throw new Error('Browser storage is blocked. Export a JSON file instead.'); }
      if (!raw) return [];
      let data;
      try { data = parse(raw); } catch (_) { throw new Error('The saved workspace cannot be read. Existing data was not overwritten.'); }
      if (!data || data.workspace_version !== '1' || !Array.isArray(data.entries) || data.entries.length > 30) throw new Error('Invalid saved workspace. Existing data was not overwritten.');
      const ids = new Set();
      for (const item of data.entries) {
        if (!item || typeof item.id !== 'string' || !/^[a-f0-9]{64}$/.test(item.id) || ids.has(item.id) || typeof item.label !== 'string' || item.label.length > 160 || typeof item.notes !== 'string' || item.notes.length > 4000 || typeof item.saved_at !== 'string' || !Number.isFinite(Date.parse(item.saved_at))) throw new Error('Invalid workspace entry. Existing data was not overwritten.');
        ids.add(item.id);
      }
      return data.entries;
    }
    function write(entries) {
      const raw = JSON.stringify({workspace_version: '1', entries});
      if (bytes(raw) > 1800000) throw new Error('Local workspace limit reached. Export or remove an entry first.');
      try { storage.setItem(KEY, raw); } catch (_) { throw new Error('Local storage is full or blocked. Export a JSON file instead.'); }
    }
    return {
      list: () => read().map(({id, label, notes, saved_at}) => ({id, label, notes, saved_at})),
      save(record, label, notes) {
        decode(record, engine, expectedHash);
        label = String(label || '').trim().slice(0, 160);
        notes = String(notes || '');
        if (!label) throw new Error('Enter a name for the saved experiment.');
        if (notes.length > 4000) throw new Error('Notes must be 4,000 characters or fewer.');
        const entries = read(), id = engine.digest({record, label, notes});
        if (!entries.some(e => e.id === id)) {
          if (entries.length >= 30) throw new Error('This browser workspace holds at most 30 entries. Export or remove an entry first.');
          entries.push({id, label, notes, saved_at: new Date().toISOString(), record: clone(record)});
          write(entries);
        }
        return id;
      },
      load(id) {
        const item = read().find(e => e.id === id);
        if (!item) throw new Error('Saved entry not found.');
        if (engine.digest({record: item.record, label: item.label, notes: item.notes}) !== id) throw new Error('Saved entry digest mismatch.');
        decode(item.record, engine, expectedHash);
        return clone(item);
      },
      remove(id) { const entries = read(); if (!entries.some(e => e.id === id)) throw new Error('Saved entry not found.'); write(entries.filter(e => e.id !== id)); },
      exportAll() { return {workspace_version: '1', entries: read().map(e => this.load(e.id))}; }
    };
  }
  return Object.freeze({parse, decode, replayAnalysis, outcome, createStore, MAX_BYTES, MAX_DEPTH});
});
