/* QEVA bounded numerical kernels. MIT. No eval, network or user-supplied code. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.QEVA = root.QEVA || {}; root.QEVA.Kernels = api; }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var VERSION = 'qeva-kernels/1';
  var definitions = {
    'qeva:kernel:affine@1': {
      title: 'Affine recurrence', rule: 'x[n+1] = a × x[n] + b',
      domain: 'Real-number model, computed with binary64 arithmetic. n starts at 0.',
      arithmetic: 'binary64; multiplication before addition; no fused multiply-add',
      parameters: {
        a: {label: 'Multiplier a', min: -4, max: 4, step: 0.1, value: 2},
        b: {label: 'Offset b', min: -10, max: 10, step: 0.1, value: 0},
        x0: {label: 'Initial value x₀', min: -10, max: 10, step: 0.1, value: 1},
        steps: {label: 'Iterations', min: 1, max: 128, step: 1, value: 12, integer: true}
      }
    },
    'qeva:kernel:logistic@1': {
      title: 'Logistic recurrence', rule: 'x[n+1] = (r × x[n]) × (1 − x[n])',
      domain: '0 ≤ r ≤ 4; both starting states must lie in [0, 1]. No clamping.',
      arithmetic: 'binary64; explicit left-associated multiplication; finite trajectory, not proof',
      parameters: {
        r: {label: 'Feedback r', min: 0, max: 4, step: 0.01, value: 3.9},
        x0: {label: 'Initial value x₀', min: 0, max: 1, step: 0.001, value: 0.4},
        delta: {label: 'Initial separation Δ', min: 0, max: 0.05, step: 0.000001, value: 0.0001},
        steps: {label: 'Iterations', min: 1, max: 512, step: 1, value: 70, integer: true}
      }
    },
    'qeva:kernel:collatz@1': {
      title: 'Collatz recurrence', rule: 'T(n) = n / 2 when even; T(n) = 3n + 1 when odd',
      domain: 'Positive integers. Stop at 1 or at the declared iteration/digit budget.',
      arithmetic: 'exact BigInt integer operations; exported values are decimal strings',
      parameters: {
        start: {label: 'Positive starting integer', kind: 'integer-string', value: '6', maxDigits: 30},
        steps: {label: 'Iteration budget', min: 1, max: 1024, step: 1, value: 80, integer: true}
      }
    }
  };
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function definition(ref) {
    if (!own(definitions, ref)) throw new Error('Unknown or unsupported kernel revision: ' + ref);
    return copy(definitions[ref]);
  }
  function defaults(ref) {
    var result = {}, fields = definition(ref).parameters;
    Object.keys(fields).forEach(function (k) { result[k] = fields[k].value; });
    return result;
  }
  function validate(ref, parameters) {
    var d = definition(ref), fields = d.parameters;
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) throw new Error('Parameters must be an object.');
    if (Object.keys(parameters).sort().join('|') !== Object.keys(fields).sort().join('|')) throw new Error('Parameter names do not match this kernel.');
    Object.keys(fields).forEach(function (k) {
      var spec = fields[k], v = parameters[k];
      if (spec.kind === 'integer-string') {
        if (typeof v !== 'string' || !/^[1-9][0-9]*$/.test(v) || v.length > spec.maxDigits) throw new Error(spec.label + ' must be a positive decimal integer of at most ' + spec.maxDigits + ' digits.');
      } else if (typeof v !== 'number' || !Number.isFinite(v) || v < spec.min || v > spec.max || (spec.integer && !Number.isInteger(v))) {
        throw new Error(spec.label + ' must be ' + (spec.integer ? 'an integer ' : '') + 'between ' + spec.min + ' and ' + spec.max + '.');
      }
    });
    if (ref === 'qeva:kernel:logistic@1' && parameters.x0 + parameters.delta > 1) throw new Error('x₀ + Δ must be at most 1. Neither starting state is silently clamped.');
    return copy(parameters);
  }
  function run(ref, input) {
    var p = validate(ref, input), series = [], summary = {}, status = 'complete', i, x, y;
    if (ref === 'qeva:kernel:affine@1') {
      x = p.x0;
      for (i = 0; i <= p.steps; i += 1) {
        if (!Number.isFinite(x)) { status = 'numeric-limit'; break; }
        series.push([i, x]); x = p.a * x + p.b;
      }
      summary = {iterations: series.length - 1, initial: p.x0, final: series[series.length - 1][1]};
    } else if (ref === 'qeva:kernel:logistic@1') {
      x = p.x0; y = p.x0 + p.delta;
      var maxGap = 0, crossing = null;
      for (i = 0; i <= p.steps; i += 1) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) { status = 'numeric-limit'; break; }
        var gap = Math.abs(x - y); maxGap = Math.max(maxGap, gap);
        if (crossing === null && gap > 0.1) crossing = i;
        series.push([i, x, y]);
        x = (p.r * x) * (1 - x); y = (p.r * y) * (1 - y);
      }
      summary = {iterations: series.length - 1, max_separation: maxGap, first_separation_above_0_1: crossing, final_separation: Math.abs(series[series.length - 1][1] - series[series.length - 1][2])};
    } else {
      if (typeof BigInt !== 'function') throw new Error('This browser lacks exact BigInt arithmetic. Read the declared rule or use a newer browser; approximate integers are not substituted.');
      x = BigInt(p.start); var one = BigInt(1), two = BigInt(2), three = BigInt(3), peak = x;
      status = 'step-budget';
      for (i = 0; i <= p.steps; i += 1) {
        var decimal = x.toString();
        if (decimal.length > 512) { status = 'digit-budget'; break; }
        series.push([i, decimal]); if (x > peak) peak = x;
        if (x === one) { status = 'reached-one'; break; }
        x = x % two === BigInt(0) ? x / two : three * x + one;
      }
      summary = {iterations: series.length - 1, peak: peak.toString(), final: series[series.length - 1][1], reached_one: status === 'reached-one'};
    }
    return {engine: VERSION, kernel_ref: ref, arithmetic: definition(ref).arithmetic, parameters: p, status: status, series: series, summary: summary};
  }
  function explain(result) {
    var s = result.summary;
    if (result.kernel_ref === 'qeva:kernel:logistic@1') return 'Maximum separation: ' + s.max_separation.toPrecision(5) + '. First separation > 0.1: ' + (s.first_separation_above_0_1 === null ? 'not reached within this run' : 'step ' + s.first_separation_above_0_1) + '. ' + s.iterations + ' iterations. Numerical observation only.';
    if (result.kernel_ref === 'qeva:kernel:collatz@1') return s.reached_one ? 'Reached 1 after ' + s.iterations + ' iterations. Peak: ' + s.peak + '. This establishes only the displayed finite orbit, not the universal conjecture.' : 'Stopped at the ' + result.status + ' after ' + s.iterations + ' iterations. Inconclusive, not a counterexample.';
    return 'Initial value: ' + s.initial + '. Final value: ' + s.final + '. ' + s.iterations + ' iterations. ' + (result.status === 'complete' ? 'Finite calculation, not a universal proof.' : 'Numerical limit reached; retain this failed run.');
  }
  return {version: VERSION, refs: Object.keys(definitions), definition: definition, defaults: defaults, validate: validate, run: run, explain: explain};
}));
