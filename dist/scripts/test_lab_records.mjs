#!/usr/bin/env node
/** Local records: strict parsing, aggregate replay, tamper rejection and storage failure. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engine = require(path.join(root, 'assets/mechanism-engine.js'));
const records = require(path.join(root, 'assets/lab-records.js'));
const experiments = fs.readdirSync(path.join(root, 'experiments/records')).filter(n => n.endsWith('.json')).map(n => JSON.parse(fs.readFileSync(path.join(root, 'experiments/records', n), 'utf8')));
const hash = experiments[0].executable.artifact_sha256;
let checks = 0;
function ok(condition) { assert.ok(condition); checks += 1; }
function rejects(fn, pattern) { assert.throws(fn, pattern); checks += 1; }
for (const input of ['{"a":1,"a":2}', '[1,]', '1e9999', '['.repeat(70)+'0'+']'.repeat(70), '{"__proto__":{"x":1},"__proto__":{}}', '{"a":NaN}', 'true false']) rejects(() => records.parse(input));
ok(records.parse('{"__proto__":1}').__proto__ === 1);
ok(records.parse('{"value":[-2.5,true,null,"α"]}').value[3] === 'α');
rejects(() => records.parse(' '.repeat(records.MAX_BYTES + 1)));
const sessions = [];
for (const e of experiments) {
  const run = engine.runExperiment(e, engine.parameterDefaults(e));
  const decoded = records.decode(JSON.stringify(e), engine, hash);
  ok(decoded.experiment.id === e.id);
  const modes = [
    ['run', {}, null],
    ['diff', {base_experiment:e}, engine.compareRuns(e, run, e, run)],
    ['observer', {left:{kind:'identity',parameters:{}},right:{kind:'identity',parameters:{}}},engine.observerSwitch(run,{kind:'identity',parameters:{}},{kind:'identity',parameters:{}})],
    ['attack', {}, engine.attack(e,{})]
  ];
  const param = e.parameters.find(p => ['integer','number'].includes(p.type) && p.max > p.min && p.id !== 'start');
  if (param) {
    const minimum = param.min, maximum = Math.min(param.max, param.type === 'integer' ? minimum + 2 : minimum + (param.max-minimum)/10);
    const opts = {parameter:param.id,minimum,maximum,samples:2,overrides:{}};
    modes.push(['sweep', opts, engine.parameterSweep(e,param.id,minimum,maximum,2,{})]);
  }
  for (const [mode,opts,analysis] of modes) {
    const session = {local_export_version:'0.2',mode,experiment:e,run,analysis,analysis_options:opts};
    const restored = records.decode(JSON.stringify(session),engine,hash);
    ok(restored.analysis_verified && engine.digest(restored.session) === engine.digest(session));
    sessions.push(session);
    if (mode !== 'run') {
      const changed = structuredClone(session); changed.analysis.extra = 'tampered';
      rejects(() => records.decode(changed,engine,hash), /analysis does not match/);
    }
  }
  const bad = {local_export_version:'0.2',mode:'run',experiment:e,run:structuredClone(run),analysis:null,analysis_options:{}};
  bad.run.result.metrics.forged = 1;
  rejects(() => records.decode(bad,engine,hash), /replay failed/);
  rejects(() => records.decode(e,engine,'0'.repeat(64)), /different engine/);
}
const legacy = structuredClone(sessions.find(s=>s.mode==='sweep'));
legacy.local_export_version='0.1';delete legacy.analysis_options;
ok(!records.decode(legacy,engine,hash).analysis_verified);
const finite = experiments.find(e => e.executable.kernel === 'finite-map');
const sweep = engine.parameterSweep(finite,'start',0,7,20,{});
ok(records.outcome('sweep',engine.runExperiment(finite,{}),sweep).includes('8/20'));
ok(records.outcome('attack',null,{observation:{status:'counterexample'}})==='counterexample to stated claim');
function memory() { const m=new Map(); return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),clear:()=>m.clear(),m}; }
const storage = memory(), store = records.createStore(storage,engine,hash), session=sessions[0];
const id=store.save(session,'First record','A note');ok(store.list().length===1);ok(store.load(id).notes==='A note');
ok(store.save(session,'First record','A note')===id);ok(store.list().length===1);
const reopened = records.createStore(storage,engine,hash);ok(reopened.load(id).record.mode===session.mode);
for (let i=1;i<30;i++) store.save(session,`record ${i}`,'');
rejects(()=>store.save(session,'too many',''),/at most 30/);
store.remove(id);ok(store.list().length===29);rejects(()=>store.load(id),/not found/);
const blocked = records.createStore({getItem:()=>null,setItem:()=>{throw Error('quota');}},engine,hash);
rejects(()=>blocked.save(session,'x',''),/full or blocked/);
const damaged = records.createStore({getItem:()=>'{bad',setItem:()=>{throw Error('must not write');}},engine,hash);
rejects(()=>damaged.save(session,'x',''),/not overwritten/);
const altered=memory(),st=records.createStore(altered,engine,hash),aid=st.save(session,'x','');
const [key,raw]=[...altered.m.entries()][0], parsed=JSON.parse(raw);parsed.entries[0].notes='changed';altered.setItem(key,JSON.stringify(parsed));
rejects(()=>st.load(aid),/digest mismatch/);
console.log(`QEVA local-record tests: ${checks} assertions passed; ${sessions.length} replayable mode records.`);
