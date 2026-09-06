#!/usr/bin/env node
/** Replay the bounded QEVA Mechanism Engine contract without a test library. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
let root = path.resolve(scriptDirectory, '..');
let fixturePath = null;
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--root') {
    if (!args[index + 1]) throw new Error('--root requires a path');
    root = path.resolve(args[++index]);
  } else if (fixturePath === null) {
    fixturePath = path.resolve(args[index]);
  } else {
    throw new Error(`Unexpected argument: ${args[index]}`);
  }
}
fixturePath ||= path.join(root, 'tests', 'fixtures', 'engine-fixtures.json');

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).sort().forEach(key => { out[key] = sorted(value[key]); });
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Fixture contains a non-finite number');
  return value;
}

function canonical(value) {
  return JSON.stringify(sorted(value)) + '\n';
}

function canonicalSha256(value) {
  return crypto.createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

function rawSha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function materializeSpecial(value) {
  if (Array.isArray(value)) return value.map(materializeSpecial);
  if (value && typeof value === 'object') {
    if (Object.keys(value).length === 1 && value.$special === 'NaN') return Number.NaN;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, materializeSpecial(item)]));
  }
  return value;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function confined(relative, label) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\')) {
    throw new Error(`${label}: unsafe fixture path ${JSON.stringify(relative)}`);
  }
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`${label}: fixture path escapes root`);
  }
  return target;
}

function exactRef(record) {
  return `${record.id}@${record.revision}`;
}

const fixture = readJson(fixturePath);
assert.equal(fixture.fixture_version, '0.3', 'unsupported fixture_version');

const enginePath = confined(fixture.engine_artifact.path, 'engine artifact');
assert.equal(fixture.engine_artifact.path, 'assets/mechanism-engine.js', 'fixture must bind the deployed engine path');
assert.equal(rawSha256(enginePath), fixture.engine_artifact.sha256, 'engine raw-byte SHA-256 drift');
const require = createRequire(import.meta.url);
const engine = require(enginePath);

assert.equal(engine.VERSION, fixture.engine_version, 'fixture/engine version mismatch');
for (const name of [
  'canonical', 'digest', 'exactRef', 'validateExperiment', 'validateRun', 'validateRunAgainstExperiment', 'normalizeParameters',
  'analyzeRun', 'runExperiment', 'observerSwitch', 'forkExperiment', 'compareRuns',
  'parameterSweep', 'attack', 'parseTable', 'structuralDiff'
]) assert.equal(typeof engine[name], 'function', `engine export ${name} is missing`);
assert.ok(Object.isFrozen(engine), 'engine API must be immutable');
assert.ok(Object.isFrozen(engine.HARD_LIMITS), 'HARD_LIMITS must be immutable');
assert.deepEqual(engine.HARD_LIMITS, fixture.hard_limits, 'hard resource limits drift');
const hardLimitsBefore = canonical(engine.HARD_LIMITS);
assert.throws(() => { engine.HARD_LIMITS.steps = 1; }, TypeError, 'HARD_LIMITS mutation must throw');
assert.equal(canonical(engine.HARD_LIMITS), hardLimitsBefore, 'HARD_LIMITS changed after mutation attempt');

function syntheticRun(values) {
  const body = {
    run_version: '0.1',
    experiment_ref: 'qeva-experiment:1:fixture-synthetic@1',
    experiment_sha256: 'f'.repeat(64),
    engine: 'QEVA Mechanism Engine',
    engine_version: engine.VERSION,
    engine_artifact_sha256: fixture.engine_artifact.sha256,
    engine_artifact_binding: 'declared-by-experiment; external-byte-verification-required',
    parameters: {},
    result: {
      complete: true,
      stopped_reason: 'synthetic-fixture-complete',
      primary: clone(values),
      metrics: {states_emitted: values.length, operations_used: 0}
    }
  };
  return {run_sha256: engine.digest(body), ...body, observations: []};
}

function runBodyValue(run) {
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

function readdressObservation(observation) {
  const {id: _oldId, ...body} = observation;
  observation.id = `qeva-observation:sha256:${canonicalSha256(body)}`;
}

function refreshRunBindings(run) {
  run.run_sha256 = canonicalSha256(runBodyValue(run));
  run.observations.forEach(observation => {
    observation.run_sha256 = run.run_sha256;
    readdressObservation(observation);
  });
}

function sweepMetric(record, run) {
  const metrics = run.result.metrics;
  if (record.family === 'recurrence') return metrics.maximum_separation;
  if (record.family === 'projection') return metrics.class_count;
  if (record.family === 'signal') return metrics.discarded_detail_mse;
  if (record.family === 'optimization') return metrics.best_value;
  if (record.family === 'integer-map') return metrics.transitions;
  if (record.family === 'finite-state') return metrics.cycle_length || 0;
  throw new Error(`Unsupported sweep family ${record.family}`);
}

const analyzerArtifacts = new Map(Object.entries(fixture.analyzer_artifacts));
const actualManifestPaths = fs.readdirSync(path.join(root, 'analyzers', 'manifests'))
  .filter(name => name.endsWith('.json'))
  .map(name => `analyzers/manifests/${name}`)
  .sort();
const fixtureManifestPaths = [...analyzerArtifacts.values()].map(item => item.path).sort();
assert.deepEqual(fixtureManifestPaths, actualManifestPaths, 'analyzer artifact fixture is not the complete manifest set');
for (const [ref, artifact] of analyzerArtifacts) {
  const manifestPath = confined(artifact.path, `analyzer/${ref}`);
  assert.equal(rawSha256(manifestPath), artifact.sha256, `${ref}: raw analyzer artifact digest drift`);
  const manifest = readJson(manifestPath);
  assert.equal(exactRef(manifest), ref, `${ref}: fixture path identifies a different analyzer`);
}

const experimentCache = new Map();
function experiment(relative, label) {
  if (!experimentCache.has(relative)) {
    const value = readJson(confined(relative, label));
    const validation = engine.validateExperiment(value);
    assert.deepEqual(validation, [], `${label}: engine rejected canonical experiment: ${validation.join(' ')}`);
    assert.equal(engine.canonical(value), canonical(value), `${label}: canonical encoders disagree`);
    assert.equal(engine.digest(value), canonicalSha256(value), `${label}: SHA-256 implementation disagrees with Node crypto`);
    assert.equal(value.executable.artifact_sha256, fixture.engine_artifact.sha256, `${label}: experiment does not bind the deployed engine bytes`);
    for (const analyzer of value.analyzers) {
      assert.ok(analyzerArtifacts.has(analyzer), `${label}: analyzer ${analyzer} has no raw-byte fixture`);
    }
    experimentCache.set(relative, value);
  }
  return clone(experimentCache.get(relative));
}

function observationSummary(observation) {
  return {
    kind: observation.kind,
    evidence_class: observation.evidence_class,
    status: observation.status,
    proof_status: observation.proof_status
  };
}

function verifyObservation(observation, record, label, runSha256) {
  const {id, ...body} = observation;
  assert.equal(id, `qeva-observation:sha256:${canonicalSha256(body)}`, `${label}: observation content address drift`);
  assert.equal(observation.subject, engine.exactRef(record), `${label}: observation subject drift`);
  assert.equal(observation.subject_sha256, engine.digest(record), `${label}: observation subject digest drift`);
  assert.ok(record.analyzers.includes(observation.analyzer), `${label}: undeclared analyzer emitted an observation`);
  const analyzer = analyzerArtifacts.get(observation.analyzer);
  assert.ok(analyzer, `${label}: observation names an unbound analyzer`);
  assert.equal(observation.analyzer_artifact_sha256, analyzer.sha256, `${label}: observation does not bind the exact analyzer manifest bytes`);
  assert.ok(!Object.hasOwn(observation, 'analyzer_sha256'), `${label}: obsolete ambiguous analyzer_sha256 field returned`);
  assert.equal(observation.run_sha256, runSha256, `${label}: observation/run provenance drift`);
  assert.equal(observation.reproducibility.engine_version, engine.VERSION, `${label}: observation engine version drift`);
  assert.equal(observation.reproducibility.engine_artifact_sha256, fixture.engine_artifact.sha256, `${label}: observation engine artifact binding drift`);
  assert.deepEqual(observation.reproducibility.bounds, record.run_bounds, `${label}: observation resource bounds drift`);
  if (observation.evidence_class === 'numerical-observation' || observation.evidence_class === 'heuristic-candidate') {
    assert.equal(observation.proof_status, 'not-proof', `${label}: numerical/heuristic output cannot claim proof`);
  }
  if (observation.proof_status === 'bounded-proof') {
    assert.ok(['bounded-exhaustive', 'formal-certificate'].includes(observation.evidence_class), `${label}: bounded-proof requires exhaustive or certificate evidence`);
  }
}

function verifyRunBinding(run, record, expected, label) {
  assert.deepEqual(engine.validateRun(run), [], `${label}: engine rejected its own run envelope`);
  assert.deepEqual(engine.validateRunAgainstExperiment(record, run), [], `${label}: run is not bound to its experiment contract`);
  const replayedObservations = engine.analyzeRun(record, run);
  assert.deepEqual(replayedObservations, run.observations, `${label}: analyzeRun replay drift`);
  const observationBytes = engine.canonical(run.observations);
  if (replayedObservations.length) replayedObservations[0].status = 'error';
  assert.equal(engine.canonical(run.observations), observationBytes, `${label}: analyzeRun leaked mutable observation aliases`);
  const {run_sha256: embedded, observations, ...body} = run;
  assert.equal(embedded, canonicalSha256(body), `${label}: run_sha256 does not content-address the run body`);
  assert.equal(embedded, expected.run_sha256, `${label}: run identity fixture drift`);
  assert.equal(engine.digest(run), expected.envelope_sha256, `${label}: complete run envelope fixture drift`);
  assert.equal(run.experiment_ref, engine.exactRef(record), `${label}: exact experiment reference drift`);
  assert.equal(run.experiment_sha256, engine.digest(record), `${label}: experiment digest drift`);
  assert.equal(run.engine_artifact_sha256, fixture.engine_artifact.sha256, `${label}: run engine artifact binding drift`);
  if (expected.result_sha256) assert.equal(engine.digest(run.result), expected.result_sha256, `${label}: result fixture drift`);
  assert.equal(run.result.complete, expected.complete, `${label}: completion-state drift`);
  assert.equal(run.result.stopped_reason, expected.stopped_reason, `${label}: stop-reason drift`);
  assert.deepEqual(run.result.metrics, expected.metrics, `${label}: metric fixture drift`);
  assert.ok(Array.isArray(run.result.primary), `${label}: kernel omitted primary output`);
  assert.ok(run.result.metrics.states_emitted <= record.run_bounds.max_states, `${label}: max_states exceeded`);
  assert.ok(run.result.metrics.operations_used <= record.run_bounds.max_operations, `${label}: max_operations exceeded`);
  if (typeof run.result.metrics.steps === 'number') assert.ok(run.result.metrics.steps <= record.run_bounds.steps, `${label}: step bound exceeded`);
  observations.forEach((value, index) => verifyObservation(value, record, `${label}/observation-${index}`, embedded));
}

let assertions = 0;
for (const item of fixture.runs) {
  const label = `run/${item.id}`;
  const record = experiment(item.experiment, label);
  const recordBefore = canonical(record);
  const overrides = clone(item.overrides);
  const overridesBefore = canonical(overrides);
  const first = engine.runExperiment(record, overrides);
  const second = engine.runExperiment(record, clone(item.overrides));
  assert.equal(canonical(first), canonical(second), `${label}: identical runs are not deterministic`);
  assert.equal(canonical(record), recordBefore, `${label}: execution mutated the experiment`);
  assert.equal(canonical(overrides), overridesBefore, `${label}: execution mutated parameter overrides`);
  verifyRunBinding(first, record, item.expected, label);
  assert.deepEqual(first.observations.map(observationSummary), item.expected.observations, `${label}: evidence fixture drift`);
  assertions += 1;
}
assert.equal(new Set(fixture.runs.map(item => experiment(item.experiment, item.id).family)).size, 6, 'default runs must cover six kernels');

for (const item of fixture.run_integrity) {
  const label = `run-integrity/${item.id}`;
  const record = experiment(item.experiment, label);
  const run = engine.runExperiment(record, clone(item.overrides));
  assert.deepEqual(engine.validateRun(run), [], `${label}: pristine run failed validation`);
  const mutated = clone(run);
  if (item.mode === 'stale-body-digest') {
    mutated.result.primary[item.mutated_primary_index] = item.mutated_value;
    const errors = engine.validateRun(mutated);
    assert.ok(errors.some(error => error.toLowerCase().includes(item.message.toLowerCase())), `${label}: mutation was not detected by validateRun`);
    assert.throws(
      () => engine.observerSwitch(mutated, {kind: 'identity', parameters: {}}, {kind: 'parity', parameters: {}}),
      error => error instanceof Error && error.message.toLowerCase().includes(item.message.toLowerCase()),
      `${label}: observerSwitch accepted a mutated run with a stale content address`
    );
  } else if (item.mode === 'readdressed-replay-mismatch') {
    mutated.result.primary[item.mutated_primary_index] = item.mutated_value;
    refreshRunBindings(mutated);
    assert.deepEqual(engine.validateRun(mutated), [], `${label}: self-consistent mutated envelope should reach experiment replay validation`);
    const errors = engine.validateRunAgainstExperiment(record, mutated);
    assert.ok(errors.some(error => error.toLowerCase().includes(item.message.toLowerCase())), `${label}: deterministic experiment replay accepted mutated result`);
    assert.throws(
      () => engine.analyzeRun(record, mutated),
      error => error instanceof Error && error.message.toLowerCase().includes(item.message.toLowerCase()),
      `${label}: analyzeRun accepted mutated deterministic output`
    );
  } else if (item.mode === 'readdressed-observation-forgery') {
    mutated.observations[0].claim_scope += ' forged';
    readdressObservation(mutated.observations[0]);
    assert.deepEqual(engine.validateRun(mutated), [], `${label}: structurally self-consistent forged observation should reach analyzer replay`);
    const errors = engine.validateRunAgainstExperiment(record, mutated);
    assert.ok(errors.some(error => error.toLowerCase().includes(item.message.toLowerCase())), `${label}: analyzer replay accepted forged observation`);
    assert.throws(
      () => engine.analyzeRun(record, mutated),
      error => error instanceof Error && error.message.toLowerCase().includes(item.message.toLowerCase()),
      `${label}: analyzeRun returned forged observation`
    );
  } else throw new Error(`${label}: unknown integrity mode ${item.mode}`);
  assertions += 1;
}

for (const item of fixture.experiment_validation_errors) {
  const label = `experiment-validation/${item.id}`;
  const record = experiment(item.experiment, label);
  if (item.mutation === 'id-array') record.id = [record.id];
  else if (item.mutation === 'artifact-hash-array') record.executable.artifact_sha256 = [record.executable.artifact_sha256];
  else if (item.mutation === 'date-array') record.provenance.created = [record.provenance.created];
  else throw new Error(`${label}: unknown experiment mutation ${item.mutation}`);
  const errors = engine.validateExperiment(record);
  assert.ok(errors.some(error => error.toLowerCase().includes(item.message.toLowerCase())), `${label}: array-to-string coercion was accepted`);
  assertions += 1;
}

for (const item of fixture.run_validation_errors) {
  const label = `run-validation/${item.id}`;
  const record = experiment(item.experiment, label);
  const run = engine.runExperiment(record, {});
  assert.deepEqual(engine.validateRun(run), [], `${label}: pristine run failed validation`);
  const mutated = clone(run);
  const observation = mutated.observations[0];
  if (item.mutation === 'run-ref-array') mutated.experiment_ref = [mutated.experiment_ref];
  else if (item.mutation === 'experiment-hash-array') mutated.experiment_sha256 = [mutated.experiment_sha256];
  else if (item.mutation === 'engine-hash-array') mutated.engine_artifact_sha256 = [mutated.engine_artifact_sha256];
  else if (item.mutation === 'run-hash-array') mutated.run_sha256 = [mutated.run_sha256];
  else if (item.mutation === 'observation-id-array') observation.id = [observation.id];
  else if (item.mutation === 'observation-analyzer-hash-array') { observation.analyzer_artifact_sha256 = [observation.analyzer_artifact_sha256]; readdressObservation(observation); }
  else if (item.mutation === 'observation-body-with-stale-id') observation.claim_scope += ' mutated';
  else if (item.mutation === 'observation-run-binding') { observation.run_sha256 = '0'.repeat(64); readdressObservation(observation); }
  else if (item.mutation === 'observation-experiment-binding') { observation.subject = 'qeva-experiment:1:other@1'; readdressObservation(observation); }
  else if (item.mutation === 'observation-analyzer-digest') { observation.analyzer_artifact_sha256 = '0'.repeat(64); readdressObservation(observation); }
  else if (item.mutation === 'observation-evidence-enum') { observation.evidence_class = 'invalid'; readdressObservation(observation); }
  else if (item.mutation === 'observation-status-enum') { observation.status = 'invalid'; readdressObservation(observation); }
  else if (item.mutation === 'observation-proof-enum') { observation.proof_status = 'invalid'; readdressObservation(observation); }
  else if (item.mutation === 'observation-reproducibility-engine') { observation.reproducibility.engine = 'Other Engine'; readdressObservation(observation); }
  else if (item.mutation === 'observation-reproducibility-seed') { observation.reproducibility.seed = {invalid: true}; readdressObservation(observation); }
  else if (item.mutation === 'observation-reproducibility-semantics') { observation.reproducibility.numeric_semantics = ''; readdressObservation(observation); }
  else if (item.mutation === 'observation-reproducibility-bounds') { observation.reproducibility.bounds = []; readdressObservation(observation); }
  else if (item.mutation === 'result-missing-complete') { delete mutated.result.complete; refreshRunBindings(mutated); }
  else if (item.mutation === 'result-missing-stopped-reason') { delete mutated.result.stopped_reason; refreshRunBindings(mutated); }
  else if (item.mutation === 'result-missing-primary') { delete mutated.result.primary; refreshRunBindings(mutated); }
  else if (item.mutation === 'result-missing-metrics') { delete mutated.result.metrics; refreshRunBindings(mutated); }
  else if (item.mutation === 'result-extra-array-over-limit') { mutated.result.extra = new Array(10001).fill(0); refreshRunBindings(mutated); }
  else if (item.mutation === 'metrics-states-over-limit') { mutated.result.metrics.states_emitted = 10001; refreshRunBindings(mutated); }
  else if (item.mutation === 'metrics-states-negative') { mutated.result.metrics.states_emitted = -1; refreshRunBindings(mutated); }
  else if (item.mutation === 'metrics-operations-over-limit') { mutated.result.metrics.operations_used = 100001; refreshRunBindings(mutated); }
  else if (item.mutation === 'metrics-operations-fractional') { mutated.result.metrics.operations_used = 1.5; refreshRunBindings(mutated); }
  else throw new Error(`${label}: unknown run mutation ${item.mutation}`);
  const errors = engine.validateRun(mutated);
  assert.ok(errors.some(error => error.toLowerCase().includes(item.message.toLowerCase())), `${label}: malformed run was accepted; got ${errors.join(' | ')}`);
  assert.throws(
    () => engine.analyzeRun(record, mutated),
    error => error instanceof Error && error.message.toLowerCase().includes(item.message.toLowerCase()),
    `${label}: analyzeRun accepted a malformed or forged run envelope`
  );
  assertions += 1;
}

for (const item of fixture.observer_switches) {
  const label = `observer/${item.id}`;
  const record = experiment(item.experiment, label);
  const run = engine.runExperiment(record, clone(item.overrides));
  const first = engine.observerSwitch(run, clone(item.left), clone(item.right));
  const second = engine.observerSwitch(run, clone(item.left), clone(item.right));
  assert.equal(canonical(first), canonical(second), `${label}: observer switch is not deterministic`);
  assert.equal(engine.digest(first), item.expected.sha256, `${label}: fixture digest drift`);
  assert.equal(first.same_underlying_run, run.run_sha256, `${label}: observer does not bind exact run`);
  assert.equal(first.same_underlying_run, item.expected.same_underlying_run, `${label}: underlying-run identity drift`);
  assert.equal(first.left.distinct_states, item.expected.left_distinct_states, `${label}: left state count drift`);
  assert.equal(first.right.distinct_states, item.expected.right_distinct_states, `${label}: right state count drift`);
  assert.equal(first.disagreement_count, item.expected.disagreement_count, `${label}: disagreement count drift`);
  assert.equal(first.left.values.length, first.right.values.length, `${label}: observers inspected different emitted states`);
  assertions += 1;
}

for (const item of fixture.observer_errors) {
  const label = `observer-error/${item.id}`;
  const record = experiment(item.experiment, label);
  let run = engine.runExperiment(record, {});
  if (item.mutate_primary_to) {
    run = clone(run);
    run.result.primary[0] = materializeSpecial(item.mutate_primary_to);
  }
  const observer = materializeSpecial(item.observer);
  assert.throws(
    () => engine.observerSwitch(run, observer, {kind: 'identity', parameters: {}}),
    error => error instanceof Error && error.message.toLowerCase().includes(item.message.toLowerCase()),
    `${label}: malformed observer input was accepted`
  );
  assertions += 1;
}

for (const item of fixture.bigint_observers) {
  const label = `bigint-observer/${item.id}`;
  const run = syntheticRun(item.values);
  assert.deepEqual(engine.validateRun(run), [], `${label}: synthetic exact-integer run is invalid`);
  const output = engine.observerSwitch(run, clone(item.left), clone(item.right));
  assert.equal(engine.digest(output), item.expected.sha256, `${label}: exact BigInt observer digest drift`);
  assert.equal(output.same_underlying_run, run.run_sha256, `${label}: exact run binding drift`);
  assert.deepEqual(output.left.values, item.expected.left_values, `${label}: >2^53 parity drift`);
  assert.deepEqual(output.right.values, item.expected.right_values, `${label}: >2^53 remainder drift`);
  assert.equal(output.disagreement_count, item.expected.disagreement_count, `${label}: disagreement drift`);
  assertions += 1;
}

for (const item of fixture.functional_graphs) {
  const label = `functional-graph/${item.id}`;
  const record = experiment(item.experiment, label);
  const first = engine.runExperiment(record, clone(item.overrides)).result.graph;
  const second = engine.runExperiment(record, clone(item.overrides)).result.graph;
  const generalizedTable = engine.parseTable(item.overrides.table);
  assert.equal(generalizedTable.length, item.expected.table_length, `${label}: generalized table length drift`);
  assert.ok(generalizedTable.length > 8, `${label}: regression fixture no longer exceeds the original fixed eight-state model`);
  assert.equal(canonical(first), canonical(second), `${label}: graph construction is not deterministic`);
  assert.equal(engine.digest(first), item.expected.sha256, `${label}: graph fixture digest drift`);
  assert.deepEqual(first.cycles, item.expected.cycles, `${label}: locale-independent cycle order drift`);
  assert.equal(first.components, item.expected.components, `${label}: component count drift`);
  assert.deepEqual(first.fixed_points, item.expected.fixed_points, `${label}: fixed-point order drift`);
  assertions += 1;
}

for (const item of fixture.structural_diffs) {
  const label = `structural-diff/${item.id}`;
  const left = clone(item.left), right = clone(item.right);
  const leftBefore = engine.canonical(left), rightBefore = engine.canonical(right);
  const first = engine.structuralDiff(left, right);
  const second = engine.structuralDiff(
    Object.fromEntries(Object.entries(left).reverse()),
    Object.fromEntries(Object.entries(right).reverse())
  );
  assert.deepEqual(first, item.expected.changes, `${label}: exact structural changes drift`);
  assert.deepEqual(second, first, `${label}: diff depends on insertion order`);
  assert.equal(engine.digest(first), item.expected.sha256, `${label}: structural-diff digest drift`);
  assert.doesNotThrow(() => engine.canonical(first), `${label}: additions/removals produced noncanonical output`);
  assert.equal(engine.canonical(left), leftBefore, `${label}: diff mutated left input`);
  assert.equal(engine.canonical(right), rightBefore, `${label}: diff mutated right input`);
  const paths = first.map(change => change.path);
  assert.deepEqual(paths, item.required_paths, `${label}: RFC 6901 path set/order drift`);
  assert.equal(new Set(paths).size, paths.length, `${label}: distinct source paths collided`);
  first.forEach(change => {
    assert.equal(typeof change.before_present, 'boolean', `${label}: missing before-presence flag`);
    assert.equal(typeof change.after_present, 'boolean', `${label}: missing after-presence flag`);
    assert.ok(Object.hasOwn(change, 'before') && Object.hasOwn(change, 'after'), `${label}: add/remove omitted canonical null placeholder`);
  });
  assertions += 1;
}

for (const item of fixture.trace_comparisons) {
  const label = `trace-comparison/${item.id}`;
  const record = experiment(item.experiment, label);
  const left = engine.runExperiment(record, clone(item.left_overrides));
  const right = engine.runExperiment(record, clone(item.right_overrides));
  assert.equal(left.run_sha256, item.expected.left_run_sha256, `${label}: baseline run drift`);
  assert.equal(right.run_sha256, item.expected.right_run_sha256, `${label}: current run drift`);
  assert.notEqual(left.run_sha256, right.run_sha256, `${label}: different traces share a run content address`);
  assert.deepEqual(left.result.metrics, right.result.metrics, `${label}: fixture no longer isolates equal metrics`);
  assert.equal(engine.digest(left.result.metrics), item.expected.metrics_sha256, `${label}: equal-metric fixture drift`);
  assert.notDeepEqual(left.result.primary, right.result.primary, `${label}: primary traces unexpectedly match`);
  assert.notDeepEqual(left.result.transcript, right.result.transcript, `${label}: transcripts unexpectedly match`);
  const first = engine.compareRuns(record, left, record, right);
  const second = engine.compareRuns(record, left, record, right);
  assert.equal(engine.canonical(first), engine.canonical(second), `${label}: comparison is not deterministic`);
  assert.equal(engine.digest(first), item.expected.sha256, `${label}: comparison digest drift`);
  assert.deepEqual(first, item.expected.comparison, `${label}: comparison fixture drift`);
  assert.equal(first.inputs_equal, false, `${label}: parameter change was hidden`);
  assert.equal(first.results_equal, false, `${label}: differing traces were hidden by equal metrics`);
  assert.deepEqual(first.input_changes, [], `${label}: unchanged experiment record was reported changed`);
  assert.deepEqual(first.parameter_changes.map(change => change.path), item.required_parameter_paths, `${label}: parameter path drift`);
  assert.deepEqual(first.output_changes.map(change => change.path), item.required_output_paths, `${label}: trace path drift`);
  assert.ok(first.output_changes.every(change => !change.path.startsWith('/metrics/')), `${label}: equal metrics were reported changed`);
  assert.equal(first.base_result_sha256 === first.current_result_sha256, false, `${label}: distinct result bodies share a digest`);
  assert.equal(first.input_changes_truncated || first.parameter_changes_truncated || first.output_changes_truncated, false, `${label}: small comparison was truncated`);
  assert.equal(first.change_limit_per_section, engine.MAX_DIFF_CHANGES, `${label}: comparison limit metadata drift`);
  assertions += 1;
}

for (const item of fixture.diffs) {
  const label = `diff/${item.id}`;
  const record = experiment(item.experiment, label);
  const baseRun = engine.runExperiment(record, {});
  const fork = engine.forkExperiment(record, clone(item.fork_parameters), undefined, item.date);
  assert.equal(fork.provenance.parent, engine.exactRef(record), `${label}: fork ancestry drift`);
  assert.equal(fork.id, item.expected.fork_id, `${label}: fork content identity drift`);
  assert.equal(engine.digest(fork), item.expected.fork_sha256, `${label}: fork fixture digest drift`);
  assert.deepEqual(engine.validateExperiment(fork), [], `${label}: generated fork violates engine contract`);
  const forkRun = engine.runExperiment(fork, {});
  const comparison = engine.compareRuns(record, baseRun, fork, forkRun);
  assert.equal(engine.digest(comparison), item.expected.comparison_sha256, `${label}: comparison fixture digest drift`);
  assert.deepEqual(comparison.input_changes.map(change => change.path), item.expected.input_paths, `${label}: changed-input path drift`);
  assert.deepEqual(comparison.output_changes, item.expected.output_changes, `${label}: changed-output metric drift`);
  assertions += 1;
}

for (const item of fixture.sweeps) {
  const label = `sweep/${item.id}`;
  const record = experiment(item.experiment, label);
  const first = engine.parameterSweep(record, item.parameter, item.minimum, item.maximum, item.samples, clone(item.overrides));
  const second = engine.parameterSweep(record, item.parameter, item.minimum, item.maximum, item.samples, clone(item.overrides));
  assert.equal(canonical(first), canonical(second), `${label}: sweep is not deterministic`);
  assert.equal(engine.digest(first), item.expected.sha256, `${label}: sweep fixture digest drift`);
  assert.equal(first.sweep_version, '0.2', `${label}: unsupported sweep provenance contract`);
  assert.equal(first.sweep_version, item.expected.sweep_version, `${label}: sweep version drift`);
  assert.equal(first.experiment_ref, engine.exactRef(record), `${label}: exact experiment reference drift`);
  assert.equal(first.experiment_sha256, engine.digest(record), `${label}: experiment digest binding drift`);
  assert.equal(first.experiment_sha256, item.expected.experiment_sha256, `${label}: experiment digest fixture drift`);
  assert.deepEqual(first.base_parameters, item.expected.base_parameters, `${label}: base parameter fixture drift`);
  assert.ok(!Object.hasOwn(first.base_parameters, item.parameter), `${label}: base parameters hide a value for the swept parameter`);
  const normalizedBase = engine.normalizeParameters(record, clone(item.overrides));
  delete normalizedBase[item.parameter];
  assert.deepEqual(first.base_parameters, normalizedBase, `${label}: disclosed base parameters do not match normalized overrides`);
  assert.equal(first.requested_samples, item.expected.requested_samples, `${label}: requested sample drift`);
  assert.equal(first.samples, item.expected.samples, `${label}: effective sample drift`);
  assert.equal(first.stopped_reason, item.expected.stopped_reason, `${label}: sweep stop-reason drift`);
  assert.deepEqual(first.limiting_factors, item.expected.limiting_factors, `${label}: limiting-factor drift`);
  assert.deepEqual(first.rows, item.expected.rows, `${label}: sweep rows drift`);
  assert.ok(first.rows.length <= engine.MAX_SWEEP_SAMPLES, `${label}: hard sample bound exceeded`);
  assert.equal(first.rows.length, first.samples, `${label}: effective sample count disagrees with rows`);
  assert.ok(first.rows.every(row => row.value >= item.minimum && row.value <= item.maximum), `${label}: sampled value escaped requested range`);
  first.rows.forEach((row, index) => {
    assert.equal(row.run_parameters[item.parameter], row.value, `${label}/row-${index}: swept value and run parameters disagree`);
    assert.deepEqual(
      Object.fromEntries(Object.entries(row.run_parameters).filter(([key]) => key !== item.parameter)),
      first.base_parameters,
      `${label}/row-${index}: hidden base-parameter drift`
    );
    const replay = engine.runExperiment(record, clone(row.run_parameters));
    assert.equal(replay.run_sha256, row.run_sha256, `${label}/row-${index}: recorded run cannot be replayed`);
    assert.deepEqual(replay.result.metrics, row.result_metrics, `${label}/row-${index}: recorded result metrics cannot be replayed`);
    assert.equal(sweepMetric(record, replay), row.metric, `${label}/row-${index}: recorded metric cannot be replayed`);
    assert.equal(replay.result.complete, row.complete, `${label}/row-${index}: completion state cannot be replayed`);
    assert.equal(replay.result.stopped_reason, row.stopped_reason, `${label}/row-${index}: stop reason cannot be replayed`);
  });
  if (item.invariant === 'sample-limit') {
    assert.equal(first.stopped_reason, 'sample-limit-bound', `${label}: hard sweep cap has the wrong stop reason`);
    assert.equal(first.samples, engine.MAX_SWEEP_SAMPLES, `${label}: sample cap was not exact`);
    assert.equal(first.rows[0].value, item.minimum, `${label}: lower endpoint omitted`);
    assert.equal(first.rows.at(-1).value, item.maximum, `${label}: upper endpoint omitted`);
    assert.equal(new Set(first.rows.map(row => row.value)).size, first.rows.length, `${label}: real-valued sweep duplicated samples`);
  }
  if (item.invariant === 'integer-domain-unique') {
    const expectedValues = Array.from({length: item.maximum - item.minimum + 1}, (_, index) => item.minimum + index);
    assert.equal(first.stopped_reason, 'parameter-domain-bound', `${label}: finite integer domain has the wrong stop reason`);
    assert.deepEqual(first.rows.map(row => row.value), expectedValues, `${label}: integer sweep duplicated or omitted domain values`);
    assert.equal(new Set(first.rows.map(row => row.value)).size, first.rows.length, `${label}: integer sweep contains duplicates`);
  }
  assertions += 1;
}

assert.equal(fixture.attacks.length, 6, 'fixtures must include all six default attacks');
const attackFamilies = new Set();
for (const item of fixture.attacks) {
  const label = `attack/${item.id}`;
  const record = experiment(item.experiment, label);
  attackFamilies.add(record.family);
  assert.deepEqual(item.options, {}, `${label}: this case must exercise default attack configuration`);
  const first = engine.attack(record, clone(item.options));
  const second = engine.attack(record, clone(item.options));
  assert.equal(canonical(first), canonical(second), `${label}: attack is not deterministic`);
  assert.equal(engine.digest(first), item.expected.sha256, `${label}: attack fixture digest drift`);
  assert.equal(first.observation.evidence_class, item.expected.evidence_class, `${label}: evidence class drift`);
  assert.equal(first.observation.status, item.expected.status, `${label}: result status drift`);
  assert.equal(first.observation.proof_status, item.expected.proof_status, `${label}: proof status drift`);
  assert.deepEqual(first.observation.result, item.expected.result, `${label}: attack result drift`);
  verifyObservation(first.observation, record, label, first.observation.result.run_sha256 || null);
  if (first.observation.status === 'counterexample') assert.notEqual(first.observation.result.witness, null, `${label}: counterexample has no witness`);
  assertions += 1;
}
assert.equal(attackFamilies.size, 6, 'default attacks do not cover all six experiment families');

for (const item of fixture.attack_limits) {
  const label = `attack-limit/${item.id}`;
  const record = experiment(item.experiment, label);
  const first = engine.attack(record, clone(item.options));
  const second = engine.attack(record, clone(item.options));
  assert.equal(canonical(first), canonical(second), `${label}: bounded attack is not deterministic`);
  assert.equal(engine.digest(first), item.expected.sha256, `${label}: attack-limit fixture digest drift`);
  assert.equal(first.observation.evidence_class, item.expected.evidence_class, `${label}: evidence class drift`);
  assert.equal(first.observation.status, item.expected.status, `${label}: status drift`);
  assert.equal(first.observation.proof_status, item.expected.proof_status, `${label}: proof status drift`);
  assert.deepEqual(first.observation.result, item.expected.result, `${label}: bounded attack result drift`);
  assert.match(first.observation.result.stopped_reason, /^(aggregate-operation|per-case-resource)-bound$/, `${label}: attack did not expose its resource stop`);
  verifyObservation(first.observation, record, label, null);
  assertions += 1;
}

for (const item of fixture.attack_variants) {
  const label = `attack-variant/${item.id}`;
  const record = experiment(item.experiment, label);
  const first = engine.attack(record, clone(item.options));
  const second = engine.attack(record, clone(item.options));
  assert.equal(engine.canonical(first), engine.canonical(second), `${label}: attack is not deterministic`);
  assert.equal(engine.digest(first), item.expected.sha256, `${label}: attack digest drift`);
  assert.deepEqual(first.observation.parameters, item.expected.observation_parameters, `${label}: effective attack parameters drift`);
  assert.equal(first.observation.run_sha256, item.expected.run_sha256, `${label}: supporting run binding drift`);
  assert.equal(first.observation.evidence_class, item.expected.evidence_class, `${label}: evidence class drift`);
  assert.equal(first.observation.status, item.expected.status, `${label}: status drift`);
  assert.equal(first.observation.proof_status, item.expected.proof_status, `${label}: proof status drift`);
  assert.deepEqual(first.observation.result, item.expected.result, `${label}: result drift`);
  verifyObservation(first.observation, record, label, item.expected.run_sha256);
  if (item.invariant === 'optimization-steps') {
    assert.equal(first.observation.parameters.requested_steps, item.options.steps, `${label}: requested steps were not recorded`);
    assert.equal(first.observation.parameters.effective_steps, item.options.steps, `${label}: requested steps were not executed`);
    assert.equal(first.observation.result.values_checked, item.options.steps + 1, `${label}: optimization trace length ignores requested steps`);
    assert.equal(first.observation.result.run_sha256, first.observation.run_sha256, `${label}: observation/result supporting run mismatch`);
  }
  if (item.invariant === 'early-witness') {
    const tableLength = Array.isArray(item.options.table) ? item.options.table.length : item.options.table.split(',').length;
    assert.equal(first.observation.status, 'counterexample', `${label}: witness did not refute bounded claim`);
    assert.equal(first.observation.result.stopped_reason, 'counterexample-found', `${label}: early witness stop reason is misleading`);
    assert.ok(first.observation.result.witness, `${label}: counterexample lacks witness`);
    assert.ok(first.observation.result.states_checked < tableLength, `${label}: attack did not stop at first witness`);
  }
  assertions += 1;
}

for (const item of fixture.fork_variants) {
  const label = `fork-variant/${item.id}`;
  const record = experiment(item.experiment, label);
  const recordBefore = engine.canonical(record);
  const observer = item.observer === null ? undefined : clone(item.observer);
  const first = engine.forkExperiment(record, clone(item.parameters), observer, item.date);
  const second = engine.forkExperiment(record, clone(item.parameters), observer, item.date);
  assert.equal(engine.canonical(first), engine.canonical(second), `${label}: explicit-date fork is not deterministic`);
  assert.equal(engine.canonical(record), recordBefore, `${label}: fork mutated source experiment`);
  assert.deepEqual(engine.validateExperiment(first), [], `${label}: generated fork is invalid`);
  assert.equal(first.id, item.expected.id, `${label}: content-derived fork id drift`);
  assert.equal(engine.digest(first), item.expected.sha256, `${label}: fork digest drift`);
  assert.equal(first.provenance.parent, engine.exactRef(record), `${label}: fork ancestry drift`);
  assert.equal(first.provenance.created, item.date, `${label}: explicit fork date drift`);
  assert.deepEqual(engine.parameterDefaults(first), item.expected.parameters, `${label}: normalized parameter defaults drift`);
  assert.deepEqual(first.observer, item.expected.observer, `${label}: observer drift`);
  assert.equal(first.update.schedule, item.expected.update_schedule, `${label}: derived schedule drift`);
  if (item.invariant === 'optimization-schedule') {
    assert.equal(first.update.schedule, 'steps sequential proposals', `${label}: optimization schedule is not tied to the declared steps parameter`);
    assert.equal(engine.parameterDefaults(first).steps, item.parameters.steps, `${label}: forked steps default drift`);
  }
  if (item.invariant === 'finite-short-table') {
    const table = first.parameters.find(parameter => parameter.id === 'table');
    const start = first.parameters.find(parameter => parameter.id === 'start');
    const forkBytes = engine.canonical(first);
    const detachedDefaults = engine.parameterDefaults(first);
    assert.ok(Array.isArray(detachedDefaults.table), `${label}: table default was not cloned as an array`);
    detachedDefaults.table[0] = 999;
    detachedDefaults.table.push(999);
    assert.equal(engine.canonical(first), forkBytes, `${label}: mutating parameterDefaults(...).table mutated the fork`);
    assert.deepEqual(table.default, item.parameters.table, `${label}: short transition table drift`);
    assert.equal(start.default, item.parameters.start, `${label}: start default drift`);
    assert.ok(start.default < item.parameters.table.length, `${label}: start default escapes the effective table`);
    assert.match(table.description, /^N transition entries/, `${label}: table description lost the variable-length contract`);
    assert.match(table.description, new RegExp(`default has ${item.parameters.table.length} states`), `${label}: table description contradicts effective default length`);
    assert.deepEqual(first.state_space, item.expected.state_space, `${label}: derived finite state-space drift`);
    assert.deepEqual(first.boundary_conditions, item.expected.boundary_conditions, `${label}: derived finite boundary conditions drift`);
  }
  assertions += 1;
}

assert.equal(fixture.resource_stops.length, 6, 'resource-stop fixtures must cover all six kernels');
const stoppedFamilies = new Set();
for (const item of fixture.resource_stops) {
  const label = `resource/${item.id}`;
  const record = experiment(item.experiment, label);
  record.run_bounds = clone(item.run_bounds);
  for (const [parameterId, patch] of Object.entries(item.parameter_patches || {})) {
    Object.assign(record.parameters.find(parameter => parameter.id === parameterId), clone(patch));
  }
  stoppedFamilies.add(record.family);
  assert.deepEqual(engine.validateExperiment(record), [], `${label}: bounded experiment is invalid`);
  const first = engine.runExperiment(record, clone(item.overrides));
  const second = engine.runExperiment(record, clone(item.overrides));
  assert.equal(canonical(first), canonical(second), `${label}: stopped run is not deterministic`);
  verifyRunBinding(first, record, item.expected, label);
  assert.equal(first.result.complete, false, `${label}: fixture did not force an incomplete bounded run`);
  assert.match(first.result.stopped_reason, /^(step|state|operation)-bound$/, `${label}: not a resource stop`);
  assertions += 1;
}
assert.equal(stoppedFamilies.size, 6, 'resource stops do not cover all six experiment families');

for (const item of fixture.canonical_rejections) {
  assert.throws(
    () => engine.canonical(item.value),
    error => error instanceof Error && error.message.toLowerCase().includes(item.message.toLowerCase()),
    `canonical/${item.id}: unsafe integer-valued number was accepted`
  );
  assertions += 1;
}
for (const item of fixture.canonical_acceptances) {
  assert.equal(engine.canonical(item.value), item.canonical, `canonical/${item.id}: accepted value drift`);
  assertions += 1;
}

for (const item of fixture.normalizations) {
  const label = `normalize/${item.id}`;
  const record = experiment(item.experiment, label);
  assert.deepEqual(engine.normalizeParameters(record, clone(item.overrides)), item.expected, `${label}: normalization drift`);
  assertions += 1;
}

for (const item of fixture.errors) {
  const label = `error/${item.id}`;
  let callable;
  if (item.call === 'run') {
    const record = experiment(item.experiment, label);
    callable = () => engine.runExperiment(record, clone(item.overrides));
  } else if (item.call === 'parse-table') {
    callable = () => engine.parseTable(item.value);
  } else if (item.call === 'sweep') {
    const record = experiment(item.experiment, label);
    callable = () => engine.parameterSweep(
      record, item.parameter, item.minimum, item.maximum, item.samples, clone(item.overrides)
    );
  } else if (item.call === 'attack') {
    const record = experiment(item.experiment, label);
    callable = () => engine.attack(record, clone(item.options));
  } else if (item.call === 'fork') {
    const record = experiment(item.experiment, label);
    const observer = Object.hasOwn(item, 'observer') ? clone(item.observer) : undefined;
    callable = () => engine.forkExperiment(record, clone(item.parameters), observer, item.date);
  } else {
    throw new Error(`${label}: unsupported error-fixture call ${item.call}`);
  }
  assert.throws(
    callable,
    error => error instanceof Error && error.message.toLowerCase().includes(item.message.toLowerCase()),
    `${label}: expected bounded engine rejection`
  );
  assertions += 1;
}

for (const [name, maximum] of Object.entries(fixture.hard_limits)) {
  const record = experiment(fixture.runs[0].experiment, `hard-limit/${name}`);
  const field = name === 'states' ? 'max_states' : name === 'operations' ? 'max_operations' : name;
  record.run_bounds[field] = maximum + 1;
  assert.ok(engine.validateExperiment(record).some(message => message.includes('Invalid or unsafe run bounds')), `hard-limit/${name}: validator accepted a bound above the immutable ceiling`);
  assertions += 1;
}

console.log(`engine fixtures PASS — ${assertions} cases; six kernels, six default attacks, six resource stops, ${analyzerArtifacts.size} raw analyzer bindings`);
