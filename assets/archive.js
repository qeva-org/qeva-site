(function(){
  'use strict';
  const q=document.getElementById('archive-q'),lane=document.getElementById('archive-lane'),count=document.getElementById('archive-count'),rows=[...document.querySelectorAll('[data-record]')];if(!q)return;
  function run(){const term=q.value.trim().toLowerCase(),selected=lane.value;let visible=0;rows.forEach(row=>{const show=(!term||row.dataset.record.includes(term))&&(!selected||row.dataset.lane===selected);row.classList.toggle('hidden',!show);if(show)visible++;});count.textContent=`${visible} object${visible===1?'':'s'}`;}
  q.addEventListener('input',run);lane.addEventListener('change',run);const initial=new URLSearchParams(location.search).get('q');if(initial){q.value=initial;}run();
})();
