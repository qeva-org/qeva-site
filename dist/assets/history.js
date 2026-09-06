(function () {
  'use strict';
  const data = window.QEVA_DATA;
  if (!data || !Array.isArray(data.history)) return;
  const controls = document.getElementById('branch-controls');
  const events = [...document.querySelectorAll('[data-event]')];
  const query = document.getElementById('history-q');
  const growth = document.getElementById('growth');
  const timeline = document.getElementById('timeline');
  if (!controls || !query) return;
  const normalize = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const branches = [...new Set(data.history.map(item => String(item && item.branch || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  let active = '';
  let host;
  if (controls.tagName === 'FIELDSET') {
    let legend = [...controls.children].find(node => node.tagName === 'LEGEND');
    if (!legend) {
      legend = document.createElement('legend');
      legend.textContent = 'Filter history by branch';
      controls.prepend(legend);
    }
    controls.removeAttribute('aria-label');
    host = controls.querySelector('[data-branch-options]');
    if (!host) {
      host = document.createElement('div');
      host.className = 'branch-options';
      host.dataset.branchOptions = '';
      controls.append(host);
    }
  } else {
    controls.setAttribute('role', 'group');
    if (!controls.hasAttribute('aria-label') && !controls.hasAttribute('aria-labelledby')) controls.setAttribute('aria-label', 'Filter history by branch');
    host = controls.querySelector('[data-branch-options]') || controls;
  }
  const buttonFragment = document.createDocumentFragment();
  ['', ...branches].forEach(branch => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.branch = branch;
    button.setAttribute('aria-pressed', branch === '' ? 'true' : 'false');
    button.textContent = branch || 'All';
    buttonFragment.append(button);
  });
  host.replaceChildren(buttonFragment);
  const toolRow = query.closest('.history-tools');
  let resultStatus = document.getElementById('history-count');
  if (!resultStatus) {
    resultStatus = document.createElement('p');
    resultStatus.id = 'history-count';
    resultStatus.className = 'micro history-count';
    resultStatus.setAttribute('role', 'status');
    resultStatus.setAttribute('aria-live', 'polite');
    resultStatus.setAttribute('aria-atomic', 'true');
    (toolRow || controls.parentElement || controls).append(resultStatus);
  }
  let emptyState = document.getElementById('history-empty');
  if (!emptyState && timeline) {
    emptyState = document.createElement('p');
    emptyState.id = 'history-empty';
    emptyState.className = 'notice history-empty';
    emptyState.hidden = true;
    emptyState.textContent = 'No timeline events match these filters. Clear the search or choose All branches.';
    timeline.before(emptyState);
  }
  function renderGrowth(visible) {
    if (!growth) return;
    const counts = new Map();
    visible.forEach(row => {
      const branch = String(row.dataset.branch || 'Unclassified');
      counts.set(branch, (counts.get(branch) || 0) + 1);
    });
    const rows = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const max = Math.max(1, ...rows.map(([, value]) => value));
    const fragment = document.createDocumentFragment();
    rows.forEach(([branch, value]) => {
      const row = document.createElement('div');
      row.className = 'growth-row';
      row.setAttribute('role', 'listitem');
      row.setAttribute('aria-label', `${branch}: ${value} visible ${value === 1 ? 'event' : 'events'}`);
      const label = document.createElement('span');
      label.textContent = branch;
      const bar = document.createElement('div');
      bar.className = 'growth-bar';
      bar.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span');
      fill.style.width = `${Math.round(value / max * 100)}%`;
      bar.append(fill);
      const number = document.createElement('strong');
      number.textContent = String(value);
      row.append(label, bar, number);
      fragment.append(row);
    });
    growth.setAttribute('role', 'list');
    growth.replaceChildren(fragment);
  }
  function run() {
    const term = normalize(query.value.trim());
    const visible = [];
    events.forEach(row => {
      const branch = String(row.dataset.branch || '');
      const searchable = normalize(row.dataset.search || row.textContent);
      const show = (!active || branch === active) && (!term || searchable.includes(term));
      row.hidden = !show;
      if (show) visible.push(row);
    });
    renderGrowth(visible);
    resultStatus.textContent = `${visible.length} ${visible.length === 1 ? 'event' : 'events'} shown`;
    if (emptyState) emptyState.hidden = visible.length !== 0;
  }
  host.addEventListener('click', event => {
    const button = event.target.closest('button[data-branch]');
    if (!button || !host.contains(button)) return;
    active = button.dataset.branch || '';
    host.querySelectorAll('button[data-branch]').forEach(item => item.setAttribute('aria-pressed', item === button ? 'true' : 'false'));
    run();
  });
  query.addEventListener('input', run);
  const initial = new URLSearchParams(location.search).get('q');
  if (initial) query.value = initial;
  run();
})();
