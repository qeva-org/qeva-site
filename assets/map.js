(function(){
  'use strict';
  const data=window.QEVA_DATA;if(!data)return;
  const root=document.getElementById('lane-rail'),detail=document.getElementById('map-detail'),q=document.getElementById('map-q'),lane=document.getElementById('map-lane'),count=document.getElementById('map-count');
  if(!root||!detail)return;
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
  const slug=ref=>(String(ref).match(/^qeva:1:([^@]+)@/)||[])[1]||ref;
  const byId=new Map(data.objects.map(object=>[object.id,object]));
  const laneOrder=['meta','logic','types','sets','number','structure','algebra','analysis','discrete','computation','probability','information','dynamics','frontier','categories'];
  const lanes=[...new Set(data.objects.map(object=>object.lane))].sort((a,b)=>{const ai=laneOrder.indexOf(a),bi=laneOrder.indexOf(b);return(ai<0?99:ai)-(bi<0?99:bi)||a.localeCompare(b);});
  lane.innerHTML='<option value="">All lanes</option>'+lanes.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
  root.innerHTML=lanes.map(value=>{const nodes=data.objects.filter(object=>object.lane===value).sort((a,b)=>a.stage-b.stage||a.title.localeCompare(b.title));return`<section class="lane-group" data-lane-group="${esc(value)}"><h2>${esc(value)}</h2><div class="lane-nodes">${nodes.map(object=>`<button class="map-node" type="button" data-node="${esc(object.id)}" data-kind="${esc(object.kind)}" data-lane="${esc(object.lane)}" aria-pressed="false">${esc(object.title)}</button>`).join('')}</div></section>`}).join('');
  const buttons=[...root.querySelectorAll('[data-node]')];
  function linkFor(ref){const id=slug(ref),object=byId.get(id);return object?`<li><button class="text-node" data-jump="${esc(id)}">${esc(object.title)}</button> <code>${esc(ref.split('@').pop())}</code></li>`:`<li>${esc(ref)}</li>`;}
  function select(id,updateUrl=true){
    const object=byId.get(id);if(!object)return;
    buttons.forEach(button=>button.setAttribute('aria-pressed',button.dataset.node===id?'true':'false'));
    const deps=object.dependencies.length?object.dependencies.map(linkFor).join(''):'<li>Declared root or framework boundary</li>';
    const uses=object.used_by.length?object.used_by.map(linkFor).join(''):'<li>No current direct dependents</li>';
    detail.innerHTML=`<p class="kicker">${esc(object.lane)} · stage ${esc(object.stage)} · ${esc(object.kind)}</p><h2>${esc(object.title)}</h2><p>${esc(object.plain)}</p><p class="question">${esc(object.question||object.plain)}</p><div class="trace"><span class="trace-label">DEPENDS ON</span><ul>${deps}</ul></div><div class="trace"><span class="trace-label">DIRECTLY USED BY</span><ul>${uses}</ul></div><div class="actions"><a class="button" href="../objects/${encodeURIComponent(id)}/">Open object</a><a class="button ghost" href="../archive/?q=${encodeURIComponent(object.title)}">Find in archive</a></div>`;
    detail.querySelectorAll('[data-jump]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.jump)));
    if(updateUrl){try{history.replaceState(null,'',`?focus=${encodeURIComponent(id)}`);}catch(_){}}
  }
  function filter(){
    const term=q.value.trim().toLowerCase(),selected=lane.value;let visible=0;
    buttons.forEach(button=>{const object=byId.get(button.dataset.node);const hay=[object.title,object.plain,object.question,object.kind,object.lane,...object.domains].join(' ').toLowerCase();const show=(!term||hay.includes(term))&&(!selected||object.lane===selected);button.classList.toggle('hidden',!show);if(show)visible++;});
    root.querySelectorAll('[data-lane-group]').forEach(group=>group.classList.toggle('hidden',![...group.querySelectorAll('[data-node]')].some(button=>!button.classList.contains('hidden'))));
    count.textContent=`${visible} objects`;
  }
  root.addEventListener('click',event=>{const button=event.target.closest('[data-node]');if(button)select(button.dataset.node);});
  q.addEventListener('input',filter);lane.addEventListener('change',filter);
  const focus=new URLSearchParams(location.search).get('focus');select(byId.has(focus)?focus:'distinction',false);filter();
  const fieldGrid=document.getElementById('field-grid');
  if(fieldGrid)fieldGrid.innerHTML=data.fields.map(field=>`<article class="field-card"><p class="kicker">${esc(field.parent||'root field')}</p><h3>${esc(field.title)}</h3><p>${esc(field.question)}</p><small>bridges → ${esc(field.bridges.join(' · '))}</small></article>`).join('');
  const frontierGrid=document.getElementById('frontier-grid');
  if(frontierGrid)frontierGrid.innerHTML=data.frontiers.map(item=>`<article class="field-card"><p class="kicker">${esc(item.status)} · since ${esc(item.since)}</p><h3>${esc(item.title)}</h3><p>${esc(item.question)}</p><small>${esc(item.domain)} · <a href="../objects/${encodeURIComponent(item.qeva)}/">related QEVA object</a></small></article>`).join('');
})();
