(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QEVA_ENGINE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '0.1.0';
  const MAX_SWEEP_SAMPLES = 64;
  const MAX_ATTACK_CASES = 4096;
  const MAX_DIFF_CHANGES = 512;
  const MAX_CANONICAL_DEPTH = 256;
  const HARD_LIMITS = Object.freeze({steps: 10000, states: 10000, operations: 100000, timeout_ms: 2000});
  const ANALYZERS = new Set([
    'qeva-analyzer:1:fixed-point@1', 'qeva-analyzer:1:cycle-detector@1',
    'qeva-analyzer:1:perturbation-growth@1', 'qeva-analyzer:1:functional-graph@1',
    'qeva-analyzer:1:candidate-invariant@1', 'qeva-analyzer:1:summary@1',
    'qeva-analyzer:1:conjecture-attack@1'
  ]);
  const ANALYZER_DIGESTS = Object.freeze({
    'qeva-analyzer:1:fixed-point@1': 'fcaddac846bed8c254734fea32d07f16f18faac3dc9933c2fa0c49c9355fec0d',
    'qeva-analyzer:1:cycle-detector@1': '1cbf4560197d8839b443d89733d51f762bfffc403cc23ce31336b2a36fa5c46b',
    'qeva-analyzer:1:perturbation-growth@1': 'ab28e0285d1abd07c83891a1fddd02c38f868ab95d6e34703fb3e10ee896271b',
    'qeva-analyzer:1:functional-graph@1': '742c62cdf32da914e398bd45c04a23e1dbd23615302d7bfc72ec23c8f69d4be0',
    'qeva-analyzer:1:candidate-invariant@1': 'f7f27918306dcb620f948187a0fb2cbfef509a3609f1a2bca1329304f0bd8268',
    'qeva-analyzer:1:summary@1': 'c66af9c51ec305ed58b38c65df769a96214281039472a3c55a6b2689ea6b7e29',
    'qeva-analyzer:1:conjecture-attack@1': '128401b4bf9630ce6e5366fc2127d76143788875b352812abf7befc961f60b8c'
  });
  const KERNEL_SEMANTICS = {
    'modular-projection': 'integer-v0.1',
    'logistic-map': 'ecmascript-binary64-v0.1',
    'coarse-signal': 'ecmascript-binary64-host-transcendentals-v0.1+lcg32-v1',
    'local-global-search': 'ecmascript-binary64-host-transcendentals-v0.1+lcg32-v1',
    collatz: 'integer-bigint-v0.1',
    'finite-map': 'finite-enumeration-v0.1'
  };
  const KERNEL_CONTRACTS = {
    'modular-projection': {family: 'projection', randomness: 'none', seed: null, minimum: {states: 1, operations: 1}, parameters: {modulus: 'integer', count: 'integer'}},
    'logistic-map': {family: 'recurrence', randomness: 'none', seed: null, minimum: {states: 4, operations: 2}, parameters: {r: 'number', x0: 'number', delta: 'number', steps: 'integer'}},
    'coarse-signal': {family: 'signal', randomness: 'lcg32-numerical-recipes', seed: 'seed', minimum: {states: 3, operations: 5}, parameters: {block_size: 'integer', noise: 'number', count: 'integer', seed: 'integer'}},
    'local-global-search': {family: 'optimization', randomness: 'lcg32-numerical-recipes', seed: 'seed', minimum: {states: 203, operations: 207}, parameters: {start: 'number', exploration: 'number', seed: 'integer', steps: 'integer'}},
    collatz: {family: 'integer-map', randomness: 'none', seed: null, minimum: {states: 2, operations: 1}, parameters: {start: 'integer', steps: 'integer'}},
    'finite-map': {family: 'finite-state', randomness: 'none', seed: null, minimum: {states: 3, operations: 3}, parameters: {start: 'integer', table: 'integer-list', steps: 'integer'}}
  };
  const EXPERIMENT_FIELDS = Object.freeze([
    'experiment_version', 'id', 'revision', 'title', 'summary', 'family', 'state_space',
    'entities', 'relations', 'operations', 'update', 'parameters', 'initial_conditions',
    'boundary_conditions', 'observer', 'randomness', 'run_bounds', 'analyzers', 'outputs',
    'executable', 'related_objects', 'provenance', 'stewardship', 'supersedes'
  ]);
  const ANALYZER_FAMILIES = Object.freeze({
    'qeva-analyzer:1:fixed-point@1': ['recurrence', 'finite-state'],
    'qeva-analyzer:1:cycle-detector@1': ['recurrence', 'integer-map', 'finite-state'],
    'qeva-analyzer:1:perturbation-growth@1': ['recurrence'],
    'qeva-analyzer:1:functional-graph@1': ['finite-state'],
    'qeva-analyzer:1:candidate-invariant@1': ['projection', 'integer-map', 'signal', 'finite-state'],
    'qeva-analyzer:1:summary@1': ['projection', 'recurrence', 'signal', 'optimization', 'integer-map', 'finite-state'],
    'qeva-analyzer:1:conjecture-attack@1': ['projection', 'recurrence', 'signal', 'optimization', 'integer-map', 'finite-state']
  });
  const RUN_OBSERVATION_CONTRACTS = Object.freeze({
    'qeva-analyzer:1:summary@1': [
      {kind: 'run-summary', evidence: ['exact-execution', 'numerical-observation'], status: ['observed'], proof: ['not-proof']}
    ],
    'qeva-analyzer:1:fixed-point@1': [
      {kind: 'fixed-point', evidence: ['bounded-exhaustive'], status: ['observed'], proof: ['bounded-proof']},
      {kind: 'candidate-fixed-point', evidence: ['numerical-observation'], status: ['candidate'], proof: ['not-proof']}
    ],
    'qeva-analyzer:1:cycle-detector@1': [
      {kind: 'cycle', evidence: ['exact-execution'], status: ['observed', 'none-found'], proof: ['not-proof']},
      {kind: 'candidate-period', evidence: ['numerical-observation'], status: ['candidate', 'none-found'], proof: ['not-proof']}
    ],
    'qeva-analyzer:1:perturbation-growth@1': [
      {kind: 'finite-growth-summary', evidence: ['numerical-observation'], status: ['observed'], proof: ['not-proof']}
    ],
    'qeva-analyzer:1:functional-graph@1': [
      {kind: 'functional-graph', evidence: ['bounded-exhaustive'], status: ['observed'], proof: ['bounded-proof']}
    ],
    'qeva-analyzer:1:candidate-invariant@1': [
      {kind: 'candidate-invariant', evidence: ['bounded-exhaustive'], status: ['observed'], proof: ['not-proof']},
      {kind: 'candidate-invariant', evidence: ['exact-execution', 'numerical-observation'], status: ['candidate'], proof: ['not-proof']}
    ]
  });
  const encoder = typeof TextEncoder === 'function' ? new TextEncoder() : null;

  function clone(value) {
    return JSON.parse(canonical(value));
  }

  function validateUnicode(value) {
    for (let index = 0; index < value.length; index += 1) {
      const unit = value.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error('Lone Unicode surrogates are forbidden');
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) throw new Error('Lone Unicode surrogates are forbidden');
    }
  }

  function canonicalValue(value, ancestors, depth) {
    if (depth > MAX_CANONICAL_DEPTH) throw new Error(`Canonical JSON exceeds maximum depth ${MAX_CANONICAL_DEPTH}`);
    if (value === null) return 'null';
    if (value === true) return 'true';
    if (value === false) return 'false';
    if (typeof value === 'string') { validateUnicode(value); return JSON.stringify(value); }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new Error('Non-finite numbers are forbidden');
      if (Number.isInteger(value) && !Number.isSafeInteger(value)) throw new Error('Integers outside the I-JSON safe range are forbidden');
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) throw new Error('Only ordinary arrays are allowed in canonical JSON');
      if (ancestors.has(value)) throw new Error('Cyclic values are forbidden in canonical JSON');
      if (Object.getOwnPropertySymbols(value).length) throw new Error('Symbol properties are forbidden in canonical JSON arrays');
      const keys = Object.keys(value);
      if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) throw new Error('Sparse arrays and named array properties are forbidden in canonical JSON');
      const ownNames = Object.getOwnPropertyNames(value).filter(key => key !== 'length');
      if (ownNames.length !== keys.length || ownNames.some(key => !Object.prototype.propertyIsEnumerable.call(value, key))) throw new Error('Non-enumerable array properties are forbidden in canonical JSON');
      ancestors.add(value);
      try {
        const items = [];
        for (let index = 0; index < value.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
          if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new Error('Accessor array elements are forbidden in canonical JSON');
          items.push(canonicalValue(descriptor.value, ancestors, depth + 1));
        }
        return `[${items.join(',')}]`;
      } finally { ancestors.delete(value); }
    }
    if (value && typeof value === 'object') {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) throw new Error('Only plain objects are allowed in canonical JSON');
      if (ancestors.has(value)) throw new Error('Cyclic values are forbidden in canonical JSON');
      if (Object.getOwnPropertySymbols(value).length) throw new Error('Symbol properties are forbidden in canonical JSON');
      const keys = Object.keys(value).sort();
      const ownNames = Object.getOwnPropertyNames(value);
      if (ownNames.length !== keys.length || ownNames.some(key => !Object.prototype.propertyIsEnumerable.call(value, key))) throw new Error('Non-enumerable object properties are forbidden in canonical JSON');
      ancestors.add(value);
      try {
        return `{${keys.map(key => {
          validateUnicode(key);
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new Error('Accessor properties are forbidden in canonical JSON');
          return `${JSON.stringify(key)}:${canonicalValue(descriptor.value, ancestors, depth + 1)}`;
        }).join(',')}}`;
      } finally { ancestors.delete(value); }
    }
    throw new Error(`Unsupported canonical JSON value: ${typeof value}`);
  }

  function canonical(value) {
    return canonicalValue(value, new Set(), 0) + '\n';
  }

  function utf8(text) {
    if (encoder) return encoder.encode(text);
    const escaped = unescape(encodeURIComponent(text));
    return Uint8Array.from(escaped, char => char.charCodeAt(0));
  }

  function sha256(text) {
    const bytes = utf8(text);
    const words = [];
    const bitLength = bytes.length * 8;
    for (let i = 0; i < bytes.length; i += 1) words[i >> 2] = (words[i >> 2] || 0) | (bytes[i] << (24 - (i % 4) * 8));
    words[bytes.length >> 2] = (words[bytes.length >> 2] || 0) | (0x80 << (24 - (bytes.length % 4) * 8));
    const finalLength = (((bytes.length + 9 + 63) >> 6) << 4);
    while (words.length < finalLength) words.push(0);
    words[finalLength - 2] = Math.floor(bitLength / 0x100000000);
    words[finalLength - 1] = bitLength >>> 0;
    const k = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let offset = 0; offset < words.length; offset += 16) {
      const w = new Array(64);
      for (let i = 0; i < 16; i += 1) w[i] = words[offset + i] | 0;
      for (let i = 16; i < 64; i += 1) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a,b,c,d,e,f,g,hh] = h;
      for (let i = 0; i < 64; i += 1) {
        const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + s1 + ch + k[i] + w[i]) | 0;
        const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (s0 + maj) | 0;
        hh=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
      }
      h[0]=(h[0]+a)|0; h[1]=(h[1]+b)|0; h[2]=(h[2]+c)|0; h[3]=(h[3]+d)|0;
      h[4]=(h[4]+e)|0; h[5]=(h[5]+f)|0; h[6]=(h[6]+g)|0; h[7]=(h[7]+hh)|0;
    }
    return h.map(value => (value >>> 0).toString(16).padStart(8, '0')).join('');
  }

  function digest(value) {
    return sha256(canonical(value));
  }

  function compareText(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
  }

  function exactRef(experiment) {
    return `${experiment.id}@${experiment.revision}`;
  }

  function parameterDefaults(experiment) {
    const out = {};
    // Never expose a mutable reference owned by the experiment record.  Forked
    // finite-map defaults are arrays, and callers are allowed to edit the
    // returned parameter object without changing the experiment identity.
    experiment.parameters.forEach(parameter => { out[parameter.id] = clone(parameter.default); });
    return out;
  }

  function parseTable(value) {
    let table;
    if (Array.isArray(value)) {
      if (value.length > HARD_LIMITS.states - 1) throw new Error(`The transition table cannot exceed ${HARD_LIMITS.states - 1} states.`);
      canonical(value);
      if (value.some(item => !Number.isSafeInteger(item))) throw new Error('Array transition tables must contain only safe integers.');
      table = value.slice();
    }
    else if (typeof value === 'string') {
      if (value.length > HARD_LIMITS.states * 16) throw new Error('The transition table text exceeds the bounded parser limit.');
      const parts = value.split(',');
      if (parts.length > HARD_LIMITS.states - 1) throw new Error(`The transition table cannot exceed ${HARD_LIMITS.states - 1} states.`);
      if (!value.trim() || parts.some(part => !part.trim())) throw new Error('The transition table cannot contain blank entries.');
      if (parts.some(part => !/^(?:0|[1-9][0-9]*)$/.test(part.trim()))) throw new Error('Text transition tables must use canonical non-negative decimal integers.');
      table = parts.map(part => Number(part.trim()));
    } else throw new Error('The transition table must be an integer array or comma-separated string.');
    if (!table.length || table.some(item => !Number.isInteger(item) || item < 0 || item >= table.length)) {
      throw new Error('The transition table must contain N integers, each between 0 and N−1.');
    }
    return table;
  }

  function normalizeParameters(experiment, overrides) {
    const submitted = overrides === undefined ? {} : overrides;
    if (!isPlainObject(submitted)) throw new Error('Parameter overrides must be a plain object.');
    canonical(submitted);
    const allowed = new Set(experiment.parameters.map(parameter => parameter.id));
    const unknown = Object.keys(submitted).filter(key => !allowed.has(key));
    if (unknown.length) throw new Error(`Unknown parameter override: ${unknown.join(', ')}.`);
    const values = {...parameterDefaults(experiment), ...submitted};
    experiment.parameters.forEach(parameter => {
      let value = values[parameter.id];
      if (parameter.type === 'integer') {
        if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(`${parameter.label} must be a safe integer.`);
      }
      else if (parameter.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error(`${parameter.label} must be a finite number.`);
      else if (parameter.type === 'integer-list') value = parseTable(value);
      if (parameter.type === 'integer' || parameter.type === 'number') {
        if (!Number.isFinite(value)) throw new Error(`${parameter.label} must be finite.`);
        if (value < parameter.min || value > parameter.max) throw new Error(`${parameter.label} must be between ${parameter.min} and ${parameter.max}.`);
      }
      values[parameter.id] = value;
    });
    if (experiment.executable && experiment.executable.kernel === 'finite-map') {
      if (values.start >= values.table.length) throw new Error(`Starting state must be between 0 and ${values.table.length - 1} for the effective transition table.`);
    }
    return values;
  }

  function isPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function exactKeys(value, expected) {
    if (!isPlainObject(value)) return false;
    const actual = Object.keys(value).sort();
    const wanted = expected.slice().sort();
    return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
  }

  function validDateStamp(value) {
    if (typeof value !== 'string') return false;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
  }

  function validateObserverArtifact(observer) {
    const errors = [];
    if (!exactKeys(observer, ['id', 'version', 'kind', 'description', 'parameters'])) return ['Observer must contain exactly id, version, kind, description, and parameters.'];
    if (typeof observer.id !== 'string' || !observer.id.trim()) errors.push('Observer id must be a non-empty string.');
    if (typeof observer.version !== 'string' || !observer.version.trim()) errors.push('Observer version must be a non-empty string.');
    if (!['identity', 'remainder', 'threshold', 'bins', 'block-mean', 'parity', 'objective'].includes(observer.kind)) errors.push('Observer kind is unsupported.');
    if (typeof observer.description !== 'string' || !observer.description.trim()) errors.push('Observer description must be a non-empty string.');
    if (!isPlainObject(observer.parameters)) errors.push('Observer parameters must be a plain object.');
    return errors;
  }

  function validateExperiment(experiment) {
    const errors = [];
    if (!experiment || typeof experiment !== 'object') return ['Experiment must be an object.'];
    const keys = Object.keys(experiment);
    EXPERIMENT_FIELDS.forEach(field => { if (!Object.prototype.hasOwnProperty.call(experiment, field)) errors.push(`Missing required field ${field}.`); });
    keys.filter(field => !EXPERIMENT_FIELDS.includes(field)).forEach(field => errors.push(`Unknown top-level field ${field}.`));
    try { canonical(experiment); } catch (error) { errors.push(`Experiment is not canonicalizable: ${error.message}`); return errors; }
    if (experiment.experiment_version !== '0.1') errors.push('Unsupported experiment_version.');
    if (typeof experiment.id !== 'string' || !/^qeva-experiment:1:[a-z0-9][a-z0-9._-]*$/.test(experiment.id)) errors.push('Invalid experiment id.');
    if (!Number.isInteger(experiment.revision) || experiment.revision < 1) errors.push('Invalid revision.');
    const executable = experiment.executable || {};
    if (executable.engine !== 'QEVA Mechanism Engine' || executable.engine_version !== VERSION) errors.push('Unsupported engine version.');
    const contract = Object.prototype.hasOwnProperty.call(KERNEL_CONTRACTS, executable.kernel) ? KERNEL_CONTRACTS[executable.kernel] : null;
    if (!Object.prototype.hasOwnProperty.call(KERNELS, executable.kernel) || !contract) errors.push('Unknown bounded kernel.');
    if (executable.kernel_version !== '1') errors.push('Unsupported kernel version.');
    if (typeof executable.artifact_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(executable.artifact_sha256)) errors.push('Engine artifact SHA-256 is missing or invalid.');
    if (executable.representation !== 'bounded-declarative-json') errors.push('Executable representation must be bounded-declarative-json.');
    if (!Object.prototype.hasOwnProperty.call(KERNEL_SEMANTICS, executable.kernel) || KERNEL_SEMANTICS[executable.kernel] !== executable.numeric_semantics) errors.push('Numeric semantics do not match the selected kernel.');
    if (contract && experiment.family !== contract.family) errors.push('Family does not match the selected kernel.');
    if (!['projection', 'recurrence', 'signal', 'optimization', 'integer-map', 'finite-state'].includes(experiment.family)) errors.push('Unsupported experiment family.');
    if (typeof experiment.title !== 'string' || !experiment.title.trim() || typeof experiment.summary !== 'string' || !experiment.summary.trim()) errors.push('Title and summary must be non-empty strings.');
    ['entities', 'relations', 'operations', 'boundary_conditions', 'analyzers', 'outputs', 'related_objects'].forEach(field => {
      if (!Array.isArray(experiment[field])) errors.push(`${field} must be an array.`);
    });
    ['state_space', 'update', 'initial_conditions', 'observer', 'randomness', 'run_bounds', 'executable', 'provenance', 'stewardship'].forEach(field => {
      if (!isPlainObject(experiment[field])) errors.push(`${field} must be a plain object.`);
    });
    if (!Array.isArray(experiment.entities) || !experiment.entities.length || experiment.entities.some(item => !isPlainObject(item))) errors.push('entities must contain at least one object.');
    if (!Array.isArray(experiment.relations) || experiment.relations.some(item => !isPlainObject(item))) errors.push('relations must contain only objects.');
    if (!Array.isArray(experiment.operations) || !experiment.operations.length || experiment.operations.some(item => !isPlainObject(item))) errors.push('operations must contain at least one object.');
    if (!Array.isArray(experiment.outputs) || !experiment.outputs.length || experiment.outputs.some(item => !isPlainObject(item))) errors.push('outputs must contain at least one object.');
    if (!Array.isArray(experiment.boundary_conditions) || experiment.boundary_conditions.some(item => typeof item !== 'string')) errors.push('boundary_conditions must contain only strings.');
    const stateSpace = experiment.state_space;
    if (!exactKeys(stateSpace, ['kind', 'description', 'numeric_domain', 'bounds'])) errors.push('state_space has missing or unknown fields.');
    else {
      if (typeof stateSpace.kind !== 'string' || !stateSpace.kind.trim() || typeof stateSpace.description !== 'string' || !stateSpace.description.trim()) errors.push('state_space kind and description must be non-empty strings.');
      if (!['integer', 'safe-integer', 'binary64', 'finite-enumeration'].includes(stateSpace.numeric_domain)) errors.push('state_space numeric_domain is unsupported.');
      if (!Array.isArray(stateSpace.bounds)) errors.push('state_space bounds must be an array.');
    }
    if (!Array.isArray(experiment.parameters)) errors.push('Parameters must be an array.');
    else {
      const ids = new Set();
      experiment.parameters.forEach(parameter => {
        if (!parameter || typeof parameter.id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(parameter.id) || ids.has(parameter.id)) errors.push('Parameter identifiers must be unique and valid.');
        ids.add(parameter && parameter.id);
        if (!['integer', 'number', 'integer-list'].includes(parameter && parameter.type)) errors.push(`Unsupported parameter type for ${parameter && parameter.id}.`);
        if (parameter && ['integer', 'number'].includes(parameter.type)) {
          const numericDefault = parameter.default;
          if (!Number.isFinite(parameter.min) || !Number.isFinite(parameter.max) || parameter.min > parameter.max || !Number.isFinite(numericDefault) || numericDefault < parameter.min || numericDefault > parameter.max || !Number.isFinite(parameter.step) || parameter.step <= 0) errors.push(`Invalid numeric bounds for ${parameter.id}.`);
          if (parameter.type === 'integer' && ![parameter.min, parameter.max, parameter.step, numericDefault].every(Number.isSafeInteger)) errors.push(`Integer parameter ${parameter.id} must use safe integers.`);
        }
        if (parameter && parameter.type === 'integer-list') {
          try { parseTable(parameter.default); } catch (error) { errors.push(`Invalid integer-list default for ${parameter.id}.`); }
        }
      });
      if (contract) {
        const declared = [...ids].filter(Boolean).sort();
        const required = Object.keys(contract.parameters).sort();
        if (canonical(declared) !== canonical(required)) errors.push('Parameter set does not match the selected kernel contract.');
        experiment.parameters.forEach(parameter => {
          if (parameter && contract.parameters[parameter.id] && contract.parameters[parameter.id] !== parameter.type) errors.push(`Parameter type for ${parameter.id} does not match the kernel contract.`);
        });
        const byId = Object.fromEntries(experiment.parameters.filter(parameter => parameter && parameter.id).map(parameter => [parameter.id, parameter]));
        const within = (id, minimum, maximum = Infinity) => {
          const parameter = byId[id];
          if (parameter && (parameter.min < minimum || parameter.max > maximum)) errors.push(`Declared range for ${id} violates the kernel domain.`);
        };
        if (executable.kernel === 'modular-projection') { within('modulus', 2); within('count', 1); }
        if (executable.kernel === 'logistic-map') { within('r', 0, 4); within('x0', 0, 1); within('delta', 0, 1); within('steps', 1); }
        if (executable.kernel === 'coarse-signal') { within('block_size', 1); within('noise', 0, 1); within('count', 1); within('seed', 0, 4294967295); }
        if (executable.kernel === 'local-global-search') { within('start', 0, 1); within('exploration', 0, 1); within('seed', 0, 4294967295); within('steps', 1); }
        if (executable.kernel === 'collatz') { within('start', 1); within('steps', 1); }
        if (executable.kernel === 'finite-map') {
          within('start', 0); within('steps', 1);
          try {
            const table = parseTable(byId.table && byId.table.default);
            if (byId.start && byId.start.default >= table.length) errors.push('The default starting state exceeds the default transition table.');
          } catch (error) { /* The default-specific error was already recorded above. */ }
        }
      }
    }
    const bounds = experiment.run_bounds || {};
    if (!exactKeys(bounds, ['steps', 'max_states', 'max_operations', 'timeout_ms'])) errors.push('run_bounds has missing or unknown fields.');
    if (!Number.isInteger(bounds.steps) || bounds.steps < 1 || bounds.steps > HARD_LIMITS.steps ||
        !Number.isInteger(bounds.max_states) || bounds.max_states < 1 || bounds.max_states > HARD_LIMITS.states ||
        !Number.isInteger(bounds.max_operations) || bounds.max_operations < 1 || bounds.max_operations > HARD_LIMITS.operations ||
        !Number.isInteger(bounds.timeout_ms) || bounds.timeout_ms < 1 || bounds.timeout_ms > HARD_LIMITS.timeout_ms) errors.push('Invalid or unsafe run bounds.');
    if (contract && (bounds.max_states < contract.minimum.states || bounds.max_operations < contract.minimum.operations)) errors.push('Run bounds cannot satisfy the kernel minimum resource contract.');
    if (executable.kernel === 'finite-map' && Array.isArray(experiment.parameters)) {
      const tableParameter = experiment.parameters.find(parameter => parameter && parameter.id === 'table');
      const startParameter = experiment.parameters.find(parameter => parameter && parameter.id === 'start');
      try {
        const table = parseTable(tableParameter && tableParameter.default);
        if (table.length + 1 > bounds.max_states) errors.push('Default finite map exceeds max_states.');
        if (table.length * (table.length + 1) >= bounds.max_operations) errors.push('Default finite map cannot cover graph analysis and one transition within max_operations.');
        const operationCapacity = Math.floor((Math.sqrt(1 + 4 * (bounds.max_operations - 1)) - 1) / 2);
        const maximumTableLength = Math.min(bounds.max_states - 1, operationCapacity);
        if (startParameter && startParameter.max >= maximumTableLength) errors.push('Starting-state envelope exceeds the largest table allowed by run bounds.');
      } catch (error) { /* The parameter-default error is reported above. */ }
    }
    if (!Array.isArray(experiment.analyzers) || experiment.analyzers.some(item => !ANALYZERS.has(item))) errors.push('Unknown analyzer revision.');
    else if (new Set(experiment.analyzers).size !== experiment.analyzers.length) errors.push('Analyzer revisions must be unique.');
    else experiment.analyzers.forEach(item => {
      if (!ANALYZER_FAMILIES[item].includes(experiment.family)) errors.push(`Analyzer ${item} does not accept family ${experiment.family}.`);
    });
    const randomness = experiment.randomness || {};
    if (!exactKeys(randomness, ['algorithm', 'version', 'seed_parameter', 'deterministic'])) errors.push('randomness has missing or unknown fields.');
    if (!['none', 'lcg32-numerical-recipes'].includes(randomness.algorithm) || randomness.version !== '1' || randomness.deterministic !== true) errors.push('Unsupported randomness declaration.');
    if (contract && (randomness.algorithm !== contract.randomness || randomness.seed_parameter !== contract.seed)) errors.push('Randomness declaration does not match the selected kernel.');
    validateObserverArtifact(experiment.observer).forEach(error => errors.push(error));
    const provenance = experiment.provenance;
    if (!exactKeys(provenance, ['created', 'creator', 'license', 'parent', 'source_refs'])) errors.push('Provenance must contain exactly created, creator, license, parent, and source_refs.');
    else {
      if (!validDateStamp(provenance.created)) errors.push('Provenance created must be a real YYYY-MM-DD date.');
      if (typeof provenance.creator !== 'string' || !provenance.creator.trim() || typeof provenance.license !== 'string' || !provenance.license.trim()) errors.push('Provenance creator and license must be non-empty strings.');
      if (provenance.parent !== null && typeof provenance.parent !== 'string') errors.push('Provenance parent must be a string or null.');
      if (!Array.isArray(provenance.source_refs) || provenance.source_refs.some(value => typeof value !== 'string')) errors.push('Provenance source_refs must be an array of strings.');
    }
    const stewardship = experiment.stewardship;
    if (!exactKeys(stewardship, ['steward', 'visibility', 'publication_state'])) errors.push('Stewardship must contain exactly steward, visibility, and publication_state.');
    else {
      if (typeof stewardship.steward !== 'string' || !stewardship.steward.trim()) errors.push('Steward must be a non-empty string.');
      if (!['public', 'private', 'shared'].includes(stewardship.visibility)) errors.push('Unsupported stewardship visibility.');
      if (!['draft', 'public', 'superseded', 'withdrawn'].includes(stewardship.publication_state)) errors.push('Unsupported publication state.');
    }
    if (!exactKeys(executable, ['engine', 'engine_version', 'artifact_sha256', 'kernel', 'kernel_version', 'representation', 'numeric_semantics'])) errors.push('executable has missing or unknown fields.');
    if (!Array.isArray(experiment.related_objects) || experiment.related_objects.some(value => typeof value !== 'string' || !/^qeva:1:[a-z0-9][a-z0-9._-]*@[1-9][0-9]*$/.test(value)) || new Set(experiment.related_objects).size !== experiment.related_objects.length) errors.push('related_objects must contain unique exact object references.');
    if (experiment.supersedes !== null && (typeof experiment.supersedes !== 'string' || !/^qeva-experiment:1:[a-z0-9][a-z0-9._-]*@[1-9][0-9]*$/.test(experiment.supersedes))) errors.push('supersedes must be an exact experiment revision or null.');
    return errors;
  }

  function boundedStop(requested, limits) {
    if (limits.every(item => requested <= item.value)) return 'requested-complete';
    const minimum = Math.min(...limits.map(item => item.value));
    return `${limits.find(item => item.value === minimum).name}-bound`;
  }

  function lcg(seed) {
    let state = Number(seed) >>> 0;
    return function () {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function modularProjection(experiment, p) {
    const count = Math.min(p.count, experiment.run_bounds.max_states, experiment.run_bounds.max_operations);
    const assignments = [];
    for (let n = 0; n < count; n += 1) assignments.push({value: n, observed: n % p.modulus});
    return {
      complete: count === p.count,
      stopped_reason: boundedStop(p.count, [
        {name: 'state', value: experiment.run_bounds.max_states},
        {name: 'operation', value: experiment.run_bounds.max_operations}
      ]),
      primary: assignments.map(item => item.observed),
      secondary: [],
      transcript: assignments.map(item => `${item.value} ↦ ${item.observed}`),
      assignments,
      metrics: {sample_count: count, requested_samples: p.count, states_emitted: count, operations_used: count, class_count: new Set(assignments.map(item => item.observed)).size, modulus: p.modulus}
    };
  }

  function logisticMap(experiment, p) {
    const stateLimit = Math.max(0, Math.floor(experiment.run_bounds.max_states / 2) - 1);
    const operationLimit = Math.floor(experiment.run_bounds.max_operations / 2);
    const steps = Math.min(p.steps, experiment.run_bounds.steps, stateLimit, operationLimit);
    let x = p.x0;
    let y = Math.min(0.999999, p.x0 + p.delta);
    const primary = [], secondary = [], separation = [];
    let firstCrossing = null;
    for (let step = 0; step <= steps; step += 1) {
      primary.push(x); secondary.push(y); separation.push(Math.abs(x - y));
      if (firstCrossing === null && separation[step] > 0.1) firstCrossing = step;
      if (step === steps) break;
      x = p.r * x * (1 - x);
      y = p.r * y * (1 - y);
      if (![x,y].every(Number.isFinite)) throw new Error('The binary64 trajectory became non-finite.');
    }
    return {
      complete: steps === p.steps,
      stopped_reason: boundedStop(p.steps, [
        {name: 'step', value: experiment.run_bounds.steps},
        {name: 'state', value: stateLimit},
        {name: 'operation', value: operationLimit}
      ]),
      primary, secondary, separation,
      transcript: primary.map((value, index) => `n=${index}: x=${value.toPrecision(12)}, y=${secondary[index].toPrecision(12)}, |Δ|=${separation[index].toExponential(5)}`),
      metrics: {steps, requested_steps: p.steps, states_emitted: primary.length + secondary.length, operations_used: steps * 2, first_separation_above_0_1: firstCrossing, maximum_separation: Math.max(...separation), final_x: primary[primary.length - 1], final_y: secondary[secondary.length - 1]}
    };
  }

  function coarseSignal(experiment, p) {
    let count = Math.min(p.count, experiment.run_bounds.max_states, experiment.run_bounds.max_operations);
    const use = value => ({states: value * 2 + Math.ceil(value / p.block_size), operations: value * 4 + Math.ceil(value / p.block_size)});
    while (count > 0 && (use(count).states > experiment.run_bounds.max_states || use(count).operations > experiment.run_bounds.max_operations)) count -= 1;
    if (count < 1) throw new Error('Run bounds cannot emit one coarse-signal sample.');
    const random = lcg(p.seed);
    const fine = [];
    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0 : i / (count - 1);
      const noise = (random() * 2 - 1) * p.noise * 0.18;
      fine.push(Math.max(0, Math.min(1, 0.5 + 0.23 * Math.sin(4 * Math.PI * t) + 0.1 * Math.sin(1.3 * Math.PI * t) + noise)));
    }
    const macro = [], coarse = [];
    for (let start = 0; start < count; start += p.block_size) {
      const part = fine.slice(start, Math.min(count, start + p.block_size));
      const mean = part.reduce((sum, value) => sum + value, 0) / part.length;
      macro.push(mean);
      part.forEach(() => coarse.push(mean));
    }
    const mse = fine.reduce((sum, value, index) => sum + (value - coarse[index]) ** 2, 0) / count;
    return {
      complete: count === p.count,
      stopped_reason: count === p.count ? 'requested-complete' : (use(p.count).states > experiment.run_bounds.max_states ? 'state-bound' : 'operation-bound'),
      primary: fine, secondary: coarse, macro,
      transcript: macro.map((value, index) => `block ${index}: mean=${value.toPrecision(12)}`),
      metrics: {fine_samples: count, requested_samples: p.count, states_emitted: use(count).states, operations_used: use(count).operations, macro_states: macro.length, discarded_detail_mse: mse, block_size: p.block_size}
    };
  }

  function landscape(t) {
    return 0.11 + 0.31 * Math.exp(-(((t - 0.21) / 0.09) ** 2)) + 0.7 * Math.exp(-(((t - 0.73) / 0.115) ** 2)) + 0.06 * Math.sin(19 * t);
  }

  function localGlobalSearch(experiment, p) {
    const random = lcg(p.seed);
    const fixedCost = 202;
    const stateLimit = Math.max(0, experiment.run_bounds.max_states - fixedCost);
    const operationLimit = Math.max(0, Math.floor((experiment.run_bounds.max_operations - fixedCost) / 5));
    const steps = Math.min(p.steps, experiment.run_bounds.steps, stateLimit, operationLimit);
    let position = p.start;
    const track = [{position, value: landscape(position)}];
    for (let step = 0; step < steps; step += 1) {
      const epsilon = 0.006;
      const gradient = (landscape(Math.min(1, position + epsilon)) - landscape(Math.max(0, position - epsilon))) / (2 * epsilon);
      const amplitude = p.exploration * (1 - step / Math.max(steps, 1));
      const candidate = Math.max(0, Math.min(1, position + 0.012 * Math.sign(gradient) + (random() - 0.5) * 2 * amplitude));
      const candidateValue = landscape(candidate);
      const acceptanceDraw = random();
      if (candidateValue >= track[track.length - 1].value || acceptanceDraw < 0.07 + p.exploration * 0.8) position = candidate;
      track.push({position, value: position === candidate ? candidateValue : track[track.length - 1].value});
    }
    const curve = [];
    for (let i = 0; i <= 200; i += 1) curve.push({position: i / 200, value: landscape(i / 200)});
    const best = track.reduce((left, right) => right.value > left.value ? right : left, track[0]);
    return {
      complete: steps === p.steps,
      stopped_reason: boundedStop(p.steps, [
        {name: 'step', value: experiment.run_bounds.steps},
        {name: 'state', value: stateLimit},
        {name: 'operation', value: operationLimit}
      ]),
      primary: track.map(item => item.value), secondary: track.map(item => item.position),
      track, curve, best,
      transcript: track.map((item, index) => `step ${index}: x=${item.position.toFixed(9)}, f=${item.value.toFixed(9)}`),
      metrics: {steps, requested_steps: p.steps, states_emitted: fixedCost + steps, operations_used: fixedCost + steps * 5, final_position: position, final_value: track[track.length - 1].value, best_position: best.position, best_value: best.value}
    };
  }

  function collatz(experiment, p) {
    let n = BigInt(p.start);
    const start = n;
    const stateLimit = Math.max(0, experiment.run_bounds.max_states - 1);
    const stepLimit = Math.min(p.steps, experiment.run_bounds.steps, experiment.run_bounds.max_operations, stateLimit);
    const orbit = [], parity = [];
    let peak = n;
    for (let step = 0; step <= stepLimit; step += 1) {
      orbit.push(n.toString()); parity.push(n % 2n === 0n ? 0 : 1);
      if (n === 1n) break;
      if (step === stepLimit) break;
      n = n % 2n === 0n ? n / 2n : 3n * n + 1n;
      if (n > peak) peak = n;
    }
    const reachedOne = orbit[orbit.length - 1] === '1';
    return {
      complete: reachedOne,
      stopped_reason: reachedOne ? 'reached-one' : boundedStop(p.steps, [
        {name: 'step', value: experiment.run_bounds.steps},
        {name: 'operation', value: experiment.run_bounds.max_operations},
        {name: 'state', value: stateLimit}
      ]),
      primary: orbit, secondary: parity,
      orbit, parity,
      transcript: orbit.map((value, index) => `n=${index}: ${value} (${parity[index] ? 'odd' : 'even'})`),
      metrics: {start: start.toString(), requested_steps: p.steps, states_emitted: orbit.length, operations_used: orbit.length - 1, transitions: orbit.length - 1, peak: peak.toString(), reached_one: reachedOne}
    };
  }

  function finiteMap(experiment, p) {
    const table = parseTable(p.table);
    if (table.length + 1 > experiment.run_bounds.max_states) throw new Error('The transition table leaves no room for the initial orbit state under max_states.');
    const graphCost = table.length * (table.length + 1);
    if (graphCost >= experiment.run_bounds.max_operations) throw new Error('Run bounds cannot cover the declared functional graph and one transition.');
    const stateLimit = Math.max(0, experiment.run_bounds.max_states - table.length - 1);
    const operationLimit = experiment.run_bounds.max_operations - graphCost;
    let state = p.start;
    const steps = Math.min(p.steps, experiment.run_bounds.steps, stateLimit, operationLimit);
    const orbit = [], seen = new Map();
    let cycleStart = null;
    for (let step = 0; step <= steps; step += 1) {
      if (seen.has(state)) { cycleStart = seen.get(state); orbit.push(state); break; }
      seen.set(state, orbit.length); orbit.push(state);
      if (step === steps) break;
      state = table[state];
    }
    const graph = functionalGraph(table);
    const cycles = graph.cycles;
    return {
      complete: cycleStart !== null,
      stopped_reason: cycleStart !== null ? 'cycle-detected' : boundedStop(p.steps, [
        {name: 'step', value: experiment.run_bounds.steps},
        {name: 'state', value: stateLimit},
        {name: 'operation', value: operationLimit}
      ]),
      primary: orbit, secondary: [], table, cycles, graph,
      transcript: orbit.map((value, index) => `n=${index}: state ${value}`),
      metrics: {states: table.length, requested_steps: p.steps, states_emitted: table.length + orbit.length, operations_used: graphCost + Math.max(0, orbit.length - 1), transitions_displayed: Math.max(0, orbit.length - 1), cycle_start_index: cycleStart, cycle_length: cycleStart === null ? null : orbit.length - 1 - cycleStart}
    };
  }

  const KERNELS = {
    'modular-projection': modularProjection,
    'logistic-map': logisticMap,
    'coarse-signal': coarseSignal,
    'local-global-search': localGlobalSearch,
    'collatz': collatz,
    'finite-map': finiteMap
  };

  function subjectDigest(experiment) {
    return digest(experiment);
  }

  function runBody(run) {
    return {
      run_version: run.run_version,
      experiment_ref: run.experiment_ref,
      experiment_sha256: run.experiment_sha256,
      engine: run.engine,
      engine_version: run.engine_version,
      engine_artifact_sha256: run.engine_artifact_sha256,
      engine_artifact_binding: run.engine_artifact_binding,
      parameters: run.parameters,
      result: run.result
    };
  }

  function validateObservationForRun(observationValue, run) {
    const errors = [];
    const fields = [
      'id', 'observation_version', 'subject', 'subject_sha256', 'analyzer',
      'analyzer_artifact_sha256', 'run_sha256', 'kind', 'evidence_class',
      'status', 'claim_scope', 'method', 'parameters', 'result', 'proof_status',
      'reproducibility'
    ];
    if (!exactKeys(observationValue, fields)) return ['Run observation must contain exactly the declared observation fields.'];
    if (observationValue.observation_version !== '0.1') errors.push('Run observation has an unsupported observation_version.');
    if (typeof observationValue.id !== 'string' || !/^qeva-observation:sha256:[0-9a-f]{64}$/.test(observationValue.id)) errors.push('Run observation id is invalid.');
    if (observationValue.subject !== run.experiment_ref || observationValue.subject_sha256 !== run.experiment_sha256) errors.push('Run observation is not bound to the run experiment.');
    if (!ANALYZERS.has(observationValue.analyzer)) errors.push('Run observation analyzer is unsupported.');
    else if (observationValue.analyzer_artifact_sha256 !== ANALYZER_DIGESTS[observationValue.analyzer]) errors.push('Run observation analyzer artifact digest is invalid.');
    if (observationValue.run_sha256 !== run.run_sha256) errors.push('Run observation is not bound to run_sha256.');
    if (![observationValue.kind, observationValue.claim_scope, observationValue.method].every(value => typeof value === 'string' && value.length > 0)) errors.push('Run observation kind, claim_scope, and method must be non-empty strings.');
    if (!['exact-execution', 'bounded-exhaustive', 'numerical-observation', 'heuristic-candidate', 'formal-certificate'].includes(observationValue.evidence_class)) errors.push('Run observation evidence_class is invalid.');
    if (!['observed', 'candidate', 'counterexample', 'none-found', 'inconclusive', 'error'].includes(observationValue.status)) errors.push('Run observation status is invalid.');
    if (!['not-proof', 'bounded-proof', 'formal-proof', 'refutation-of-bounded-claim'].includes(observationValue.proof_status)) errors.push('Run observation proof_status is invalid.');
    const contracts = Object.prototype.hasOwnProperty.call(RUN_OBSERVATION_CONTRACTS, observationValue.analyzer) ? RUN_OBSERVATION_CONTRACTS[observationValue.analyzer] : [];
    const contractMatch = contracts.some(contract => contract.kind === observationValue.kind && contract.evidence.includes(observationValue.evidence_class) && contract.status.includes(observationValue.status) && contract.proof.includes(observationValue.proof_status));
    if (!contractMatch) errors.push('Run observation exceeds the declared analyzer evidence contract.');
    if (!isPlainObject(observationValue.parameters) || !isPlainObject(observationValue.result)) errors.push('Run observation parameters and result must be plain objects.');
    const reproducibilityFields = ['engine', 'engine_version', 'engine_artifact_sha256', 'numeric_semantics', 'seed', 'bounds'];
    if (!exactKeys(observationValue.reproducibility, reproducibilityFields)) errors.push('Run observation reproducibility must contain exactly the declared fields.');
    else {
      const reproducibility = observationValue.reproducibility;
      if (reproducibility.engine !== run.engine || reproducibility.engine_version !== run.engine_version || reproducibility.engine_artifact_sha256 !== run.engine_artifact_sha256) errors.push('Run observation reproducibility does not match the run engine.');
      if (typeof reproducibility.numeric_semantics !== 'string' || !reproducibility.numeric_semantics.length) errors.push('Run observation numeric_semantics must be a non-empty string.');
      if (!(reproducibility.seed === null || typeof reproducibility.seed === 'string' || (typeof reproducibility.seed === 'number' && Number.isSafeInteger(reproducibility.seed)))) errors.push('Run observation seed must be null, a string, or a safe integer.');
      if (!isPlainObject(reproducibility.bounds)) errors.push('Run observation bounds must be a plain object.');
    }
    try {
      const body = {...observationValue};
      delete body.id;
      if (observationValue.id !== `qeva-observation:sha256:${digest(body)}`) errors.push('Run observation body digest does not match its id.');
    } catch (error) {
      errors.push(`Run observation digest cannot be computed: ${error.message}`);
    }
    return errors;
  }

  function validateRun(run) {
    const errors = [];
    const fields = ['run_sha256', 'run_version', 'experiment_ref', 'experiment_sha256', 'engine', 'engine_version', 'engine_artifact_sha256', 'engine_artifact_binding', 'parameters', 'result', 'observations'];
    if (!exactKeys(run, fields)) return ['Run must contain exactly the declared run-envelope fields.'];
    try { canonical(run); } catch (error) { errors.push(`Run is not canonicalizable: ${error.message}`); return errors; }
    if (run.run_version !== '0.1') errors.push('Unsupported run_version.');
    if (typeof run.experiment_ref !== 'string' || !/^qeva-experiment:1:[a-z0-9][a-z0-9._-]*@[1-9][0-9]*$/.test(run.experiment_ref)) errors.push('Run experiment_ref is invalid.');
    if (typeof run.experiment_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(run.experiment_sha256) ||
        typeof run.engine_artifact_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(run.engine_artifact_sha256) ||
        typeof run.run_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(run.run_sha256)) errors.push('Run SHA-256 fields are invalid.');
    if (run.engine !== 'QEVA Mechanism Engine' || run.engine_version !== VERSION) errors.push('Run engine identity is unsupported.');
    if (run.engine_artifact_binding !== 'declared-by-experiment; external-byte-verification-required') errors.push('Run must disclose that engine artifact verification is external.');
    if (!isPlainObject(run.parameters) || !isPlainObject(run.result) || !Array.isArray(run.observations)) errors.push('Run parameters, result, or observations have the wrong shape.');
    if (isPlainObject(run.result)) {
      if (typeof run.result.complete !== 'boolean') errors.push('Run result.complete must be boolean.');
      if (typeof run.result.stopped_reason !== 'string' || !run.result.stopped_reason.length) errors.push('Run result.stopped_reason must be a non-empty string.');
      if (!Array.isArray(run.result.primary)) errors.push('Run result.primary must be an array.');
      if (!isPlainObject(run.result.metrics)) errors.push('Run result.metrics must be a plain object.');
      Object.keys(run.result).forEach(key => {
        if (Array.isArray(run.result[key]) && run.result[key].length > HARD_LIMITS.states) errors.push(`Run result.${key} exceeds the hard state limit.`);
      });
      if (isPlainObject(run.result.metrics)) {
        const states = run.result.metrics.states_emitted;
        const operations = run.result.metrics.operations_used;
        if (!Number.isSafeInteger(states) || states < 0 || states > HARD_LIMITS.states) errors.push('Run metrics.states_emitted must be a non-negative safe integer within the hard state limit.');
        if (!Number.isSafeInteger(operations) || operations < 0 || operations > HARD_LIMITS.operations) errors.push('Run metrics.operations_used must be a non-negative safe integer within the hard operation limit.');
      }
    }
    if (Array.isArray(run.observations)) {
      if (run.observations.length > ANALYZERS.size) errors.push('Run observations exceed the bounded analyzer count.');
      const ids = new Set();
      const analyzers = new Set();
      run.observations.forEach((item, index) => {
        validateObservationForRun(item, run).forEach(error => errors.push(`Observation ${index}: ${error}`));
        if (isPlainObject(item) && typeof item.id === 'string') {
          if (ids.has(item.id)) errors.push(`Observation ${index}: duplicate observation id.`);
          ids.add(item.id);
        }
        if (isPlainObject(item) && typeof item.analyzer === 'string') {
          if (analyzers.has(item.analyzer)) errors.push(`Observation ${index}: duplicate run analyzer.`);
          analyzers.add(item.analyzer);
        }
      });
    }
    try {
      if (digest(runBody(run)) !== run.run_sha256) errors.push('Run body digest does not match run_sha256.');
    } catch (error) {
      errors.push(`Run body digest cannot be computed: ${error.message}`);
    }
    return errors;
  }

  function observation(experiment, analyzer, kind, evidenceClass, status, scope, method, parameters, result, proofStatus, runSha256) {
    const parameterRecord = parameters || {};
    const seedParameter = experiment.randomness.seed_parameter;
    const effectiveSeed = seedParameter ? (Object.prototype.hasOwnProperty.call(parameterRecord, seedParameter) ? parameterRecord[seedParameter] : parameterDefaults(experiment)[seedParameter]) : null;
    const body = {
      observation_version: '0.1',
      subject: exactRef(experiment),
      subject_sha256: subjectDigest(experiment),
      analyzer,
      analyzer_artifact_sha256: ANALYZER_DIGESTS[analyzer],
      run_sha256: runSha256 || null,
      kind,
      evidence_class: evidenceClass,
      status,
      claim_scope: scope,
      method,
      parameters: clone(parameterRecord),
      result: clone(result || {}),
      proof_status: proofStatus,
      reproducibility: {
        engine: 'QEVA Mechanism Engine',
        engine_version: VERSION,
        engine_artifact_sha256: experiment.executable.artifact_sha256,
        numeric_semantics: experiment.executable.numeric_semantics,
        seed: effectiveSeed,
        bounds: clone(experiment.run_bounds)
      }
    };
    return {id: `qeva-observation:sha256:${digest(body)}`, ...body};
  }

  function findCycleExact(values) {
    const seen = new Map();
    for (let index = 0; index < values.length; index += 1) {
      const key = String(values[index]);
      if (seen.has(key)) return {start: seen.get(key), period: index - seen.get(key), repeated: key};
      seen.set(key, index);
    }
    return null;
  }

  function candidateNumericPeriod(values, tolerance) {
    const maxPeriod = Math.min(16, Math.floor(values.length / 3));
    for (let period = 1; period <= maxPeriod; period += 1) {
      let matches = true;
      for (let offset = 0; offset < period * 2; offset += 1) {
        const a = values.length - 1 - offset;
        const b = a - period;
        if (b < 0 || Math.abs(values[a] - values[b]) > tolerance) { matches = false; break; }
      }
      if (matches) return {period, tolerance, inspected_suffix: period * 3};
    }
    return null;
  }

  function functionalGraph(table) {
    const cyclesByKey = new Map();
    const basin = {};
    for (let start = 0; start < table.length; start += 1) {
      const order = [], index = new Map();
      let state = start;
      while (!index.has(state) && basin[state] === undefined) {
        index.set(state, order.length); order.push(state); state = table[state];
      }
      let key;
      if (index.has(state)) {
        const cycle = order.slice(index.get(state));
        const rotations = cycle.map((_, i) => cycle.slice(i).concat(cycle.slice(0, i)));
        rotations.sort((a, b) => compareText(a.join(','), b.join(',')));
        const canonicalCycle = rotations[0];
        key = canonicalCycle.join('→');
        cyclesByKey.set(key, canonicalCycle);
      } else key = basin[state];
      order.forEach(item => { basin[item] = key; });
    }
    const cycles = [...cyclesByKey.entries()].sort((a, b) => compareText(a[0], b[0])).map(([key, states]) => ({id: key, states, period: states.length}));
    return {cycles, basin, components: cycles.length, fixed_points: cycles.filter(cycle => cycle.period === 1).map(cycle => cycle.states[0])};
  }

  function analyzeUnchecked(experiment, parameters, result, runSha256) {
    const out = [];
    const family = experiment.family;
    const recordObservation = (...args) => observation(...args, runSha256);
    if (experiment.analyzers.includes('qeva-analyzer:1:summary@1')) {
      out.push(recordObservation(experiment, 'qeva-analyzer:1:summary@1', 'run-summary',
        ['projection','integer-map','finite-state'].includes(family) ? 'exact-execution' : 'numerical-observation',
        'observed', `One bounded run of ${exactRef(experiment)}.`, 'Report completion, bounds, and primary metrics.', parameters,
        {complete: result.complete, stopped_reason: result.stopped_reason || 'completed-bound', metrics: result.metrics}, 'not-proof'));
    }
    if (experiment.analyzers.includes('qeva-analyzer:1:fixed-point@1')) {
      if (family === 'finite-state') {
        const graph = result.graph;
        out.push(recordObservation(experiment, 'qeva-analyzer:1:fixed-point@1', 'fixed-point', 'bounded-exhaustive', 'observed',
          `All ${result.table.length} states of the explicit finite map.`, 'Check table[s]=s for every state.', parameters,
          {states: graph.fixed_points}, 'bounded-proof'));
      } else if (family === 'recurrence') {
        const candidates = [0, (parameters.r - 1) / parameters.r].filter(value => value >= 0 && value <= 1).map(value => ({value, residual: Math.abs(parameters.r * value * (1 - value) - value)}));
        out.push(recordObservation(experiment, 'qeva-analyzer:1:fixed-point@1', 'candidate-fixed-point', 'numerical-observation', 'candidate',
          'The two algebraic fixed-point candidates for this binary64 r value.', 'Evaluate the declared candidates and record binary64 residuals.', parameters,
          {candidates}, 'not-proof'));
      }
    }
    if (experiment.analyzers.includes('qeva-analyzer:1:cycle-detector@1')) {
      if (family === 'finite-state' || family === 'integer-map') {
        const found = findCycleExact(result.primary);
        out.push(recordObservation(experiment, 'qeva-analyzer:1:cycle-detector@1', 'cycle', 'exact-execution', found ? 'observed' : 'none-found',
          `The ${result.primary.length} exact states emitted by this run.`, 'Store the first index of each exact state and report the first repeat.', parameters,
          found || {inspected_states: result.primary.length}, 'not-proof'));
      } else if (family === 'recurrence') {
        const tolerance = 1e-9;
        const found = candidateNumericPeriod(result.primary, tolerance);
        out.push(recordObservation(experiment, 'qeva-analyzer:1:cycle-detector@1', 'candidate-period', 'numerical-observation', found ? 'candidate' : 'none-found',
          `A suffix of this ${result.primary.length}-value binary64 trace at tolerance ${tolerance}.`, 'Compare repeated suffix blocks for candidate periods 1 through 16.', parameters,
          found || {maximum_period_tested: 16, tolerance}, 'not-proof'));
      }
    }
    if (experiment.analyzers.includes('qeva-analyzer:1:perturbation-growth@1') && family === 'recurrence') {
      out.push(recordObservation(experiment, 'qeva-analyzer:1:perturbation-growth@1', 'finite-growth-summary', 'numerical-observation', 'observed',
        'The two binary64 trajectories in this bounded run.', 'Measure absolute separation at each emitted step.', parameters,
        {first_above_0_1: result.metrics.first_separation_above_0_1, maximum: result.metrics.maximum_separation, final: result.separation[result.separation.length - 1]}, 'not-proof'));
    }
    if (experiment.analyzers.includes('qeva-analyzer:1:functional-graph@1') && family === 'finite-state') {
      const graph = result.graph;
      out.push(recordObservation(experiment, 'qeva-analyzer:1:functional-graph@1', 'functional-graph', 'bounded-exhaustive', 'observed',
        `All ${result.table.length} states and outgoing transitions.`, 'Trace every state until it enters a previously identified cycle; canonicalize cycle rotations.', parameters,
        graph, 'bounded-proof'));
    }
    if (experiment.analyzers.includes('qeva-analyzer:1:candidate-invariant@1')) {
      let evidence = 'heuristic-candidate', status = 'candidate', value = {};
      if (family === 'projection') {
        evidence = 'bounded-exhaustive'; status = 'observed';
        value = {candidate: `0 ≤ observed class < ${parameters.modulus}`, checked: result.primary.length, holds: result.primary.every(x => x >= 0 && x < parameters.modulus)};
      } else if (family === 'integer-map') {
        evidence = 'exact-execution'; status = 'candidate';
        value = {candidate: 'all visited values are positive', checked: result.orbit.length, holds: result.orbit.every(x => BigInt(x) > 0n), even_visits: result.parity.filter(x => x === 0).length, odd_visits: result.parity.filter(x => x === 1).length};
      } else if (family === 'signal') {
        evidence = 'numerical-observation'; status = 'candidate';
        value = {candidate: 'sampled values remain in [0,1]', checked: result.primary.length, holds: result.primary.every(x => x >= 0 && x <= 1)};
      } else if (family === 'finite-state') {
        evidence = 'bounded-exhaustive'; status = 'observed';
        value = {candidate: 'transition is a total endofunction on the declared states', checked: result.table.length, holds: result.table.every(x => Number.isInteger(x) && x >= 0 && x < result.table.length)};
      }
      out.push(recordObservation(experiment, 'qeva-analyzer:1:candidate-invariant@1', 'candidate-invariant', evidence, status,
        'Only the explicitly generated or enumerated states.', 'Check a family-specific candidate property and retain its finite scope.', parameters, value, 'not-proof'));
    }
    return out;
  }

  function runExperiment(experiment, overrides) {
    const errors = validateExperiment(experiment);
    if (errors.length) throw new Error(errors.join(' '));
    const parameters = normalizeParameters(experiment, overrides);
    const result = KERNELS[experiment.executable.kernel](experiment, parameters);
    const body = {
      run_version: '0.1',
      experiment_ref: exactRef(experiment),
      experiment_sha256: subjectDigest(experiment),
      engine: 'QEVA Mechanism Engine',
      engine_version: VERSION,
      engine_artifact_sha256: experiment.executable.artifact_sha256,
      engine_artifact_binding: 'declared-by-experiment; external-byte-verification-required',
      parameters,
      result
    };
    const runSha256 = digest(body);
    return {run_sha256: runSha256, ...body, observations: analyzeUnchecked(experiment, parameters, result, runSha256)};
  }

  function validateRunAgainstExperiment(experiment, run) {
    const errors = validateExperiment(experiment).map(error => `Experiment: ${error}`);
    errors.push(...validateRun(run).map(error => `Run: ${error}`));
    if (errors.length) return errors;
    if (run.experiment_ref !== exactRef(experiment) || run.experiment_sha256 !== subjectDigest(experiment) || run.engine_artifact_sha256 !== experiment.executable.artifact_sha256) {
      errors.push('Run is not bound to the supplied experiment revision.');
      return errors;
    }
    let parameters;
    try { parameters = normalizeParameters(experiment, run.parameters); }
    catch (error) { errors.push(`Run parameters cannot be normalized: ${error.message}`); return errors; }
    if (canonical(parameters) !== canonical(run.parameters)) errors.push('Run parameters are not the exact normalized experiment parameters.');
    let replayedResult;
    try { replayedResult = KERNELS[experiment.executable.kernel](experiment, parameters); }
    catch (error) { errors.push(`Run replay failed: ${error.message}`); return errors; }
    if (canonical(replayedResult) !== canonical(run.result)) errors.push('Run result does not match deterministic replay under the supplied experiment.');
    const replayedObservations = analyzeUnchecked(experiment, parameters, replayedResult, run.run_sha256);
    if (canonical(replayedObservations) !== canonical(run.observations)) errors.push('Run observations do not match deterministic analyzer replay under the supplied experiment.');
    return errors;
  }

  function analyzeRun(experiment, run) {
    const errors = validateRunAgainstExperiment(experiment, run);
    if (errors.length) throw new Error(errors.join(' '));
    return clone(run.observations);
  }

  function normalizeObserverSpec(spec) {
    canonical(spec);
    if (!exactKeys(spec, ['kind', 'parameters'])) throw new Error('Observer specifications must contain exactly kind and parameters.');
    const settings = spec.parameters;
    if (!isPlainObject(settings)) throw new Error('Observer parameters must be a plain object.');
    const kind = spec.kind;
    const allowed = {
      identity: [], parity: [], threshold: ['threshold'], bins: ['bins'], remainder: ['modulus']
    };
    if (!Object.prototype.hasOwnProperty.call(allowed, kind)) throw new Error(`Unsupported observer ${kind}.`);
    if (!exactKeys(settings, allowed[kind])) throw new Error(`Observer ${kind} has missing or unknown parameters.`);
    if (kind === 'threshold' && (typeof settings.threshold !== 'number' || !Number.isFinite(settings.threshold))) throw new Error('Observer threshold must be a finite number.');
    if (kind === 'bins' && (!Number.isSafeInteger(settings.bins) || settings.bins < 2 || settings.bins > 32)) throw new Error('Observer bins must be an integer from 2 through 32.');
    if (kind === 'remainder' && (!Number.isSafeInteger(settings.modulus) || settings.modulus < 2)) throw new Error('Observer modulus must be a safe integer of at least 2.');
    return clone(spec);
  }

  function exactInteger(value, label) {
    if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
    if (typeof value === 'string' && /^-?(?:0|[1-9][0-9]*)$/.test(value)) return BigInt(value);
    throw new Error(`${label} requires exact integer states.`);
  }

  function observe(values, spec) {
    const normalized = normalizeObserverSpec(spec);
    const kind = normalized.kind, settings = normalized.parameters;
    if (kind === 'identity') return {spec: normalized, values: values.map(clone)};
    if (kind === 'threshold' || kind === 'bins') {
      if (values.some(value => typeof value !== 'number' || !Number.isFinite(value))) throw new Error(`Observer ${kind} requires finite numeric states.`);
      if (kind === 'threshold') return {spec: normalized, values: values.map(value => value >= settings.threshold ? 1 : 0)};
      return {spec: normalized, values: values.map(value => Math.max(0, Math.min(settings.bins - 1, Math.floor(value * settings.bins))))};
    }
    if (kind === 'parity') return {spec: normalized, values: values.map((value, index) => exactInteger(value, `Observer parity at index ${index}`) % 2n === 0n ? 0 : 1)};
    const divisor = BigInt(settings.modulus);
    return {spec: normalized, values: values.map((value, index) => Number(((exactInteger(value, `Observer remainder at index ${index}`) % divisor) + divisor) % divisor))};
  }

  function observerSwitch(run, left, right) {
    const runErrors = validateRun(run);
    if (runErrors.length) throw new Error(runErrors.join(' '));
    const a = observe(run.result.primary, left);
    const b = observe(run.result.primary, right);
    const aKeys = a.values.map(value => canonical(value));
    const bKeys = b.values.map(value => canonical(value));
    return {
      observer_switch_version: '0.2',
      same_underlying_run: run.run_sha256,
      run_integrity: 'body-digest-verified',
      left: {...a.spec, values: a.values, distinct_states: new Set(aKeys).size},
      right: {...b.spec, values: b.values, distinct_states: new Set(bKeys).size},
      disagreement_count: aKeys.reduce((count, value, index) => count + (value === bKeys[index] ? 0 : 1), 0)
    };
  }

  function pointer(path, token) {
    return `${path}/${String(token).replace(/~/g, '~0').replace(/\//g, '~1')}`;
  }

  function collectStructuralDiff(left, right, limit) {
    canonical(left); canonical(right);
    const changes = [];
    let truncated = false;
    function add(path, operation, before, after, beforePresent, afterPresent) {
      if (changes.length >= limit) { truncated = true; return; }
      changes.push({
        path,
        operation,
        before_present: beforePresent,
        after_present: afterPresent,
        before: beforePresent ? clone(before) : null,
        after: afterPresent ? clone(after) : null
      });
    }
    function walk(before, after, path, beforePresent, afterPresent, depth) {
      if (truncated) return;
      if (depth > MAX_CANONICAL_DEPTH) throw new Error(`Structural diff exceeds maximum depth ${MAX_CANONICAL_DEPTH}`);
      if (!beforePresent || !afterPresent) {
        add(path, beforePresent ? 'remove' : 'add', before, after, beforePresent, afterPresent);
        return;
      }
      if (Object.is(before, after) || (before === 0 && after === 0)) return;
      const beforeObject = before !== null && typeof before === 'object';
      const afterObject = after !== null && typeof after === 'object';
      if (!beforeObject || !afterObject || Array.isArray(before) !== Array.isArray(after)) {
        add(path, 'replace', before, after, true, true); return;
      }
      if (Array.isArray(before)) {
        const length = Math.max(before.length, after.length);
        for (let index = 0; index < length && !truncated; index += 1) {
          walk(before[index], after[index], pointer(path, index), index < before.length, index < after.length, depth + 1);
        }
        return;
      }
      const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
      for (const key of keys) {
        if (truncated) break;
        walk(before[key], after[key], pointer(path, key), Object.prototype.hasOwnProperty.call(before, key), Object.prototype.hasOwnProperty.call(after, key), depth + 1);
      }
    }
    walk(left, right, '', true, true, 0);
    return {changes, truncated};
  }

  function structuralDiff(left, right) {
    const result = collectStructuralDiff(left, right, MAX_DIFF_CHANGES);
    if (result.truncated) result.changes.push({path: '', operation: 'truncated', before_present: false, after_present: false, before: null, after: null});
    return result.changes;
  }

  function forkExperiment(experiment, parameters, observerValue, date) {
    const sourceErrors = validateExperiment(experiment);
    if (sourceErrors.length) throw new Error(sourceErrors.join(' '));
    const normalized = normalizeParameters(experiment, parameters === undefined ? {} : parameters);
    const observer = clone(observerValue === undefined ? experiment.observer : observerValue);
    const observerErrors = validateObserverArtifact(observer);
    if (observerErrors.length) throw new Error(observerErrors.join(' '));
    const created = date === undefined ? new Date().toISOString().slice(0, 10) : date;
    if (!validDateStamp(created)) throw new Error('Fork date must be a real YYYY-MM-DD date.');
    const fork = clone(experiment);
    const parent = exactRef(experiment);
    fork.parameters.forEach(parameter => {
      parameter.default = clone(normalized[parameter.id]);
    });
    fork.observer = observer;
    fork.revision = 1;
    fork.supersedes = null;
    fork.provenance.parent = parent;
    fork.provenance.created = created;
    fork.provenance.creator = 'anonymous local QEVA user';
    fork.stewardship = {steward: 'local draft owner', visibility: 'private', publication_state: 'draft'};
    fork.title = `Fork of ${experiment.title}`;
    if (fork.family === 'finite-state') {
      const tableParameter = fork.parameters.find(parameter => parameter.id === 'table');
      if (tableParameter) {
        const table = parseTable(tableParameter.default);
        fork.state_space.description = 'N named states 0 through N−1 with one outgoing transition each; N is the effective transition-table length.';
        fork.state_space.bounds = [0, 'N−1'];
        tableParameter.description = `N transition entries, each an integer from 0 through N−1; this fork's default has ${table.length} states.`;
        fork.boundary_conditions = ['table has N ≥ 1 entries within the declared run bounds', 'every entry is an integer in [0,N−1]'];
      }
    }
    fork.id = 'qeva-experiment:1:local-pending';
    const identityMaterial = clone(fork);
    delete identityMaterial.id;
    const localKey = digest(identityMaterial);
    fork.id = `qeva-experiment:1:local-${localKey}`;
    const forkErrors = validateExperiment(fork);
    if (forkErrors.length) throw new Error(`Fork is invalid: ${forkErrors.join(' ')}`);
    return fork;
  }

  function compareRuns(baseExperiment, baseRun, currentExperiment, currentRun) {
    [[baseExperiment, baseRun, 'Baseline'], [currentExperiment, currentRun, 'Current']].forEach(([experiment, run, label]) => {
      const errors = validateRunAgainstExperiment(experiment, run);
      if (errors.length) throw new Error(`${label} comparison input is invalid: ${errors.join(' ')}`);
    });
    const experimentDiff = collectStructuralDiff(baseExperiment, currentExperiment, MAX_DIFF_CHANGES);
    const parameterDiff = collectStructuralDiff(baseRun.parameters, currentRun.parameters, MAX_DIFF_CHANGES);
    const resultDiff = collectStructuralDiff(baseRun.result, currentRun.result, MAX_DIFF_CHANGES);
    return {
      comparison_version: '0.2',
      base_run_sha256: baseRun.run_sha256,
      current_run_sha256: currentRun.run_sha256,
      base_result_sha256: digest(baseRun.result),
      current_result_sha256: digest(currentRun.result),
      inputs_equal: !experimentDiff.changes.length && !parameterDiff.changes.length,
      results_equal: !resultDiff.changes.length,
      input_changes: experimentDiff.changes,
      parameter_changes: parameterDiff.changes,
      output_changes: resultDiff.changes,
      input_changes_truncated: experimentDiff.truncated,
      parameter_changes_truncated: parameterDiff.truncated,
      output_changes_truncated: resultDiff.truncated,
      change_limit_per_section: MAX_DIFF_CHANGES
    };
  }

  function sweepMetric(experiment, run) {
    const m = run.result.metrics;
    if (experiment.family === 'recurrence') return m.maximum_separation;
    if (experiment.family === 'projection') return m.class_count;
    if (experiment.family === 'signal') return m.discarded_detail_mse;
    if (experiment.family === 'optimization') return m.best_value;
    if (experiment.family === 'integer-map') return m.transitions;
    if (experiment.family === 'finite-state') return m.cycle_length || 0;
    return 0;
  }

  function parameterSweep(experiment, parameterId, minimum, maximum, samples, overrides) {
    const validation = validateExperiment(experiment);
    if (validation.length) throw new Error(validation.join(' '));
    const parameter = experiment.parameters.find(item => item.id === parameterId);
    if (!parameter || !['integer','number'].includes(parameter.type)) throw new Error('Select a numeric parameter for the sweep.');
    const sweepOverrides = overrides === undefined ? {} : overrides;
    if (!isPlainObject(sweepOverrides)) throw new Error('Sweep overrides must be a plain object.');
    if (Object.prototype.hasOwnProperty.call(sweepOverrides, parameterId)) throw new Error('Sweep overrides must not also set the swept parameter.');
    const baseParameters = normalizeParameters(experiment, sweepOverrides);
    delete baseParameters[parameterId];
    const requested = samples, requestedLow = minimum, requestedHigh = maximum;
    if (![requested, requestedLow, requestedHigh].every(value => typeof value === 'number' && Number.isFinite(value))) throw new Error('Sweep bounds and sample count must be finite numbers.');
    if (!Number.isSafeInteger(requested) || requested < 2) throw new Error('Sweep sample count must be a safe integer of at least 2.');
    if (requestedLow >= requestedHigh) throw new Error('Sweep minimum must be strictly less than maximum.');
    if (requestedLow < parameter.min || requestedHigh > parameter.max) throw new Error(`Sweep range must stay within ${parameter.min} through ${parameter.max}.`);
    if (parameter.type === 'integer' && (!Number.isSafeInteger(requestedLow) || !Number.isSafeInteger(requestedHigh))) throw new Error('Integer-parameter sweep bounds must be safe integers.');
    if (experiment.executable.kernel === 'finite-map' && parameterId === 'start') {
      const tableLength = parseTable(baseParameters.table).length;
      if (requestedHigh >= tableLength) throw new Error(`Starting-state sweep must stay between 0 and ${tableLength - 1} for the effective transition table.`);
    }
    const aggregateLimit = Math.floor(HARD_LIMITS.operations / Math.max(1, experiment.run_bounds.max_operations));
    if (aggregateLimit < 2) throw new Error('This experiment cannot fit a two-sample sweep inside the aggregate operation limit.');
    const domainLimit = parameter.type === 'integer' ? requestedHigh - requestedLow + 1 : Infinity;
    const count = Math.min(MAX_SWEEP_SAMPLES, aggregateLimit, domainLimit, requested);
    const low = requestedLow, high = requestedHigh;
    const rows = [];
    for (let index = 0; index < count; index += 1) {
      let value = index === 0 ? low : (index === count - 1 ? high : low + (high - low) * index / (count - 1));
      if (parameter.type === 'integer' && index > 0 && index < count - 1) value = low + Math.round((high - low) * index / (count - 1));
      const run = runExperiment(experiment, {...baseParameters, [parameterId]: value});
      rows.push({value, run_parameters: clone(run.parameters), run_sha256: run.run_sha256, result_metrics: clone(run.result.metrics), metric: sweepMetric(experiment, run), complete: run.result.complete, stopped_reason: run.result.stopped_reason});
    }
    const limitingFactors = [];
    if (count < requested && count === domainLimit) limitingFactors.push('parameter-domain-bound');
    if (count < requested && count === MAX_SWEEP_SAMPLES) limitingFactors.push('sample-limit-bound');
    if (count < requested && count === aggregateLimit) limitingFactors.push('aggregate-operation-bound');
    const stoppedReason = limitingFactors[0] || 'requested-complete';
    return {
      sweep_version: '0.2',
      experiment_ref: exactRef(experiment),
      experiment_sha256: subjectDigest(experiment),
      parameter: parameterId,
      base_parameters: clone(baseParameters),
      range: [low, high],
      requested_samples: requested,
      samples: count,
      stopped_reason: stoppedReason,
      limiting_factors: limitingFactors,
      metric: 'family-default',
      rows
    };
  }

  function attack(experiment, options) {
    const validation = validateExperiment(experiment);
    if (validation.length) throw new Error(validation.join(' '));
    if (!experiment.analyzers.includes('qeva-analyzer:1:conjecture-attack@1')) throw new Error('This experiment does not declare the conjecture-attack analyzer.');
    const requested = options === undefined ? {} : options;
    if (!isPlainObject(requested)) throw new Error('Attack options must be a plain object.');
    canonical(requested);
    const defaults = parameterDefaults(experiment);
    const parametersById = Object.fromEntries(experiment.parameters.map(parameter => [parameter.id, parameter]));
    const allowedByFamily = {
      'integer-map': ['max_cases', 'steps'],
      'finite-state': ['steps', 'target', 'table'],
      recurrence: ['max_cases', 'steps'],
      optimization: ['steps'],
      projection: [], signal: []
    };
    const allowed = allowedByFamily[experiment.family];
    const unknown = Object.keys(requested).filter(key => !allowed.includes(key));
    if (unknown.length) throw new Error(`Unknown or inapplicable attack option: ${unknown.join(', ')}.`);
    const integerOption = (name, fallback, minimum, maximum) => {
      const value = Object.prototype.hasOwnProperty.call(requested, name) ? requested[name] : fallback;
      if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`Attack ${name} must be a safe integer from ${minimum} through ${maximum}.`);
      return value;
    };
    const requestedSteps = () => {
      const parameter = parametersById.steps;
      if (!parameter) throw new Error('This attack family has no steps parameter.');
      return integerOption('steps', defaults.steps, parameter.min, parameter.max);
    };
    const observationParameters = {};
    if (experiment.randomness.seed_parameter) observationParameters[experiment.randomness.seed_parameter] = defaults[experiment.randomness.seed_parameter];
    let result, evidenceClass = 'bounded-exhaustive', proofStatus = 'not-proof', status = 'none-found', scope, method, supportingRunSha256 = null;
    if (experiment.family === 'integer-map') {
      const requestedMaxCases = integerOption('max_cases', 256, 1, MAX_ATTACK_CASES);
      const submittedSteps = requestedSteps();
      const startParameter = experiment.parameters.find(parameter => parameter.id === 'start');
      const steps = Math.min(submittedSteps, experiment.run_bounds.steps, experiment.run_bounds.max_operations, experiment.run_bounds.max_states - 1);
      observationParameters.requested_max_cases = requestedMaxCases;
      observationParameters.requested_steps = submittedSteps;
      observationParameters.effective_steps = steps;
      const perCaseOperations = Math.max(1, steps);
      const budgetCases = Math.max(1, Math.floor(HARD_LIMITS.operations / perCaseOperations));
      const firstStart = Math.max(1, startParameter.min);
      const availableCases = startParameter.max - firstStart + 1;
      const caseLimit = Math.max(1, Math.min(requestedMaxCases, budgetCases, availableCases));
      const maxStart = firstStart + caseLimit - 1;
      let witness = null;
      let casesChecked = 0;
      for (let start = firstStart; start <= maxStart; start += 1) {
        casesChecked += 1;
        const parameters = normalizeParameters(experiment, {...defaults, start, steps});
        const runResult = KERNELS[experiment.executable.kernel](experiment, parameters);
        if (!runResult.metrics.reached_one) { witness = {start, transitions: runResult.metrics.transitions, final: runResult.orbit[runResult.orbit.length - 1], peak: runResult.metrics.peak}; break; }
      }
      scope = `For every integer start in [${firstStart},${maxStart}], the declared Collatz kernel reaches 1 within ${steps} transitions.`;
      method = 'Enumerate every start in the finite interval and replay at most the stated transitions.';
      let stoppedReason = 'requested-complete';
      if (witness) stoppedReason = 'counterexample-found';
      else if (caseLimit < requestedMaxCases) stoppedReason = caseLimit === availableCases ? 'parameter-domain-bound' : 'aggregate-operation-bound';
      else if (steps < submittedSteps) stoppedReason = 'per-case-resource-bound';
      result = {requested_cases: requestedMaxCases, requested_steps: submittedSteps, effective_steps: steps, first_start: firstStart, last_start: maxStart, case_limit: caseLimit, cases_checked: casesChecked, stopped_reason: stoppedReason, witness};
      status = witness ? 'counterexample' : 'none-found';
      proofStatus = witness ? 'refutation-of-bounded-claim' : 'bounded-proof';
    } else if (experiment.family === 'finite-state') {
      const submittedSteps = requestedSteps();
      const table = parseTable(Object.prototype.hasOwnProperty.call(requested, 'table') ? requested.table : defaults.table);
      if (table.length + 1 > experiment.run_bounds.max_states) throw new Error('The exhaustive finite-map attack exceeds max_states.');
      const target = integerOption('target', 0, 0, table.length - 1);
      const operationStepLimit = Math.floor(experiment.run_bounds.max_operations / table.length) - 1;
      const transitionLimit = Math.min(submittedSteps, experiment.run_bounds.steps, operationStepLimit);
      if (transitionLimit < 1) throw new Error('The exhaustive finite-map attack cannot fit one transition per state within max_operations.');
      observationParameters.table = table;
      observationParameters.target = target;
      observationParameters.requested_steps = submittedSteps;
      observationParameters.effective_steps = transitionLimit;
      let witness = null;
      for (let start = 0; start < table.length; start += 1) {
        let state = start, reached = state === target;
        for (let step = 0; step < transitionLimit && !reached; step += 1) { state = table[state]; reached = state === target; }
        if (!reached) { witness = {start, target, entered: state}; break; }
      }
      scope = `Every state in the explicit ${table.length}-state map reaches target ${target} within ${transitionLimit} transitions.`;
      method = 'Exhaust every state of the declared finite map.';
      result = {states_checked: witness ? witness.start + 1 : table.length, requested_steps: submittedSteps, effective_steps: transitionLimit, stopped_reason: witness ? 'counterexample-found' : (transitionLimit < submittedSteps ? 'per-case-resource-bound' : 'finite-state-space-complete'), witness};
      status = witness ? 'counterexample' : 'none-found';
      proofStatus = witness ? 'refutation-of-bounded-claim' : 'bounded-proof';
    } else if (experiment.family === 'recurrence') {
      const requestedMaxCases = integerOption('max_cases', 256, 2, MAX_ATTACK_CASES);
      const submittedSteps = requestedSteps();
      const x0Parameter = experiment.parameters.find(parameter => parameter.id === 'x0');
      const steps = Math.min(submittedSteps, experiment.run_bounds.steps, Math.floor(experiment.run_bounds.max_operations / 2), Math.floor(experiment.run_bounds.max_states / 2) - 1);
      observationParameters.requested_max_cases = requestedMaxCases;
      observationParameters.requested_steps = submittedSteps;
      observationParameters.effective_steps = steps;
      const perCaseOperations = Math.max(1, steps * 2);
      const aggregateCases = Math.floor(HARD_LIMITS.operations / perCaseOperations);
      if (aggregateCases < 2) throw new Error('Two recurrence attack samples do not fit the aggregate operation limit.');
      const cases = Math.min(1024, requestedMaxCases, aggregateCases);
      let witness = null;
      for (let index = 0; index < cases; index += 1) {
        const x0 = index === 0 ? x0Parameter.min : (index === cases - 1 ? x0Parameter.max : x0Parameter.min + (x0Parameter.max - x0Parameter.min) * index / (cases - 1));
        const parameters = normalizeParameters(experiment, {...defaults, x0, steps});
        const runResult = KERNELS[experiment.executable.kernel](experiment, parameters);
        const bad = runResult.primary.findIndex(value => value < 0 || value > 1 || !Number.isFinite(value));
        if (bad >= 0) { witness = {sample_index: index, x0, step: bad, value: runResult.primary[bad]}; break; }
      }
      evidenceClass = 'numerical-observation';
      scope = `${cases} evenly spaced binary64 initial samples under r=${defaults.r} for ${steps} steps remain in [0,1].`;
      method = 'Test a finite grid of binary64 samples; this is not exhaustive over the continuum.';
      let stoppedReason = 'requested-complete';
      if (witness) stoppedReason = 'counterexample-found';
      else if (cases < requestedMaxCases) stoppedReason = cases === 1024 && aggregateCases > 1024 ? 'case-limit-bound' : 'aggregate-operation-bound';
      else if (steps < submittedSteps) stoppedReason = 'per-case-resource-bound';
      result = {requested_cases: requestedMaxCases, requested_steps: submittedSteps, effective_steps: steps, x0_range: [x0Parameter.min, x0Parameter.max], case_limit: cases, cases_checked: witness ? witness.sample_index + 1 : cases, stopped_reason: stoppedReason, witness};
      status = witness ? 'counterexample' : 'none-found';
      proofStatus = witness ? 'refutation-of-bounded-claim' : 'not-proof';
    } else {
      const parameters = {...defaults};
      if (experiment.family === 'optimization') {
        parameters.steps = requestedSteps();
        observationParameters.requested_steps = parameters.steps;
      }
      const run = runExperiment(experiment, parameters);
      supportingRunSha256 = run.run_sha256;
      const values = run.result.primary;
      const witnessIndex = values.findIndex(value => typeof value !== 'number' || !Number.isFinite(value));
      if (experiment.family === 'optimization') observationParameters.effective_steps = run.result.metrics.steps;
      scope = `The finite primary output of ${exactRef(experiment)} contains only finite numeric values.`;
      method = 'Inspect every value emitted in one bounded, content-addressed run.';
      result = {run_sha256: run.run_sha256, values_checked: values.length, stopped_reason: witnessIndex < 0 ? run.result.stopped_reason : 'counterexample-found', witness: witnessIndex < 0 ? null : {index: witnessIndex, value: String(values[witnessIndex])}};
      status = witnessIndex < 0 ? 'none-found' : 'counterexample';
      evidenceClass = experiment.family === 'projection' ? 'bounded-exhaustive' : 'numerical-observation';
      proofStatus = experiment.family === 'projection' && witnessIndex < 0 ? 'bounded-proof' : (witnessIndex < 0 ? 'not-proof' : 'refutation-of-bounded-claim');
    }
    const obs = observation(experiment, 'qeva-analyzer:1:conjecture-attack@1', 'conjecture-attack', evidenceClass, status, scope, method, observationParameters, result, proofStatus, supportingRunSha256);
    return {attack_version: '0.2', claim: scope, observation: obs};
  }

  return Object.freeze({
    VERSION,
    MAX_SWEEP_SAMPLES,
    MAX_ATTACK_CASES,
    MAX_DIFF_CHANGES,
    MAX_CANONICAL_DEPTH,
    HARD_LIMITS,
    canonical,
    digest,
    exactRef,
    parameterDefaults,
    normalizeParameters,
    validateExperiment,
    validateRun,
    validateRunAgainstExperiment,
    analyzeRun,
    runExperiment,
    observerSwitch,
    structuralDiff,
    forkExperiment,
    compareRuns,
    parameterSweep,
    attack,
    parseTable
  });
});
