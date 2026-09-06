# Numeric semantics 0.1

The Mechanism Engine accepts only named, bounded kernels. It never evaluates
user-supplied JavaScript.

- `integer` operations are mathematical integers while values remain within the
  explicit run bound. Browser execution uses `BigInt` and exports decimal
  strings.
- `safe-integer` operations stop before leaving the exactly representable range
  `[-(2^53-1), 2^53-1]`.
- `binary64` uses ECMAScript binary64 arithmetic. Parameter values, operation
  order, comparisons, tolerances, and engine version are part of the record.
- The explicit semantics label `ecmascript-binary64-host-transcendentals-v0.1`
  means the kernel uses ECMAScript binary64 operators plus host `Math`
  transcendental functions. QEVA 0.5's signal and optimization examples use `Math.sin` and
  `Math.exp`. Their exact hashes are regression evidence for the pinned engine
  artifact, not a claim of bit-identical transcendental results across every
  JavaScript implementation. A future portable kernel must specify its own
  approximation and create a new kernel revision.
- `finite-enumeration` uses exact safe-integer state labels and explicit transition
  tables.
- `NaN`, positive infinity, and negative infinity are errors, never data.
- State and operation bounds are enforced by every kernel and yield an explicit
  incomplete result when reached. `timeout_ms` is a declared scheduling budget
  for future isolated runners; this dependency-free synchronous reference
  engine relies on the stricter work bounds rather than claiming timer
  preemption. Overflow or an invalid transition is an error. Partial output
  never becomes proof.

Random experiments pin the generator name, version, integer seed, and draw
order. QEVA 0.5 includes `lcg32-numerical-recipes@1`; it is reproducible, not
cryptographically secure and not a model of physical randomness.

Sweep and attack controls reject out-of-domain, fractional, or inapplicable
requests rather than silently rounding or substituting defaults. When a finite
execution reaches an aggregate, per-case, parameter-domain, or implementation
sample bound, the result names that limiting condition. When a counterexample
ends a search early, the stop reason is `counterexample-found`, never a false
completion label.
