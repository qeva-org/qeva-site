(function(){
  'use strict';
  const data=window.QEVA_DATA;if(!data)return;
  const controls=document.getElementById('branch-controls'),events=[...document.querySelectorAll('[data-event]')],q=document.getElementById('history-q'),growth=document.getElementById('growth');
  if(!controls||!q)return;
  const branches=[...new Set(data.history.map(item=>item.branch))].sort();let active='';
  controls.innerHTML=['',...branches].map(branch=>`<button type="button" data-branch="${branch}" aria-pressed="${branch===''?'true':'false'}">${branch||'All'}</button>`).join('');
  function renderGrowth(visible){const counts={};visible.forEach(row=>{counts[row.dataset.branch]=(counts[row.dataset.branch]||0)+1;});const max=Math.max(1,...Object.values(counts));growth.innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([branch,n])=>`<div class="growth-row"><span>${branch}</span><div class="growth-bar"><span style="width:${Math.round(n/max*100)}%"></span></div><strong>${n}</strong></div>`).join('');}
  function run(){const term=q.value.trim().toLowerCase(),visible=[];events.forEach(row=>{const show=(!active||row.dataset.branch===active)&&(!term||row.dataset.search.includes(term));row.classList.toggle('hidden',!show);if(show)visible.push(row);});renderGrowth(visible);}
  controls.addEventListener('click',event=>{const button=event.target.closest('[data-branch]');if(!button)return;active=button.dataset.branch;controls.querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',item===button?'true':'false'));run();});q.addEventListener('input',run);run();
})();
