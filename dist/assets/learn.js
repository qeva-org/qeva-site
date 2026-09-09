/* Learn and first-visit entrance; all lessons supplied as declarative data. MIT. */
(function () {
  'use strict';
  var Q=window.QEVA, U=Q.UI, n=U.node, E=Q.Learning, catalog;
  try{catalog=new E.Catalog(window.QEVA_LEARNING);}catch(error){var failure=document.querySelector('[data-learning-error]');if(failure)failure.textContent='Interactive learning could not start: '+error.message+' The static editions below remain readable.';return;}
  Q.catalog=catalog;
  var arrival=document.getElementById('arrival-activity');
  if(arrival){
    var a=catalog.activities.get(arrival.dataset.activity), destination=document.getElementById('arrival-next');
    var resume=document.getElementById('resume-route'), saved=Q.Local.get();
    if(resume&&saved.attempts.length){resume.hidden=false;resume.href=U.url('learn/index.html?goal='+encodeURIComponent(saved.preferences.goal));}
    arrival.hidden=false;
    Q.Activities.mount(a,arrival,function(_,result){
      if(result.passed){Q.Local.discover(a.concept_ref);destination.hidden=false;}
    });
    return;
  }
  var app=document.getElementById('learning-app');if(!app)return;
  var query=new URLSearchParams(location.search), initial=Q.Local.get(), requested=query.get('goal')||initial.preferences.goal;
  var goal=catalog.get(requested)||catalog.get('chaos'), goalSlug=goal.id.split(':').pop();
  var plan=catalog.plan(E.ref(goal),initial), selected=catalog.get(query.get('concept'))||plan.next||goal;
  Q.Local.preferences({goal:goalSlug}); Q.Local.discover(E.ref(selected));
  var goalSelect=document.getElementById('learning-goal');
  catalog.concepts.forEach(function(c){goalSelect.appendChild(n('option',{value:c.id.split(':').pop(),text:c.title}));});goalSelect.value=goalSlug;
  goalSelect.addEventListener('change',function(){location.href='index.html?goal='+encodeURIComponent(goalSelect.value);});
  var mode=document.getElementById('formal-mode');mode.checked=initial.preferences.mode==='formal';
  mode.addEventListener('change',function(){Q.Local.preferences({mode:mode.checked?'formal':'guided'});app.querySelectorAll('[data-formal]').forEach(function(el){el.open=mode.checked;});});
  app.hidden=false;
  var route=document.getElementById('route-path'), content=document.getElementById('concept-content'), next=document.getElementById('next-connection'), stateLabel=null;
  function routeHref(c){return 'index.html?goal='+encodeURIComponent(goalSlug)+'&concept='+encodeURIComponent(E.ref(c));}
  function update(){
    var current=Q.Local.get(), p=catalog.plan(E.ref(goal),current);route.replaceChildren();
    p.path.forEach(function(c){var s=p.progress.states.get(E.ref(c));var link=n('a',{href:routeHref(c),'aria-current':E.ref(c)===E.ref(selected)?'step':null},[n('span',{class:'path-marker','aria-hidden':'true'}),n('span',{class:'path-title',text:c.title}),n('span',{class:'concept-state',text:s})]);route.appendChild(n('li',{'data-state':s},[link]));});
    if(stateLabel)stateLabel.textContent=p.progress.states.get(E.ref(selected));
    var status=document.getElementById('route-status');status.textContent=p.next?'Next missing connection: '+p.next.title+'. Guidance follows prerequisites, not a fixed mission number.':'The understanding checks for this route are complete. Revisit the transfer tasks to deepen the local mastery record.';
    if(requested&&!catalog.get(requested)) status.textContent='Requested profile not present; showing the dynamics route. '+status.textContent;
    next.replaceChildren();
    if(p.next&&E.ref(p.next)!==E.ref(selected))next.appendChild(n('a',{class:'button',href:routeHref(p.next),text:'Continue to '+p.next.title+' →'}));
    else if(!p.next)next.appendChild(n('a',{class:'button secondary',href:U.url('map/index.html?layer=learning'),text:'See the connections you uncovered →'}));
    var missing=selected.prerequisites.filter(function(r){return E.states.indexOf(p.progress.states.get(r.ref))<E.states.indexOf(r.minimum_state);});
    var prerequisiteMessage=document.getElementById('prerequisite-message');prerequisiteMessage.replaceChildren();
    if(missing.length){prerequisiteMessage.hidden=false;prerequisiteMessage.appendChild(n('p',{text:'Guided progress for this concept is locked until '+missing.map(function(r){return catalog.get(r.ref).title+' is '+r.minimum_state;}).join(' and ')+'. Reading, formal definitions and experiments remain open. Any attempts are retained.'}));if(p.next)prerequisiteMessage.appendChild(n('a',{href:routeHref(p.next),text:'Follow the missing prerequisite →'}));}
    else prerequisiteMessage.hidden=true;
  }
  function prose(label,text){return n('section',{class:'explanation-part'},[n('h3',{text:label}),n('p',{text:text})]);}
  var expl=selected.explanation;
  content.appendChild(n('header',{class:'concept-heading'},[n('p',{class:'eyebrow',text:'LEARNING PROFILE · '+selected.difficulty.toUpperCase()}),n('h2',{text:selected.title}),stateLabel=n('span',{class:'concept-state'}),n('p',{class:'lede',text:expl.intuition}),n('p',{class:'reading-links'},[n('a',{href:U.archive(selected.concept_ref),text:'Open exact archive record ↗'}),' · ',n('a',{href:U.url('learn/concepts/'+selected.id.split(':').pop()+'/index.html'),text:'Static reading edition'})])]));
  content.appendChild(n('div',{id:'prerequisite-message',class:'notice',hidden:true}));
  content.appendChild(prose('Manipulate',expl.manipulation));
  var activityGroup=n('section',{'aria-label':'Understanding activities'});content.appendChild(activityGroup);
  selected.mastery.understood.forEach(function(ref){var root=n('article');activityGroup.appendChild(root);Q.Activities.mount(catalog.activities.get(ref),root,function(){Q.Local.discover(E.ref(selected));update();});});
  var mechanism=n('details',{class:'concept-disclosure',open:true},[n('summary',{text:'From pattern to mechanism'}),prose('Pattern',expl.pattern),prose('Mechanism',expl.mechanism)]);
  var terms=n('dl',{class:'term-list'});expl.vocabulary.forEach(function(t){terms.appendChild(n('dt',{text:t.term}));terms.appendChild(n('dd',{text:t.meaning}));});mechanism.appendChild(terms);content.appendChild(mechanism);
  var formal=n('details',{class:'concept-disclosure','data-formal':'',open:mode.checked},[n('summary',{text:'Expose notation, formal statement and proof scope'})]);
  var notation=n('dl',{class:'term-list notation'});expl.notation.forEach(function(t){notation.appendChild(n('dt',{text:t.symbol}));notation.appendChild(n('dd',{text:t.meaning}));});formal.appendChild(notation);
  formal.appendChild(n('p',{class:'meta',text:'Context: '+expl.formal.context}));formal.appendChild(n('p',{class:'formal-statement',text:expl.formal.text}));
  formal.appendChild(n('p',{},[n('a',{href:U.archive(expl.formal.source_ref),text:'Source: '+expl.formal.source_ref})]));if(expl.formal.caveat)formal.appendChild(n('p',{class:'caution',text:expl.formal.caveat}));
  formal.appendChild(n('h3',{text:'Proof scope · '+expl.proof.label}));formal.appendChild(n('p',{text:expl.proof.statement}));
  if(expl.proof.steps.length)formal.appendChild(n('ol',{class:'worked-proof'},expl.proof.steps.map(function(s){return n('li',{text:s});})));
  formal.appendChild(n('p',{class:'caution',text:expl.proof.limitation}));content.appendChild(formal);
  content.appendChild(n('h3',{class:'section-label',text:'Transfer the idea'}));
  content.appendChild(n('p',{class:'meta',text:'These checks deepen the local learning record. “Mastered” means this published activity rubric was met, not external certification.'}));
  selected.mastery.mastered.forEach(function(ref){var root=n('article');content.appendChild(root);Q.Activities.mount(catalog.activities.get(ref),root,update);});
  var connections=n('details',{class:'concept-disclosure'},[n('summary',{text:'Dependencies and the next frontier'}),n('p',{text:'These prerequisites are editorial learning choices, not proof dependencies. Inspect the pinned archive record for its mathematical dependencies.'})]);
  selected.prerequisites.forEach(function(p){connections.appendChild(n('p',{},[n('a',{href:routeHref(catalog.get(p.ref)),text:catalog.get(p.ref).title}),' — '+p.reason]));});
  connections.appendChild(n('p',{text:expl.frontier}));
  selected.related.forEach(function(r){connections.appendChild(n('p',{},[n('a',{href:U.archive(r),text:r})]));});content.appendChild(connections);
  content.appendChild(n('p',{class:'meta',text:'Learning content: draft editorial overlay for mathematical review. It does not alter the pinned archive record’s verification label.'}));
  update();Q.Local.subscribe(update);
}());
