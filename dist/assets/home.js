(function(){
  'use strict';
  const data=window.QEVA_DATA;if(!data)return;
  const input=document.getElementById('global-search');
  const results=document.getElementById('global-results');
  const stats={objects:data.release.current_objects,revisions:data.release.all_revisions,history:data.release.history_milestones,fields:data.release.field_nodes};
  Object.keys(stats).forEach(key=>{const el=document.querySelector(`[data-stat="${key}"]`);if(el)el.textContent=stats[key].toLocaleString();});
  if(!input||!results)return;
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
  const score=(object,words)=>{const title=object.title.toLowerCase(),hay=[object.title,object.plain,object.question,object.kind,object.lane,...object.domains].join(' ').toLowerCase();let value=0;for(const word of words){if(title===word)value+=30;else if(title.startsWith(word))value+=15;else if(title.includes(word))value+=8;if(hay.includes(word))value+=2;}return value;};
  function render(){
    const q=input.value.trim().toLowerCase();
    if(!q){results.innerHTML='';input.setAttribute('aria-expanded','false');return;}
    const words=q.split(/\s+/).filter(Boolean);
    const found=data.objects.map(object=>({object,value:score(object,words)})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value||a.object.title.localeCompare(b.object.title)).slice(0,9);
    results.innerHTML=found.length?found.map(({object})=>`<a class="search-result" href="objects/${encodeURIComponent(object.id)}/"><strong>${esc(object.title)}</strong><span>${esc(object.plain)}</span><small>${esc(object.lane)} · ${esc(object.kind)}</small></a>`).join(''):`<div class="search-result"><strong>No exact seed yet</strong><span>Try a wider term, or inspect the full archive. Missing concepts are useful map debt.</span><small>0 results</small></div>`;
    input.setAttribute('aria-expanded','true');
  }
  input.addEventListener('input',render);
  input.addEventListener('keydown',event=>{if(event.key==='Escape'){input.value='';render();input.blur();}});
  document.addEventListener('click',event=>{if(!event.target.closest('.search-lab')){results.innerHTML='';input.setAttribute('aria-expanded','false');}});
})();
