(function () {
  'use strict';

  const payload = window.QEVA_EXPERIMENTS;
  const byId = id => document.getElementById(id);
  const nodes = {
    quickSelect: byId('quick-experiment'),
    quickOpen: byId('quick-open'),
    quickTitle: byId('quick-title'),
    quickSummary: byId('quick-summary'),
    quickFormula: byId('quick-formula'),
    quickParameters: byId('quick-parameters'),
    search: byId('experiment-search'),
    family: byId('family-filter'),
    count: byId('experiment-count'),
    grid: byId('experiment-grid'),
    modeLinks: Array.from(document.querySelectorAll('[data-mode-link]'))
  };

  const familyNames = {
    projection: 'Projection',
    recurrence: 'Recurrence',
    signal: 'Signal and scale',
    optimization: 'Optimization',
    'integer-map': 'Integer map',
    'finite-state': 'Finite state'
  };

  function element(name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function experimentUrl(experiment, mode) {
    const query = new URLSearchParams({experiment: experiment.id});
    if (mode && mode !== 'run') query.set('mode', mode);
    return `lab/index.html?${query.toString()}`;
  }

  function renderStats(experiments) {
    const analyzerIds = new Set(experiments.flatMap(experiment => experiment.analyzers));
    const values = {
      experiments: experiments.length,
      families: new Set(experiments.map(experiment => experiment.family)).size,
      analyzers: analyzerIds.size,
      modes: 4
    };
    Object.entries(values).forEach(([key, value]) => {
      const target = document.querySelector(`[data-experiment-stat="${key}"]`);
      if (target) target.textContent = String(value);
    });
  }

  function renderQuick(experiment) {
    nodes.quickTitle.textContent = experiment.title;
    nodes.quickSummary.textContent = experiment.summary;
    nodes.quickFormula.textContent = experiment.operations[0] && experiment.operations[0].formula
      ? experiment.operations[0].formula
      : 'The exact bounded operation is recorded in the experiment JSON.';
    nodes.quickParameters.replaceChildren();
    experiment.parameters.forEach(parameter => {
      const item = element('li');
      item.append(element('span', '', parameter.label), element('code', '', String(parameter.default)));
      nodes.quickParameters.append(item);
    });
    nodes.quickOpen.href = experimentUrl(experiment, 'run');
    nodes.modeLinks.forEach(link => { link.href = experimentUrl(experiment, link.dataset.modeLink); });
  }

  function cardFor(experiment) {
    const article = element('article', 'experiment-card');
    const head = element('div', 'experiment-card-head');
    head.append(element('p', 'kicker', familyNames[experiment.family] || experiment.family));
    const title = element('h3', '', experiment.title);
    const summary = element('p', '', experiment.summary);
    const formula = element('code', 'experiment-formula', experiment.operations[0] && experiment.operations[0].formula
      ? experiment.operations[0].formula
      : experiment.executable.kernel);
    const metadata = element('dl', 'experiment-meta');
    [
      ['State', experiment.state_space.kind],
      ['Parameters', String(experiment.parameters.length)],
      ['Analyzers', String(experiment.analyzers.length)],
      ['Randomness', experiment.randomness.deterministic ? 'deterministic' : 'declared']
    ].forEach(([term, description]) => {
      metadata.append(element('dt', '', term), element('dd', '', description));
    });
    const actions = element('div', 'experiment-actions');
    const open = element('a', 'button', 'Open in Lab');
    open.href = experimentUrl(experiment, 'run');
    const record = element('a', 'button ghost', 'Exact JSON');
    const slug = experiment.id.split(':').pop();
    record.href = `experiments/records/${encodeURIComponent(slug)}.r${experiment.revision}.json`;
    actions.append(open, record);
    head.append(title);
    article.append(head, summary, formula, metadata, actions);
    return article;
  }

  function renderGrid(experiments) {
    const query = nodes.search.value.trim().toLowerCase();
    const family = nodes.family.value;
    const filtered = experiments.filter(experiment => {
      if (family && experiment.family !== family) return false;
      if (!query) return true;
      const haystack = [
        experiment.title,
        experiment.summary,
        experiment.family,
        experiment.state_space.kind,
        experiment.operations.map(operation => operation.formula || operation.kernel).join(' '),
        experiment.related_objects.join(' ')
      ].join(' ').toLowerCase();
      return query.split(/\s+/).every(word => haystack.includes(word));
    });
    nodes.grid.replaceChildren();
    filtered.forEach(experiment => nodes.grid.append(cardFor(experiment)));
    if (!filtered.length) {
      nodes.grid.append(element('p', 'notice', 'No seed experiment matches those filters. The JSON catalog remains available for inspection.'));
    }
    nodes.count.textContent = `${filtered.length} of ${experiments.length} experiments`;
  }

  function initialize() {
    if (!payload || !Array.isArray(payload.experiments) || !payload.experiments.length) {
      nodes.quickTitle.textContent = 'Experiment catalog unavailable';
      nodes.quickSummary.textContent = 'Open the static experiment index from the footer.';
      nodes.grid.append(element('p', 'notice', 'The interactive catalog did not load. No remote service is required; inspect experiments/index.json directly.'));
      return;
    }
    const experiments = payload.experiments.slice().sort((left, right) => left.title.localeCompare(right.title));
    renderStats(experiments);
    const families = [...new Set(experiments.map(experiment => experiment.family))].sort();
    families.forEach(family => {
      const option = element('option', '', familyNames[family] || family);
      option.value = family;
      nodes.family.append(option);
    });
    experiments.forEach(experiment => {
      const option = element('option', '', `${experiment.title} · ${familyNames[experiment.family] || experiment.family}`);
      option.value = experiment.id;
      nodes.quickSelect.append(option);
    });
    const featured = experiments.find(experiment => experiment.id.endsWith(':logistic-sensitivity')) || experiments[0];
    nodes.quickSelect.value = featured.id;
    renderQuick(featured);
    renderGrid(experiments);
    nodes.quickSelect.addEventListener('change', () => {
      const selected = experiments.find(experiment => experiment.id === nodes.quickSelect.value);
      if (selected) renderQuick(selected);
    });
    nodes.search.addEventListener('input', () => renderGrid(experiments));
    nodes.family.addEventListener('change', () => renderGrid(experiments));
  }

  initialize();
})();
