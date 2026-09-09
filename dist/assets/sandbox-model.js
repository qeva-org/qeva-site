/* QEVA portable sandbox document contract and validation. MIT. */
(function (root, factory) {
  'use strict';
  var node = typeof module === 'object' && module.exports;
  var api = factory(node ? require('./kernels.js') : root.QEVA.Kernels, node ? require('./learning-engine.js') : root.QEVA.Learning);
  if (node) module.exports = api; else root.QEVA.Sandbox = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (K, E) {
  'use strict';
  var LABELS = ['experiment', 'observation', 'conjecture', 'theorem', 'proof', 'counterexample'];
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function exactKeys(v, keys, label) {
    if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).sort().join('|') !== keys.slice().sort().join('|')) throw new Error('Invalid fields in ' + label + '.');
  }
  function text(s, max, label, allowEmpty) {
    if (typeof s !== 'string' || s.length > max || (!allowEmpty && !s.trim())) throw new Error('Invalid ' + label + '.');
  }
  function date(s) { if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s) || !Number.isFinite(Date.parse(s))) throw new Error('Invalid timestamp.'); }
  function labid(s) { if (typeof s !== 'string' || !/^lab:[a-zA-Z0-9._-]{1,100}$/.test(s)) throw new Error('Invalid lab identity.'); }
  function validate(d, verifyRuns) {
    E.safeData(d);
    exactKeys(d, ['schema_version','id','revision','title','kernel_ref','parameters','concept_refs','claim','provenance','runs'], 'sandbox');
    if (d.schema_version !== 'qeva-sandbox/1') throw new Error('Unsupported sandbox version. Preserve the original; no migration was assumed.');
    labid(d.id);
    if (!Number.isInteger(d.revision) || d.revision < 1 || d.revision > 1000000000) throw new Error('Invalid sandbox revision.');
    text(d.title, 160, 'title'); K.validate(d.kernel_ref, d.parameters);
    if (!Array.isArray(d.concept_refs) || d.concept_refs.length > 64 || !d.concept_refs.every(function (r) { return typeof r === 'string' && /^qeva:1:[a-z0-9][a-z0-9._-]*@[1-9][0-9]*$/.test(r); })) throw new Error('Concept links must pin exact QEVA revisions.');
    if (new Set(d.concept_refs).size !== d.concept_refs.length) throw new Error('Duplicate concept link.');
    exactKeys(d.claim, ['label','text','verification'], 'claim');
    if (LABELS.indexOf(d.claim.label) < 0 || d.claim.verification !== 'unreviewed') throw new Error('A portable personal lab cannot assert canonical verification.');
    text(d.claim.text, 4000, 'claim text', true);
    exactKeys(d.provenance, ['created_at','creator_label','parent'], 'provenance');
    date(d.provenance.created_at); text(d.provenance.creator_label, 160, 'creator label', true);
    if (d.provenance.parent !== null) {
      exactKeys(d.provenance.parent, ['id','revision'], 'parent'); labid(d.provenance.parent.id);
      if (!Number.isInteger(d.provenance.parent.revision) || d.provenance.parent.revision < 1) throw new Error('Invalid parent revision.');
    }
    if (!Array.isArray(d.runs) || d.runs.length > 50) throw new Error('A portable lab supports up to 50 preserved runs. Export and start a new journal; forks retain all evidence.');
    var ids = new Set();
    d.runs.forEach(function (r) {
      exactKeys(r, ['id','at','result','note'], 'run');
      text(r.id, 100, 'run ID'); if (ids.has(r.id)) throw new Error('Duplicate run ID.'); ids.add(r.id);
      date(r.at); text(r.note, 2000, 'run note', true);
      exactKeys(r.result, ['engine','kernel_ref','arithmetic','parameters','status','series','summary'], 'result');
      var result = K.run(r.result.kernel_ref, r.result.parameters);
      if (r.result.engine !== K.version) throw new Error('Unsupported run engine; preserve this file for its declared interpreter.');
      if (verifyRuns !== false && E.stable(result) !== E.stable(r.result)) throw new Error('Stored run does not reproduce with its declared kernel. Keep the source file for investigation.');
    });
    if (JSON.stringify(d).length > 2097152) throw new Error('Lab exceeds the 2 MiB local format limit.');
    return copy(d);
  }
  function create(ref, id, now) {
    return {schema_version:'qeva-sandbox/1',id:'lab:'+id,revision:1,title:K.definition(ref).title+' — personal experiment',kernel_ref:ref,parameters:K.defaults(ref),concept_refs:[],claim:{label:'experiment',text:'',verification:'unreviewed'},provenance:{created_at:now,creator_label:'Local learner (self-described)',parent:null},runs:[]};
  }
  function fork(source, id, now) {
    var next = validate(source); next.provenance = {created_at:now,creator_label:source.provenance.creator_label,parent:{id:source.id,revision:source.revision}};
    next.id='lab:'+id; next.revision=1; next.title=('Remix — '+source.title).slice(0,160); return next;
  }
  function shareSpec(d) {
    var v = validate(d); v.runs = []; // a compact experiment specification, explicitly NOT its journal
    return v;
  }
  return {labels: LABELS, validate: validate, create: create, fork: fork, shareSpec: shareSpec};
}));
