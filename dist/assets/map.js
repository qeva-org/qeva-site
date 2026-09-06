(function () {
  'use strict';

  const data = window.QEVA_DATA;
  const rail = document.getElementById('lane-rail');
  const detail = document.getElementById('map-detail');
  const query = document.getElementById('map-q');
  const lane = document.getElementById('map-lane');
  const count = document.getElementById('map-count');
  const empty = document.getElementById('map-empty');
  if (!data || !rail || !detail || !query || !lane || !count) return;

  const esc = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const slug = ref => (String(ref).match(/^qeva:1:([^@]+)@/) || [])[1] || String(ref);
  const objects = new Map(data.objects.map(object => [object.id, object]));
  const nodes = [...rail.querySelectorAll('[data-node]')];
  const trail = [];
  let selected = null;

  const laneNames = [...new Set(nodes.map(node => node.dataset.lane))];
  lane.innerHTML = '<option value="">All lanes</option>' + laneNames.map(value =>
    `<option value="${esc(value)}">${esc(value)}</option>`
  ).join('');

  function linkFor(ref, relation) {
    const id = slug(ref);
    const object = objects.get(id);
    if (!object) return `<li><code>${esc(ref)}</code></li>`;
    return `<li><a href="?focus=${encodeURIComponent(id)}" data-jump="${esc(id)}">${esc(object.title)}</a><span class="edge-kind">${esc(relation)}</span><code>${esc(ref)}</code></li>`;
  }

  function currentUrl(id) {
    const url = new URL(location.href);
    url.searchParams.set('focus', id);
    return url.pathname + url.search + url.hash;
  }

  function setHistory(method, state, url) {
    try { window.history[method](state, '', url); } catch (error) { /* file: and locked-down snapshots may reject URL mutation. */ }
  }

  function filter() {
    const term = query.value.trim().toLocaleLowerCase();
    const chosenLane = lane.value;
    let visible = 0;
    nodes.forEach(node => {
      const object = objects.get(node.dataset.node);
      const haystack = [object.title, object.plain, object.question, object.kind, object.lane, ...(object.domains || [])].join(' ').toLocaleLowerCase();
      const show = (!term || haystack.includes(term)) && (!chosenLane || object.lane === chosenLane);
      node.hidden = !show;
      if (show) visible += 1;
    });
    rail.querySelectorAll('[data-lane-group]').forEach(group => {
      group.hidden = ![...group.querySelectorAll('[data-node]')].some(node => !node.hidden);
    });
    count.textContent = `${visible} ${visible === 1 ? 'object' : 'objects'}`;
    if (empty) empty.hidden = visible !== 0;
    if (selected) {
      const active = nodes.find(node => node.dataset.node === selected);
      detail.classList.toggle('filtered-selection', Boolean(active && active.hidden));
    }
  }

  function ensureVisible(id) {
    const node = nodes.find(item => item.dataset.node === id);
    if (!node) return;
    if (node.hidden || node.closest('[data-lane-group]').hidden) {
      query.value = '';
      lane.value = '';
      filter();
    }
    node.scrollIntoView({block: 'nearest', inline: 'nearest'});
    node.focus({preventScroll: true});
  }

  function renderTrail() {
    return trail.map((id, index) => {
      const object = objects.get(id);
      return `<li><a href="?focus=${encodeURIComponent(id)}" data-jump="${esc(id)}"${index === trail.length - 1 ? ' aria-current="page"' : ''}>${esc(object ? object.title : id)}</a></li>`;
    }).join('');
  }

  function select(id, options) {
    const object = objects.get(id);
    if (!object) return;
    const settings = Object.assign({history: 'push', focus: false}, options || {});
    selected = id;
    nodes.forEach(node => {
      const active = node.dataset.node === id;
      node.classList.toggle('selected', active);
      if (active) node.setAttribute('aria-current', 'true');
      else node.removeAttribute('aria-current');
    });
    if (trail[trail.length - 1] !== id) {
      trail.push(id);
      if (trail.length > 6) trail.shift();
    }
    const dependencies = object.dependencies.length
      ? object.dependencies.map(ref => linkFor(ref, 'candidate · migrated legacy dependency')).join('')
      : '<li>No migrated prerequisite candidate appears here; inspect the object framework boundary.</li>';
    const uses = object.used_by.length
      ? object.used_by.map(ref => linkFor(ref, 'directly uses this revision')).join('')
      : '<li>No current object directly uses this exact revision.</li>';
    const experiment = (data.experiments || []).find(item => (item.related_objects || []).includes(object.ref));
    detail.innerHTML = `
      <nav class="map-trail" aria-label="Exploration trail"><ol>${renderTrail()}</ol></nav>
      <p class="kicker">${esc(object.lane)} · stage ${esc(object.stage)} · ${esc(object.kind)}</p>
      <h2>${esc(object.title)}</h2>
      <p>${esc(object.plain)}</p>
      <p class="question">${esc(object.question || object.plain)}</p>
      <section class="trace"><h3 class="trace-label">Prerequisite candidates</h3><p class="micro">These pinned edges were migrated from legacy dependency fields. They are not formal proof-role assertions until separately qualified.</p><ul>${dependencies}</ul></section>
      <section class="trace"><h3 class="trace-label">Direct current uses</h3><ul>${uses}</ul></section>
      <div class="actions">
        <a class="button" href="../objects/${encodeURIComponent(id)}/index.html">Open concept</a>
        ${experiment ? `<a class="button ghost" href="../lab/index.html?experiment=${encodeURIComponent(experiment.id)}">Run related mechanism</a>` : ''}
        <a class="button ghost" href="../search/index.html?q=${encodeURIComponent(object.title)}">Search connections</a>
      </div>`;
    detail.querySelectorAll('[data-jump]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      select(link.dataset.jump, {history: 'push', focus: true});
    }));
    if (settings.history === 'push') setHistory('pushState', {focus: id}, currentUrl(id));
    else if (settings.history === 'replace') setHistory('replaceState', {focus: id}, currentUrl(id));
    if (settings.focus) ensureVisible(id);
  }

  rail.addEventListener('click', event => {
    const node = event.target.closest('[data-node]');
    if (!node) return;
    event.preventDefault();
    select(node.dataset.node, {history: 'push'});
  });
  rail.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const visible = nodes.filter(node => !node.hidden);
    const current = visible.indexOf(document.activeElement);
    if (current < 0 || !visible.length) return;
    event.preventDefault();
    let next = current;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = visible.length - 1;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % visible.length;
    else next = (current - 1 + visible.length) % visible.length;
    visible[next].focus();
  });
  query.addEventListener('input', filter);
  lane.addEventListener('change', filter);
  addEventListener('popstate', event => {
    const focus = (event.state && event.state.focus) || new URLSearchParams(location.search).get('focus');
    if (objects.has(focus)) select(focus, {history: 'none', focus: true});
  });

  const initial = new URLSearchParams(location.search).get('focus');
  filter();
  select(objects.has(initial) ? initial : (objects.has('distinction') ? 'distinction' : data.objects[0].id), {history: 'replace'});
})();
