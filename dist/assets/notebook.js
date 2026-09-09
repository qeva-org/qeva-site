/* Local progress portability and inspection. MIT. */
(function(){
  'use strict';var Q=window.QEVA,U=Q.UI,E=Q.Learning,n=U.node,root=document.getElementById('notebook');if(!root)return;
  var catalog=new E.Catalog(window.QEVA_LEARNING),status=document.getElementById('notebook-status');root.hidden=false;
  function render(){
    var learner=Q.Local.get(),progress=catalog.progress(learner),body=document.getElementById('progress-rows');body.replaceChildren();
    catalog.concepts.forEach(function(c){var state=progress.states.get(E.ref(c));body.appendChild(n('tr',{},[n('th',{scope:'row'},[n('a',{href:U.url('learn/index.html?goal='+encodeURIComponent(c.id.split(':').pop())),text:c.title})]),n('td',{text:state}),n('td',{text:c.mastery.understood.filter(function(r){return progress.passed.has(r);}).length+' / '+c.mastery.understood.length}),n('td',{text:c.mastery.mastered.filter(function(r){return progress.passed.has(r);}).length+' / '+c.mastery.mastered.length})]));});
    var unknown=learner.attempts.filter(function(a){return !catalog.activities.has(a.activity_ref);}).length;
    document.getElementById('notebook-summary').textContent=learner.attempts.length+' preserved attempts. '+unknown+' refer to activity revisions absent from this mirror; they are retained but cannot grant progress here.';
    var list=document.getElementById('attempt-history');list.replaceChildren();
    learner.attempts.slice().reverse().forEach(function(a){var activity=catalog.activities.get(a.activity_ref),checked=activity?E.assess(activity,a.response):null;list.appendChild(n('details',{},[n('summary',{text:a.at+' · '+(activity?activity.title:a.activity_ref)+' · '+(checked?(checked.passed?'met the check':'retry retained'):'unknown revision')}),n('p',{class:'meta',text:a.activity_ref}),n('pre',{text:JSON.stringify(a.response,null,2)})]));});
    if(!learner.attempts.length)list.appendChild(n('p',{text:'There are no attempts yet. Begin a learning route to create a local record.'}));
  }
  document.getElementById('progress-export').addEventListener('click',function(){U.download(JSON.stringify(Q.Local.get(),null,2)+'\n','qeva-learner.json');status.textContent='Exported local learning evidence. No account identifiers or authentication credentials are included.';});
  document.getElementById('progress-import').addEventListener('change',async function(event){var file=event.target.files[0];if(!file)return;try{if(file.size>1048576)throw new Error('File exceeds 1 MiB.');Q.Local.import(await file.text());status.textContent='Merged the notebook without removing existing attempts. Known responses were rechecked against exact activity revisions. Imported evidence is still self-reported local learning, not certification.';}catch(error){status.textContent='Import rejected; existing progress was not replaced. '+error.message;}finally{event.target.value='';}});
  document.getElementById('progress-reset').addEventListener('click',function(){if(window.prompt('Type RESET to clear this browser’s learner notebook. Export first to preserve your attempts. Saved laboratories are not affected.')!=='RESET')return;Q.Local.reset();status.textContent=Q.Local.status().persistent?'Cleared the local learner notebook. The archive and saved laboratories were not changed.':'Cleared this tab’s notebook, but browser storage could not be changed. See the storage warning.';});
  document.getElementById('progress-raw').addEventListener('click',function(){var raw=Q.Local.rawBackup();if(raw===null){status.textContent='No readable stored notebook bytes are available.';return;}U.download(raw,'qeva-learner-stored-original.json');status.textContent='Exported the stored bytes without attempting to repair or reinterpret them.';});
  render();Q.Local.subscribe(render);
}());
