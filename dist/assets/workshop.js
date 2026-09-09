/* Portable personal laboratory. Local drafts and self-contained sharing, no backend. MIT. */
(function () {
  'use strict';
  var Q=window.QEVA, U=Q.UI, S=Q.Sandbox, E=Q.Learning, K=Q.Kernels, n=U.node;
  var root=document.getElementById('workshop');if(!root)return;
  var KEY='qeva.labs.v1', memory=[], storageBlocked=false, dirty=false, current, fields;
  var query=new URLSearchParams(location.search), requested=query.get('kernel'), initialMessage='';
  var alias={affine:'qeva:kernel:affine@1',logistic:'qeva:kernel:logistic@1',collatz:'qeva:kernel:collatz@1'};
  var kernel=alias[requested]||requested||'qeva:kernel:logistic@1';
  if(K.refs.indexOf(kernel)<0){kernel=K.refs[1];initialMessage='The requested kernel revision is not present. Showing a new logistic experiment instead.';}
  current=S.create(kernel,Q.Local.id(),new Date().toISOString());
  var catalog=new E.Catalog(window.QEVA_LEARNING), concept=catalog.get(query.get('concept'));
  if(concept)current.concept_refs=[concept.concept_ref];
  var status=document.getElementById('lab-status'), draftStatus=document.getElementById('lab-draft-status');
  var title=document.getElementById('lab-title'), select=document.getElementById('lab-kernel'), label=document.getElementById('lab-label'), claim=document.getElementById('lab-claim'), creator=document.getElementById('lab-creator'), note=document.getElementById('run-note');
  var chart=document.getElementById('lab-chart'), readout=document.getElementById('lab-readout'), journal=document.getElementById('lab-journal'), drafts=document.getElementById('lab-drafts');
  var share=document.getElementById('lab-share-value');
  function message(text){status.textContent=text;}
  function storeRead(){
    if(storageBlocked)return memory;
    try{
      var text=localStorage.getItem(KEY);if(text===null)return memory;
      var values=E.parse(text,4194304);
      if(!Array.isArray(values)||values.length>20)throw new Error('Invalid local lab collection.');
      values.forEach(function(v){S.validate(v);}); memory=values;return values;
    }catch(error){storageBlocked=true;draftStatus.textContent='Local drafts could not be read. Existing bytes have not been overwritten; use JSON export. '+error.message;return memory;}
  }
  function setDirty(){dirty=true;document.getElementById('lab-save-state').textContent='Unsaved changes · save locally or export before leaving.';share.hidden=true;document.getElementById('copy-share').hidden=true;}
  function sync(){
    var next=JSON.parse(JSON.stringify(current));next.title=title.value;next.parameters=fields.read();next.claim.label=label.value;next.claim.text=claim.value;next.provenance.creator_label=creator.value;current=S.validate(next);return current;
  }
  function links(){
    var box=document.getElementById('lab-concept-links');box.replaceChildren();current.concept_refs.forEach(function(r){box.appendChild(n('a',{href:U.archive(r),text:r}));});
  }
  function showJournal(){
    journal.replaceChildren();
    if(!current.runs.length){journal.appendChild(n('p',{class:'meta',text:'No recorded runs yet. Each run will retain its rule revision, parameters, result, stopping reason and note.'}));return;}
    current.runs.slice().reverse().forEach(function(r,index){
      var body=n('details',{class:'journal-entry'},[n('summary',{text:'Run '+(current.runs.length-index)+' · '+r.result.status+' · '+r.at}),n('p',{text:K.explain(r.result)}),n('pre',{text:JSON.stringify(r.result.parameters,null,2)}),n('p',{text:r.note||'No note supplied.'})]);
      var replay=n('button',{type:'button',class:'small-button',text:'Reproduce this exact run'});
      replay.addEventListener('click',function(){try{var result=K.run(r.result.kernel_ref,r.result.parameters);if(E.stable(result)!==E.stable(r.result))throw new Error('The regenerated result differs.');U.plot(result,chart);readout.textContent=K.explain(result);message('Reproduced the stored run. Its parameters, not the currently edited form, were used.');}catch(error){message('Reproduction failed; the original record was preserved. '+error.message);}});
      body.appendChild(replay);journal.appendChild(body);
    });
  }
  function render(){
    title.value=current.title;select.value=current.kernel_ref;label.value=current.claim.label;claim.value=current.claim.text;creator.value=current.provenance.creator_label;
    var definition=K.definition(current.kernel_ref);
    document.getElementById('lab-rule').textContent=definition.rule;
    document.getElementById('lab-domain').textContent=definition.domain+' '+definition.arithmetic+'. Kernel: '+current.kernel_ref;
    document.getElementById('lab-identity').textContent=current.id+' · local revision '+current.revision+(current.provenance.parent?' · fork of '+current.provenance.parent.id+' @ '+current.provenance.parent.revision:'');
    fields=U.parameters(current.kernel_ref,current.parameters,null,'workshop');document.getElementById('lab-parameters').replaceChildren(fields.element);
    fields.element.addEventListener('input',setDirty);links();showJournal();
    chart.replaceChildren();readout.textContent='Run the declared rule to inspect its behavior.';
    document.getElementById('lab-claim-status').textContent='User-declared '+current.claim.label+' · unreviewed. This label is not an archive verification state.';
    share.hidden=true;document.getElementById('copy-share').hidden=true;
  }
  function showDrafts(){
    var values=storeRead();drafts.replaceChildren();
    if(!values.length)drafts.appendChild(n('p',{class:'meta',text:'No saved local laboratories on this origin. Nothing is stored in a QEVA account.'}));
    values.forEach(function(d){
      var open=n('button',{type:'button',class:'text-button',text:d.title+' · r'+d.revision+' · '+d.runs.length+' runs'});
      open.addEventListener('click',function(){if(dirty&&!window.confirm('Opening this saved lab discards unsaved edits in the current tab. Continue?'))return;try{current=S.validate(d);dirty=false;render();document.getElementById('lab-save-state').textContent='Opened local draft. Further edits are not saved automatically.';message('Opened '+current.title+'.');}catch(error){message(error.message);}});
      drafts.appendChild(n('li',{},[open]));
    });
  }
  K.refs.forEach(function(r){select.appendChild(n('option',{value:r,text:K.definition(r).title}));});
  S.labels.forEach(function(s){label.appendChild(n('option',{value:s,text:s+(s==='theorem'||s==='proof'||s==='counterexample'?' (user claim; unreviewed)':'')}));});
  select.addEventListener('change',function(){
    // Keep the journal even when switching kernels; each run pins its own interpreter.
    current.title=title.value;current.claim.text=claim.value;current.claim.label=label.value;current.provenance.creator_label=creator.value;
    current.kernel_ref=select.value;current.parameters=K.defaults(select.value);render();setDirty();
  });
  [title,label,claim,creator,note].forEach(function(el){el.addEventListener('input',function(){setDirty();document.getElementById('lab-claim-status').textContent='User-declared '+label.value+' · unreviewed. A personal lab cannot certify itself.';});});
  document.getElementById('lab-run').addEventListener('click',function(){
    try{
      sync();if(current.runs.length>=50)throw new Error('The journal already contains 50 runs. Export it before starting another journal. No run was discarded.');
      var result=K.run(current.kernel_ref,current.parameters), next=JSON.parse(JSON.stringify(current));
      next.runs.push({id:Q.Local.id(),at:new Date().toISOString(),result:result,note:note.value});current=S.validate(next);
      U.plot(result,chart);readout.textContent=K.explain(result);showJournal();setDirty();
      message('Run recorded in this tab. '+(result.status==='step-budget'||result.status==='digit-budget'?'The budget stop is preserved as inconclusive. ':'')+'Save or export to preserve it.');
    }catch(error){message('Run not recorded: '+error.message);}
  });
  document.getElementById('lab-save').addEventListener('click',function(){
    try{
      sync();var values=storeRead().slice();if(storageBlocked)throw new Error('Local storage is unavailable or unreadable; export instead.');
      var at=values.findIndex(function(d){return d.id===current.id;});
      if(at>=0&&values[at].revision!==current.revision)throw new Error('This lab has a newer local revision, possibly from another tab. Fork your changes instead of overwriting it.');
      if(at<0&&values.length>=20)throw new Error('The local collection is full (20 labs). Export or manage local data before adding another.');
      var saved=JSON.parse(JSON.stringify(current));if(at>=0)saved.revision+=1;
      if(at>=0)values[at]=saved;else values.push(saved);
      var serialized=JSON.stringify(values);if(serialized.length>4194304)throw new Error('The local collection exceeds 4 MiB. Export the current lab.');
      localStorage.setItem(KEY,serialized);memory=values;current=saved;dirty=false;
      document.getElementById('lab-save-state').textContent='Saved on this browser origin only · revision '+current.revision+'.';
      document.getElementById('lab-identity').textContent=current.id+' · local revision '+current.revision;
      showDrafts();message('Saved locally. No publication, account sync or team sharing occurred.');
    }catch(error){message('Not saved locally: '+error.message+' The current journal remains in this tab.');}
  });
  document.getElementById('lab-export').addEventListener('click',function(){try{sync();U.download(JSON.stringify(current,null,2)+'\n','qeva-sandbox-'+current.id.slice(4)+'.json');message('Exported the full specification and '+current.runs.length+' preserved run(s). The current browser draft is unchanged.');}catch(error){message('Export failed: '+error.message);}});
  document.getElementById('lab-fork').addEventListener('click',function(){try{sync();current=S.fork(current,Q.Local.id(),new Date().toISOString());render();setDirty();message('Created a local remix with a new identity. Parent identity and revision, plus previous run evidence, were retained.');}catch(error){message('Could not fork: '+error.message);}});
  document.getElementById('lab-new').addEventListener('click',function(){if(dirty&&!window.confirm('Start a new journal? Export or save first to preserve unsaved edits.'))return;current=S.create(select.value,Q.Local.id(),new Date().toISOString());render();setDirty();message('Started a new local experiment; saved labs are untouched.');});
  document.getElementById('lab-import').addEventListener('change',async function(event){
    var file=event.target.files[0];if(!file)return;
    try{
      if(file.size>2097152)throw new Error('File exceeds 2 MiB.');
      var imported=S.validate(E.parse(await file.text(),2097152));
      if(dirty&&!window.confirm('Open the imported lab as a remix? Unsaved edits in the current tab will be replaced.'))return;
      current=S.fork(imported,Q.Local.id(),new Date().toISOString());render();setDirty();
      message('Imported as a remix after reproducing '+current.runs.length+' stored run(s). No existing lab was overwritten; all claims remain unreviewed.');
    }catch(error){message('Import rejected; the current lab was not changed. '+error.message);}finally{event.target.value='';}
  });
  function encode(text){return btoa(Array.from(new TextEncoder().encode(text),function(b){return String.fromCharCode(b);}).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function decode(text){if(text.length>12000||!/^[A-Za-z0-9_-]+$/.test(text))throw new Error('Invalid or oversized share fragment.');var b=atob(text.replace(/-/g,'+').replace(/_/g,'/'));return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(b,function(c){return c.charCodeAt(0);}));}
  document.getElementById('lab-share').addEventListener('click',function(){
    try{
      sync();var payload=encode(JSON.stringify(S.shareSpec(current)));
      if(payload.length>8000)throw new Error('The specification is too long for a conservative share link. Export JSON instead.');
      var base=new URL(location.href);base.search='';base.hash='lab='+payload;
      share.value=location.protocol==='file:'?'#lab='+payload:base.href;share.hidden=false;document.getElementById('copy-share').hidden=false;
      message((location.protocol==='file:'?'This is an offline fragment, not a publicly reachable URL. Append it to another QEVA workshop URL, or share the JSON file. ':'Share link prepared. ')+'It includes the specification and claim text, but NOT the run journal. Anyone receiving it can read its contents. Nothing was uploaded.');
    }catch(error){message('Link not created: '+error.message);}
  });
  document.getElementById('copy-share').addEventListener('click',async function(){try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(share.value);message('Copied the specification link/fragment. To include the run journal, export JSON instead.');}catch(_){share.focus();share.select();message('Clipboard access is unavailable. The share text is selected for manual copying.');}});
  try{
    var payload=new URLSearchParams(location.hash.slice(1)).get('lab');
    if(payload){var shared=S.validate(E.parse(decode(payload),128000));current=S.fork(shared,Q.Local.id(),new Date().toISOString());dirty=true;initialMessage='Opened a shared specification as a local remix. It is unreviewed and contains no run journal unless supplied separately. Nothing was fetched from an account.';}
  }catch(error){initialMessage='Share fragment rejected; a new local lab is shown. '+error.message;}
  root.hidden=false;render();showDrafts();message(initialMessage||'Declare a rule, make a prediction, then run it. Your first run does not require an account.');
  window.addEventListener('beforeunload',function(event){if(dirty){event.preventDefault();event.returnValue='';}});
}());
