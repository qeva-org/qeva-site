/* Run with node --test tests/engine.test.js. Node built-ins only. MIT. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=require('../assets/learning-engine.js'),K=require('../assets/kernels.js'),S=require('../assets/sandbox-model.js'),Service=require('../assets/services.js');
const ROOT=path.resolve(__dirname,'..'),copy=v=>JSON.parse(JSON.stringify(v));
const load=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const bundle={schema_version:'qeva-learning-bundle/1',...Object.fromEntries(['concepts','activities','routes'].map(f=>[f,fs.readdirSync(path.join(ROOT,'learning',f)).filter(n=>n.endsWith('.json')).sort().map(n=>load('learning/'+f+'/'+n))]))};
const C=new E.Catalog(bundle),now='2026-09-09T00:00:00.000Z';let serial=0;
function good(a){
 const c=a.config;
 if(a.type==='number')return{value:String(c.value)};
 if(a.type==='choice')return{option:c.correct};
 if(a.type==='classification')return{labels:Object.fromEntries(c.items.map(i=>[i.id,i.label]))};
 if(a.type==='order')return{order:c.correct.slice()};
 const runs=Array.from({length:c.minimum_runs},()=>copy(c.parameters));
 if(c.vary){const d=K.definition(c.kernel_ref).parameters[c.vary];runs[1][c.vary]=typeof c.parameters[c.vary]==='string'?'7':c.parameters[c.vary]===d.min?Math.min(d.max,d.min+0.5):d.min;}
 return{runs,conclusion:c.correct};
}
function event(ref,response){return{id:'event-'+(++serial),activity_ref:ref,at:now,response};}
function pass(learner,refs){for(const r of refs)learner.attempts.push(event(r,good(C.activities.get(r))));return learner;}
function state(l,slug,cat=C){return cat.progress(l).states.get(E.ref(cat.get(slug)));}
for(const a of bundle.activities){
 test('valid response: '+E.ref(a),()=>assert.equal(E.assess(a,good(a)).passed,true));
 test('empty response rejected: '+E.ref(a),()=>assert.equal(E.assess(a,{}).passed,false));
}
test('catalog covers five types and two overlapping non-mission routes',()=>{
 assert.deepEqual(new Set(bundle.activities.map(a=>a.type)),new Set(E.types));assert.equal(C.concepts.size,11);assert.equal(C.activities.size,24);assert.equal(C.routes.length,2);
 const p=C.path('chaos').map(E.ref),q=C.path('collatz-conjecture').map(E.ref);assert(p.includes('qeva:learning:recurrence@1'));assert(q.includes('qeva:learning:recurrence@1'));assert(!('activities' in C.routes[0]));
});
test('blank progress has independent roots and locked descendants',()=>{const l=E.blank();assert.equal(state(l,'sequence'),'available');assert.equal(state(l,'parity'),'available');assert.equal(state(l,'chaos'),'locked');assert.equal(C.plan('chaos',l).next.id,'qeva:learning:sequence');});
test('all six states are evidence-derived and failed responses are retained',()=>{
 const l=E.blank(),c=C.get('sequence');l.discoveries.push(E.ref(c));assert.equal(state(l,'sequence'),'discovered');
 l.attempts.push(event(c.activities[0],{value:'17'}));assert.equal(state(l,'sequence'),'learning');
 pass(l,c.mastery.understood);assert.equal(state(l,'sequence'),'understood');assert.equal(state(l,'recurrence'),'available');
 pass(l,c.mastery.mastered);assert.equal(state(l,'sequence'),'mastered');assert.equal(l.attempts.length,3);
 l.attempts.push(event(c.activities[0],{value:'0'}));assert.equal(state(l,'sequence'),'mastered');
});
test('premature advanced evidence is retained but does not bypass prerequisites',()=>{
 const l=E.blank();pass(l,C.get('chaos').activities);assert.equal(state(l,'chaos'),'locked');
 for(const c of C.path('chaos'))pass(l,c.mastery.understood);assert.equal(state(l,'chaos'),'mastered');assert.equal(C.plan('chaos',l).next,null);
});
test('both routes can complete through shared generic assessments',()=>{
 const l=E.blank();for(const a of bundle.activities)l.attempts.push(event(E.ref(a),good(a)));
 assert.equal([...C.progress(l).states.values()].every(s=>s==='mastered'),true);assert.equal(C.plan('collatz-conjecture',l).next,null);
});
test('mastered prerequisite threshold changes routing, not mathematical truth',()=>{
 const b=copy(bundle),rec=b.concepts.find(c=>c.id.endsWith(':recurrence'));rec.prerequisites[0].minimum_state='mastered';const cat=new E.Catalog(b),l=pass(E.blank(),C.get('sequence').mastery.understood);
 assert.equal(state(l,'recurrence',cat),'locked');assert.equal(cat.plan('recurrence',l).next.id,'qeva:learning:sequence');pass(l,C.get('sequence').mastery.mastered);assert.equal(state(l,'recurrence',cat),'available');
});
test('cycle rejected',()=>{const b=copy(bundle);b.concepts.find(c=>c.id.endsWith(':sequence')).prerequisites=[{ref:'qeva:learning:chaos@1',minimum_state:'understood',reason:'test cycle'}];assert.throws(()=>new E.Catalog(b),/cycle/);});
test('missing prerequisite rejected',()=>{const b=copy(bundle);b.concepts[0].prerequisites.push({ref:'qeva:learning:absent@1',minimum_state:'understood',reason:'missing'});assert.throws(()=>new E.Catalog(b),/Missing prerequisite/);});
test('duplicate revision rejected',()=>{const b=copy(bundle);b.activities.push(copy(b.activities[0]));assert.throws(()=>new E.Catalog(b),/Duplicate activity/);});
test('orphan activity rejected',()=>{const b=copy(bundle),a=copy(b.activities[0]);a.id='qeva:activity:orphan';b.activities.push(a);assert.throws(()=>new E.Catalog(b),/Unowned/);});
test('incorrect activity owner rejected',()=>{const b=copy(bundle);b.activities[0].concept_ref='qeva:learning:parity@1';assert.throws(()=>new E.Catalog(b),/different learning profile/);});
test('unsupported type rejected',()=>{const b=copy(bundle);b.activities[0].type='user-js';assert.throws(()=>new E.Catalog(b),/Unsupported activity type/);});
test('empty mastery rubric rejected',()=>{const b=copy(bundle);b.concepts[0].mastery.understood=[];assert.throws(()=>new E.Catalog(b),/may not be empty/);});
test('goal must exist, exact archive aliases resolve',()=>{assert.equal(C.get('qeva:1:chaos@1').id,'qeva:learning:chaos');assert.throws(()=>C.path('unknown'),/does not yet/);});
test('number responses do not treat blank, hex, booleans, NaN, Infinity as zero',()=>{const a=copy(C.activities.get('qeva:activity:sequence-next@1'));a.config.value=0;for(const value of ['', ' ', '0x0','NaN','Infinity',true,null])assert.equal(E.assess(a,{value}).passed,false);assert.equal(E.assess(a,{value:'0e2'}).passed,true);});
test('experiment requires a comparison rather than duplicate runs',()=>{const a=bundle.activities.find(a=>a.type==='experiment'&&a.config.vary);const r=good(a);r.runs[1]=copy(r.runs[0]);assert.equal(E.assess(a,r).passed,false);});
test('experiment rejects altered fixed parameters',()=>{const a=bundle.activities.find(a=>a.type==='experiment'&&Object.keys(a.config.parameters).some(k=>!a.config.editable.includes(k)));const r=good(a),fixed=Object.keys(a.config.parameters).find(k=>!a.config.editable.includes(k));r.runs[0][fixed]+=1;assert.equal(E.assess(a,r).passed,false);});
test('no authoritative state/verification/outcome fields accepted in learner data',()=>{const l=E.blank();l.mastery='all';assert.throws(()=>E.validateLearner(l),/Unexpected/);const n=E.blank();n.attempts=[{...event('qeva:activity:sequence-next@1',{value:'0'}),passed:true}];assert.throws(()=>E.validateLearner(n));});
test('unknown exact revisions retained but grant no progress',()=>{const l=E.blank();l.discoveries=['qeva:learning:future@4'];l.attempts=[event('qeva:activity:sequence-next@99',{value:'16'})];assert.equal(E.validateLearner(l).attempts.length,1);assert.equal(state(l,'sequence'),'available');});
test('learner imports merge idempotently and reject conflicting event IDs',()=>{const a=pass(E.blank(),C.get('sequence').mastery.understood),b=copy(a);assert.equal(E.merge(a,b).attempts.length,1);b.attempts[0].response.value='0';assert.throws(()=>E.merge(a,b),/Conflicting/);});
test('duplicate discoveries/events rejected',()=>{const l=E.blank();l.discoveries=['qeva:learning:sequence@1','qeva:learning:sequence@1'];assert.throws(()=>E.validateLearner(l),/Duplicate discovery/);const n=pass(E.blank(),C.get('sequence').mastery.understood);n.attempts.push(copy(n.attempts[0]));assert.throws(()=>E.validateLearner(n));});
test('learner revision, timestamp, response, and count limits',()=>{for(const mutation of [l=>l.schema_version='qeva-learner/9',l=>l.preferences.goal='<script>',l=>l.attempts=[event('qeva:activity:sequence-next@1',[])],l=>l.attempts=[{...event('qeva:activity:sequence-next@1',{}),at:'yesterday'}],l=>l.attempts=Array(2001).fill(event('qeva:activity:sequence-next@1',{}))]){const l=E.blank();mutation(l);assert.throws(()=>E.validateLearner(l));}});
test('prototype keys, oversized and deeply nested data rejected',()=>{assert.throws(()=>E.parse('{"__proto__":{"polluted":true}}'),/Unsafe/);assert.throws(()=>E.parse('{"constructor":{}}'),/Unsafe/);assert.throws(()=>E.parse(' '.repeat(101),100),/size/);let d={};for(let i=0;i<26;i++)d={nest:d};assert.throws(()=>E.safeData(d),/deep/);assert.equal({}.polluted,undefined);});
for(const [i,v] of load('tests/reference-vectors.json').vectors.entries())test('independent arithmetic reference vector '+(i+1),()=>{const r=K.run(v.kernel_ref,v.parameters);assert.equal(r.status,v.status);assert.deepEqual(r.series,v.series);});
test('logistic rejects invalid pair instead of clamping',()=>{const ref='qeva:kernel:logistic@1';assert.throws(()=>K.run(ref,{r:4,x0:0.99,delta:0.02,steps:10}),/Neither/);assert.equal(K.run(ref,{r:4,x0:0.95,delta:0.05,steps:10}).series[0][2],1);});
test('kernels reject unknown versions, extra keys, fractional steps and nonfinite values',()=>{assert.throws(()=>K.run('qeva:kernel:logistic@99',{}));for(const bad of [{...K.defaults(K.refs[0]),extra:1},{...K.defaults(K.refs[0]),steps:1.5},{...K.defaults(K.refs[0]),a:NaN},{...K.defaults(K.refs[0]),steps:129}])assert.throws(()=>K.run(K.refs[0],bad));});
test('Collatz requires exact positive decimal strings and rejects unsafe input types',()=>{for(const start of [6,'0','-1','01','1.5','1'.repeat(31)])assert.throws(()=>K.run('qeva:kernel:collatz@1',{start,steps:10}));});
test('budget limit is explicitly inconclusive',()=>{const r=K.run('qeva:kernel:collatz@1',{start:'27',steps:2});assert.equal(r.summary.reached_one,false);assert.match(K.explain(r),/Inconclusive, not a counterexample/);});
test('kernel results are deterministic and arguments are unchanged',()=>{for(const ref of K.refs){const p=K.defaults(ref),original=copy(p);assert.deepEqual(K.run(ref,p),K.run(ref,p));assert.deepEqual(p,original);}});
for(const name of ['affine','logistic','collatz','inconclusive'])test('portable specimen reproduces: '+name,()=>{const d=load('sandbox/examples/'+name+'.json');assert.deepEqual(S.validate(d),d);});
test('tampered stored results rejected, not repaired',()=>{const d=load('sandbox/examples/collatz.json');d.runs[0].result.series[0][1]='999';assert.throws(()=>S.validate(d),/does not reproduce/);});
test('personal theorem label cannot set trusted verification',()=>{const d=load('sandbox/examples/affine.json');d.claim.label='theorem';assert.equal(S.validate(d).claim.verification,'unreviewed');d.claim.verification='formal-proof';assert.throws(()=>S.validate(d),/canonical verification/);});
test('unsupported run engine or kernel rejected',()=>{const d=load('sandbox/examples/affine.json');d.runs[0].result.engine='qeva-kernels/999';assert.throws(()=>S.validate(d),/Unsupported run engine/);d.kernel_ref='qeva:kernel:arbitrary@1';assert.throws(()=>S.validate(d),/Unknown/);});
test('full JSON round trip retains failed journal, share spec deliberately omits it',()=>{const d=load('sandbox/examples/inconclusive.json');assert.deepEqual(S.validate(JSON.parse(JSON.stringify(d))),d);const spec=S.shareSpec(d);assert.equal(spec.runs.length,0);assert.equal(d.runs.length,1);assert.equal(spec.claim.text,d.claim.text);});
test('fork records lineage without deleting evidence',()=>{const d=load('sandbox/examples/inconclusive.json'),fork=S.fork(d,'test-fork',now);assert.notEqual(fork.id,d.id);assert.equal(fork.revision,1);assert.deepEqual(fork.provenance.parent,{id:d.id,revision:d.revision});assert.deepEqual(fork.runs,d.runs);});
test('sandbox bounds, duplicate IDs, unsafe fields and malformed dates rejected',()=>{for(const mutate of [d=>d.runs=Array(51).fill(d.runs[0]),d=>d.runs.push(copy(d.runs[0])),d=>d.title='x'.repeat(161),d=>d.claim.text='x'.repeat(4001),d=>d.provenance.created_at='2026',d=>d.admin=true,d=>d.concept_refs=['not-pinned']]){const d=load('sandbox/examples/affine.json');mutate(d);assert.throws(()=>S.validate(d));}});
test('no accounts/teams/sync/publication/review are faked',async()=>{assert.equal(await Service.getSession(),null);assert.deepEqual(await Service.capabilities(),{accounts:false,teams:false,sync:false,publication:false,review:false});for(const method of ['signIn','signOut','syncProgress','publishSandbox','listTeams','createTeam','submitCandidate','requestReview'])await assert.rejects(Service[method](),e=>e.code==='SERVICE_UNAVAILABLE');});
function storageHarness(data={},mode=''){
 const warnings=[],listeners={},notices=[];const storage={getItem(k){if(mode==='read')throw Error('read blocked');return Object.hasOwn(data,k)?data[k]:null;},setItem(k,v){if(mode==='write')throw Error('quota');data[k]=v;}};
 const context={QEVA:{Learning:E},localStorage:storage,document:{readyState:'complete',querySelectorAll(){return notices;}},console,Date,Math,Uint32Array,Map,Set};context.window=context;context.addEventListener=(name,fn)=>listeners[name]=fn;
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'assets/local-state.js'),'utf8'),context);return{Local:context.QEVA.Local,data,listeners};
}
test('local storage adapter preserves and reloads evidence',()=>{const h=storageHarness();h.Local.record('qeva:activity:sequence-next@1',{value:'17'});h.Local.record('qeva:activity:sequence-next@1',{value:'16'});const next=storageHarness(h.data);assert.equal(next.Local.get().attempts.length,2);assert.equal(state(next.Local.get(),'sequence'),'understood');});
test('corrupt original local bytes are not overwritten',()=>{const data={'qeva.learner.v1':'{broken'};const h=storageHarness(data);h.Local.record('qeva:activity:sequence-next@1',{value:'16'});assert.equal(data['qeva.learner.v1'],'{broken');assert.equal(h.Local.get().attempts.length,1);assert.equal(h.Local.status().persistent,false);});
test('read-blocked and quota-blocked storage keep usable memory evidence',()=>{for(const mode of ['read','write']){const h=storageHarness({},mode);h.Local.record('qeva:activity:sequence-next@1',{value:'16'});assert.equal(h.Local.get().attempts.length,1);assert.equal(h.Local.status().persistent,false);assert.match(h.Local.status().warning,/only in this tab/);}});
test('sequential tabs merge nonconflicting attempts and explicit reset is local',()=>{const data={},a=storageHarness(data),b=storageHarness(data);a.Local.record('qeva:activity:sequence-next@1',{value:'16'});b.Local.record('qeva:activity:parity-witness@1',{value:'13'});assert.equal(JSON.parse(data['qeva.learner.v1']).attempts.length,2);b.Local.reset();assert.equal(JSON.parse(data['qeva.learner.v1']).attempts.length,0);});
