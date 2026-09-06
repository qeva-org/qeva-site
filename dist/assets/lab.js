(function () {
  'use strict';

  const engine = window.QEVA_ENGINE;
  const payload = window.QEVA_EXPERIMENTS;
  const records = window.QEVA_RECORDS;
  const byId = id => document.getElementById(id);
  const nodes = {
    select: byId('experiment-select'),
    title: byId('experiment-title'),
    summary: byId('experiment-summary'),
    identity: byId('experiment-identity'),
    form: byId('parameter-form'),
    parameterControls: byId('parameter-controls'),
    tabs: Array.from(document.querySelectorAll('[data-mode]')),
    observerControls: byId('observer-controls'),
    observerLeft: byId('observer-left'),
    observerRight: byId('observer-right'),
    observerThreshold: byId('observer-threshold'),
    observerBins: byId('observer-bins'),
    sweepControls: byId('sweep-controls'),
    sweepParameter: byId('sweep-parameter'),
    sweepMin: byId('sweep-min'),
    sweepMax: byId('sweep-max'),
    sweepSamples: byId('sweep-samples'),
    attackControls: byId('attack-controls'),
    attackCases: byId('attack-cases'),
    attackSteps: byId('attack-steps'),
    attackTarget: byId('attack-target'),
    runButton: byId('run-button'),
    error: byId('lab-error'),
    modeLabel: byId('mode-label'),
    outputTitle: byId('output-title'),
    executionState: byId('execution-state'),
    metrics: byId('metric-grid'),
    canvas: byId('lab-canvas'),
    plotSummary: byId('plot-summary'),
    modeOutput: byId('mode-output'),
    observations: byId('observation-list'),
    trace: byId('trace-body'),
    experimentJson: byId('experiment-json'),
    related: byId('related-concepts'),
    importFile: byId('experiment-file'),
    exportExperiment: byId('export-experiment'),
    exportRun: byId('export-run'),
    workspaceName: byId('workspace-name'),
    workspaceNotes: byId('workspace-notes'),
    workspaceSelect: byId('workspace-select'),
    workspaceStatus: byId('workspace-status')
  };

  const modes = {
    run: {label: 'BOUNDED RUN', title: 'Result', action: 'Run experiment'},
    diff: {label: 'MATHEMATICAL DIFF', title: 'What changed?', action: 'Compare with defaults'},
    observer: {label: 'OBSERVER SWITCH', title: 'What remains visible?', action: 'Compare observers'},
    sweep: {label: 'PARAMETER SWEEP', title: 'Where does behavior change?', action: 'Run bounded sweep'},
    attack: {label: 'CONJECTURE ATTACK', title: 'Bounded claim test', action: 'Test bounded claim'}
  };

  const observerChoices = {
    continuous: [
      ['identity', 'Identity'],
      ['threshold', 'Threshold'],
      ['bins', 'Bins']
    ],
    discrete: [
      ['identity', 'Identity'],
      ['parity', 'Parity'],
      ['remainder', 'Remainder']
    ]
  };

  let experiments = [];
  let baseExperiment = null;
  let workingExperiment = null;
  let baseRun = null;
  let currentRun = null;
  let currentMode = 'run';
  let modeResult = null;
  let modeOptions = {};
  let importedSession = null;
  let localStore = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function element(name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return String(value);
    if (value === 0) return '0';
    const magnitude = Math.abs(value);
    if (magnitude >= 1000000 || magnitude < 0.00001) return value.toExponential(5);
    return Number(value.toPrecision(8)).toString();
  }

  function formatValue(value) {
    if (value === null) return 'none';
    if (value === undefined) return 'not recorded';
    if (typeof value === 'number') return formatNumber(value);
    if (typeof value === 'boolean') return value ? 'yes' : 'no';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  function humanize(value) {
    return String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
  }

  function setError(message) {
    nodes.error.textContent = message || '';
    nodes.error.classList.toggle('hidden', !message);
    if (message) setExecutionState('error');
  }

  function setExecutionState(state) {
    nodes.executionState.textContent = state;
    nodes.executionState.className = `status${state === 'complete' ? ' checked' : ''}`;
  }

  function markStale() {
    setError('');
    currentRun = null;
    modeResult = null;
    importedSession = null;
    nodes.exportRun.disabled = true;
    setExecutionState('changed — run again');
  }

  function parameterInput(parameter, index) {
    const wrapper = element('div', 'parameter-control');
    const label = element('label', 'field-label');
    const title = element('span', '', parameter.label);
    const input = document.createElement('input');
    input.id = `parameter-${index}`;
    input.dataset.parameterId = parameter.id;
    input.value = String(parameter.default);
    input.required = true;
    if (parameter.type === 'integer-list') {
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
    } else {
      input.type = 'number';
      input.step = String(parameter.step || (parameter.type === 'integer' ? 1 : 'any'));
      input.min = String(parameter.min);
      input.max = String(parameter.max);
      input.inputMode = parameter.type === 'integer' ? 'numeric' : 'decimal';
    }
    input.addEventListener('input', () => {
      if (parameter.id === 'table') updateFiniteMapDomains();
      markStale();
    });
    label.htmlFor = input.id;
    label.append(title, input);
    wrapper.append(label);
    if (parameter.description) wrapper.append(element('small', 'micro', parameter.description));
    if (parameter.type !== 'integer-list') {
      wrapper.append(element('small', 'parameter-range', `${parameter.min} to ${parameter.max}`));
    }
    return wrapper;
  }

  function renderParameterControls() {
    nodes.parameterControls.replaceChildren();
    baseExperiment.parameters.forEach((parameter, index) => {
      nodes.parameterControls.append(parameterInput(parameter, index));
    });
  }

  function readParameters() {
    const values = {};
    baseExperiment.parameters.forEach(parameter => {
      const input = nodes.parameterControls.querySelector(`[data-parameter-id="${parameter.id}"]`);
      if (!input) return;
      const raw = input.value.trim();
      if (!raw) throw new Error(`${parameter.label} is required.`);
      if (parameter.type === 'integer' || parameter.type === 'number') values[parameter.id] = Number(raw);
      else values[parameter.id] = raw;
    });
    return engine.normalizeParameters(baseExperiment, values);
  }

  function experimentWithParameters(parameters) {
    const defaults = engine.normalizeParameters(baseExperiment, engine.parameterDefaults(baseExperiment));
    if (engine.canonical(defaults) === engine.canonical(parameters)) return clone(baseExperiment);
    return engine.forkExperiment(baseExperiment, parameters, baseExperiment.observer);
  }

  function populateSweepControls() {
    const previous = nodes.sweepParameter.value;
    const numeric = baseExperiment.parameters.filter(parameter => ['integer', 'number'].includes(parameter.type));
    nodes.sweepParameter.replaceChildren();
    numeric.forEach(parameter => {
      const option = element('option', '', parameter.label);
      option.value = parameter.id;
      nodes.sweepParameter.append(option);
    });
    if (numeric.some(parameter => parameter.id === previous)) nodes.sweepParameter.value = previous;
    updateSweepBounds();
  }

  function effectiveParameterDomain(parameter) {
    const domain = {minimum: parameter.min, maximum: parameter.max};
    if (baseExperiment.family === 'finite-state' && parameter.id === 'start') {
      const tableInput = nodes.parameterControls.querySelector('[data-parameter-id="table"]');
      if (tableInput) domain.maximum = Math.min(domain.maximum, engine.parseTable(tableInput.value).length - 1);
    }
    return domain;
  }

  function updateSweepBounds(resetValues = true) {
    const parameter = baseExperiment.parameters.find(item => item.id === nodes.sweepParameter.value);
    if (!parameter) return;
    let domain;
    try { domain = effectiveParameterDomain(parameter); }
    catch (error) { return; }
    const oldMinimum = Number(nodes.sweepMin.min);
    const oldMaximum = Number(nodes.sweepMax.max);
    const currentMinimum = Number(nodes.sweepMin.value);
    const currentMaximum = Number(nodes.sweepMax.value);
    nodes.sweepMin.min = String(domain.minimum);
    nodes.sweepMin.max = String(domain.maximum);
    nodes.sweepMax.min = String(domain.minimum);
    nodes.sweepMax.max = String(domain.maximum);
    nodes.sweepMin.step = String(parameter.step || 'any');
    nodes.sweepMax.step = String(parameter.step || 'any');
    if (resetValues || !Number.isFinite(currentMinimum) || currentMinimum < domain.minimum || currentMinimum > domain.maximum || currentMinimum === oldMinimum) nodes.sweepMin.value = String(domain.minimum);
    if (resetValues || !Number.isFinite(currentMaximum) || currentMaximum < domain.minimum || currentMaximum > domain.maximum || currentMaximum === oldMaximum) nodes.sweepMax.value = String(domain.maximum);
  }

  function populateObserverControls() {
    const group = ['integer-map', 'finite-state', 'projection'].includes(baseExperiment.family) ? 'discrete' : 'continuous';
    const options = observerChoices[group];
    [nodes.observerLeft, nodes.observerRight].forEach((select, selectIndex) => {
      select.replaceChildren();
      options.forEach(([value, label]) => {
        const option = element('option', '', label);
        option.value = value;
        select.append(option);
      });
      select.value = options[Math.min(selectIndex, options.length - 1)][0];
    });
  }

  function populateAttackControls() {
    const stepParameter = baseExperiment.parameters.find(parameter => parameter.id === 'steps');
    const usesCases = ['integer-map', 'recurrence'].includes(baseExperiment.family);
    const usesTarget = baseExperiment.family === 'finite-state';
    nodes.attackCases.disabled = !usesCases;
    nodes.attackSteps.disabled = !stepParameter;
    nodes.attackTarget.disabled = !usesTarget;
    nodes.attackSteps.min = String(stepParameter ? stepParameter.min : 1);
    nodes.attackSteps.max = String(stepParameter ? stepParameter.max : baseExperiment.run_bounds.steps);
    nodes.attackSteps.value = String(stepParameter ? stepParameter.default : baseExperiment.run_bounds.steps);
    nodes.attackCases.min = baseExperiment.family === 'recurrence' ? '2' : '1';
    if (baseExperiment.family === 'finite-state') {
      const tableParameter = baseExperiment.parameters.find(parameter => parameter.id === 'table');
      const length = tableParameter ? engine.parseTable(tableParameter.default).length : 1;
      nodes.attackTarget.min = '0';
      nodes.attackTarget.max = String(length - 1);
      nodes.attackTarget.value = '0';
    }
  }

  function updateFiniteMapDomains() {
    if (!baseExperiment || baseExperiment.family !== 'finite-state') return;
    const tableInput = nodes.parameterControls.querySelector('[data-parameter-id="table"]');
    if (!tableInput) return;
    try {
      const maximum = engine.parseTable(tableInput.value).length - 1;
      const startInput = nodes.parameterControls.querySelector('[data-parameter-id="start"]');
      if (startInput) {
        const declared = baseExperiment.parameters.find(parameter => parameter.id === 'start');
        const effectiveMaximum = declared ? Math.min(declared.max, maximum) : maximum;
        startInput.max = String(effectiveMaximum);
        const currentStart = Number(startInput.value);
        if (!Number.isSafeInteger(currentStart) || currentStart < 0) startInput.value = '0';
        else if (currentStart > effectiveMaximum) startInput.value = String(effectiveMaximum);
      }
      nodes.attackTarget.min = '0';
      nodes.attackTarget.max = String(maximum);
      const current = Number(nodes.attackTarget.value);
      if (!Number.isSafeInteger(current) || current < 0) nodes.attackTarget.value = '0';
      else if (current > maximum) nodes.attackTarget.value = String(maximum);
      if (nodes.sweepParameter.value === 'start') updateSweepBounds(false);
    } catch (error) {
      // The engine reports the precise table error when the user runs the analysis.
    }
  }

  function updateRelatedObjects() {
    nodes.related.replaceChildren();
    baseExperiment.related_objects.forEach(reference => {
      const match = /^qeva:1:([^@]+)@(\d+)$/.exec(reference);
      const catalog = window.QEVA_DATA && window.QEVA_DATA.objects || [];
      const concept = catalog.find(item => item.ref === reference || (match && item.id === match[1]));
      const link = element('a', 'revision-chip', concept ? concept.title : (match ? humanize(match[1]) : reference));
      link.title = reference;
      link.href = match ? `../objects/${encodeURIComponent(match[1])}/r${match[2]}/index.html` : '../archive/index.html';
      nodes.related.append(link);
    });
  }

  function updateLocation() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('experiment', engine.exactRef(baseExperiment));
      if (currentMode === 'run') url.searchParams.delete('mode');
      else url.searchParams.set('mode', currentMode);
      window.history.replaceState(null, '', url);
    } catch (error) {
      /* The lab still works when opened from a local snapshot with a restricted URL. */
    }
  }

  function selectExperiment(identifier, preserveMode) {
    const selected = experiments.find(experiment => {
      const shortId = experiment.id.split(':').pop();
      return experiment.id === identifier || engine.exactRef(experiment) === identifier || shortId === identifier;
    }) || experiments.find(experiment => experiment.id.endsWith(':logistic-sensitivity')) || experiments[0];
    if (!selected) throw new Error('No experiment records are available.');
    baseExperiment = clone(selected);
    workingExperiment = clone(selected);
    baseRun = engine.runExperiment(baseExperiment, engine.parameterDefaults(baseExperiment));
    currentRun = null;
    modeResult = null;
    nodes.select.value = engine.exactRef(baseExperiment);
    nodes.title.textContent = baseExperiment.title;
    nodes.summary.textContent = baseExperiment.summary;
    nodes.identity.textContent = `${humanize(baseExperiment.family)} · ${baseExperiment.state_space.numeric_domain}`;
    nodes.experimentJson.textContent = engine.canonical(baseExperiment);
    renderParameterControls();
    populateSweepControls();
    populateObserverControls();
    populateAttackControls();
    updateFiniteMapDomains();
    updateRelatedObjects();
    if (!preserveMode) currentMode = 'run';
    activateMode(currentMode, false);
    runAnalysis();
  }

  function metricCard(key, value) {
    const card = element('div', 'metric-card');
    card.append(element('strong', '', formatValue(value)), element('span', '', humanize(key)));
    return card;
  }

  function renderMetrics(metrics) {
    nodes.metrics.replaceChildren();
    Object.keys(metrics).sort().forEach(key => nodes.metrics.append(metricCard(key, metrics[key])));
  }

  function safePlotNumber(value, logarithmic) {
    if (logarithmic && typeof value === 'string' && /^\d+$/.test(value)) {
      const trimmed = value.replace(/^0+/, '') || '0';
      if (trimmed === '0') return 0;
      const prefix = Number(trimmed.slice(0, Math.min(15, trimmed.length)));
      return trimmed.length - 1 + Math.log10(prefix / (10 ** (Math.min(15, trimmed.length) - 1)));
    }
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return logarithmic ? Math.log10(Math.max(1, Math.abs(number))) : number;
  }

  function drawSeries(series, summary, logarithmic) {
    nodes.plotSummary.textContent = summary;
    const canvas = nodes.canvas;
    const context = canvas.getContext && canvas.getContext('2d');
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    const padding = {left: 62, right: 24, top: 36, bottom: 42};
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#faf9f4';
    context.fillRect(0, 0, width, height);
    const normalized = series.map(item => ({
      ...item,
      values: item.values.map(value => safePlotNumber(value, logarithmic))
    })).filter(item => item.values.some(value => value !== null));
    const all = normalized.flatMap(item => item.values.filter(value => value !== null));
    if (!all.length) {
      context.fillStyle = '#24251f';
      context.font = '16px sans-serif';
      context.fillText('No numeric plot is available; inspect the text result below.', padding.left, height / 2);
      return;
    }
    let minimum = Math.min(...all);
    let maximum = Math.max(...all);
    if (minimum === maximum) { minimum -= 1; maximum += 1; }
    const length = Math.max(...normalized.map(item => item.values.length), 2);
    const x = index => padding.left + index * (width - padding.left - padding.right) / Math.max(1, length - 1);
    const y = value => padding.top + (maximum - value) * (height - padding.top - padding.bottom) / (maximum - minimum);
    context.strokeStyle = '#9a9b92';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding.left, padding.top);
    context.lineTo(padding.left, height - padding.bottom);
    context.lineTo(width - padding.right, height - padding.bottom);
    context.stroke();
    context.fillStyle = '#55574f';
    context.font = '13px ui-monospace, monospace';
    context.fillText(formatNumber(maximum), 6, padding.top + 5);
    context.fillText(formatNumber(minimum), 6, height - padding.bottom + 5);
    if (logarithmic) context.fillText('log10', 6, height - 10);
    normalized.forEach((item, seriesIndex) => {
      context.strokeStyle = item.color;
      context.lineWidth = seriesIndex === 0 ? 2.5 : 1.8;
      context.beginPath();
      let started = false;
      item.values.forEach((value, index) => {
        if (value === null) return;
        if (!started) { context.moveTo(x(index), y(value)); started = true; }
        else context.lineTo(x(index), y(value));
      });
      context.stroke();
      context.fillStyle = item.color;
      context.fillRect(padding.left + seriesIndex * 190, 12, 18, 3);
      context.fillStyle = '#24251f';
      context.fillText(item.label, padding.left + 24 + seriesIndex * 190, 17);
    });
  }

  function describeRun(run) {
    const result = run.result;
    const metrics = result.metrics;
    switch (baseExperiment.family) {
      case 'projection':
        return `${metrics.sample_count} exact integers produced ${metrics.class_count} observed classes modulo ${metrics.modulus}.`;
      case 'recurrence':
        return `Two binary64 trajectories ran for ${metrics.steps} steps. Their maximum observed separation was ${formatValue(metrics.maximum_separation)}. This is numerical evidence, not proof of chaos.`;
      case 'signal':
        return `${metrics.fine_samples} fine samples became ${metrics.macro_states} block observations. Mean squared discarded detail was ${formatValue(metrics.discarded_detail_mse)}.`;
      case 'optimization':
        return `${metrics.steps} seeded proposals found a best observed value of ${formatValue(metrics.best_value)} at position ${formatValue(metrics.best_position)}. This does not establish a global optimum.`;
      case 'integer-map':
        return `${metrics.transitions} exact transitions were emitted from ${metrics.start}; ${metrics.reached_one ? 'the bounded run reached 1' : '1 was not reached before the bound'}. Peak: ${metrics.peak}.`;
      case 'finite-state':
        return `${metrics.transitions_displayed} transitions were displayed across a declared ${metrics.states}-state map. ${metrics.cycle_length === null ? 'No repeat appeared before the step bound.' : `The displayed orbit entered a cycle of length ${metrics.cycle_length}.`}`;
      default:
        return 'A bounded run completed. Inspect the exact record below.';
    }
  }

  function plotRun(run) {
    const result = run.result;
    let series = [{label: 'primary', values: result.primary || [], color: '#20211c'}];
    let logarithmic = false;
    if (baseExperiment.family === 'recurrence') {
      series = [
        {label: 'x', values: result.primary, color: '#20211c'},
        {label: 'perturbed y', values: result.secondary, color: '#b24a3a'}
      ];
    } else if (baseExperiment.family === 'signal') {
      series = [
        {label: 'fine', values: result.primary, color: '#2864b8'},
        {label: 'coarse', values: result.secondary, color: '#b24a3a'}
      ];
    } else if (baseExperiment.family === 'integer-map') {
      logarithmic = true;
      series = [{label: 'integer magnitude', values: result.primary, color: '#20211c'}];
    } else if (baseExperiment.family === 'optimization') {
      series = [{label: 'observed objective', values: result.primary, color: '#2864b8'}];
    }
    drawSeries(series, describeRun(run), logarithmic);
  }

  function plotSweep(result) {
    drawSeries(
      [{label: sweepMetricLabel(), values: result.rows.map(row => row.metric), color: '#2864b8'}],
      `${result.rows.length} bounded runs sampled ${result.parameter} from ${formatValue(result.range[0])} to ${formatValue(result.range[1])}. Horizontal position is sample order; the vertical value is ${sweepMetricLabel().toLowerCase()}. See the table for exact parameter values.`,
      false
    );
  }

  function plotObserver(result) {
    drawSeries(
      [
        {label: result.left.kind, values: result.left.values, color: '#20211c'},
        {label: result.right.kind, values: result.right.values, color: '#b24a3a'}
      ],
      `The same underlying run was observed two ways. ${result.disagreement_count} of ${result.left.values.length} displayed positions received different observed labels.`,
      false
    );
  }

  function renderTrace(run) {
    nodes.trace.replaceChildren();
    const primary = run.result.primary || [];
    const secondary = run.result.secondary || [];
    const fragment = document.createDocumentFragment();
    primary.forEach((value, index) => {
      const row = document.createElement('tr');
      row.append(element('td', '', String(index)), element('td', '', formatValue(value)), element('td', '', secondary[index] === undefined ? '—' : formatValue(secondary[index])));
      fragment.append(row);
    });
    nodes.trace.append(fragment);
  }

  function renderObservations(observations) {
    nodes.observations.replaceChildren();
    if (!observations.length) {
      nodes.observations.append(element('p', 'notice', 'No analyzer is declared for this experiment and mode.'));
      return;
    }
    observations.forEach(observation => {
      const article = element('article', 'observation-card');
      const heading = element('div', 'observation-head');
      heading.append(element('h3', '', humanize(observation.kind)), element('span', 'status', observation.status));
      const evidence = element('p', 'micro', `${observation.evidence_class} · ${observation.proof_status}`);
      const scope = element('p', '', observation.claim_scope.replaceAll(currentRun.experiment_ref, workingExperiment.title));
      const method = element('p', 'observation-method', observation.method);
      const details = document.createElement('details');
      details.append(element('summary', '', 'Exact observation record'));
      const pre = element('pre', 'code-block', engine.canonical(observation));
      details.append(pre);
      article.append(heading, evidence, scope, method, details);
      nodes.observations.append(article);
    });
  }

  function appendList(container, title, entries, formatter) {
    container.append(element('h3', '', title));
    if (!entries.length) {
      container.append(element('p', 'notice', 'No differences were found within this comparison.'));
      return;
    }
    const list = document.createElement('ul');
    list.className = 'clean-list';
    entries.forEach(entry => list.append(element('li', '', formatter(entry))));
    container.append(list);
  }

  function renderRunMode() {
    const panel = element('section', 'mode-result');
    panel.append(element('h3', '', 'Run details'));
    panel.append(element('p', '', `${workingExperiment.title} produced ${currentRun.observations.length} observations under the displayed parameters and resource limits. Executable and version details are retained in the exact record.`));
    panel.append(element('p', 'notice', 'A bounded computation establishes only the finite scope stated by each observation. A resource-bounded stop is evidence about that partial trace, not a completed run or an unbounded theorem.'));
    nodes.modeOutput.append(panel);
  }

  function renderDiff(result) {
    const panel = element('section', 'mode-result');
    panel.append(element('p', 'notice', 'Baseline: the selected public experiment at its declared defaults. Current: the same experiment with only the displayed parameter defaults changed.'));
    panel.append(element('p', 'micro', `Baseline run ${result.base_run_sha256}; current run ${result.current_run_sha256}. Full results equal: ${result.results_equal ? 'yes' : 'no'}.`));
    const side = (change, name) => change[`${name}_present`] ? formatValue(change[name]) : '∅';
    const describe = change => `${change.path || '$'} · ${change.operation}: ${side(change, 'before')} → ${side(change, 'after')}`;
    const displayedInputs = result.input_changes.filter(change => /^\/parameters\/[0-9]+\/default$/.test(change.path));
    appendList(panel, 'Changed experiment defaults', displayedInputs, describe);
    appendList(panel, 'Changed effective run parameters', result.parameter_changes, describe);
    appendList(panel, 'Changed outputs', result.output_changes, describe);
    if (result.input_changes_truncated || result.parameter_changes_truncated || result.output_changes_truncated) panel.append(element('p', 'notice', `A difference section reached its explicit ${result.change_limit_per_section}-entry display bound.`));
    nodes.modeOutput.append(panel);
  }

  function renderObserver(result) {
    const panel = element('section', 'mode-result');
    panel.append(element('p', 'notice', `The underlying run hash is unchanged: ${result.same_underlying_run}. Only the observer changed.`));
    const stats = element('dl', 'comparison-stats');
    [
      ['First observer', `${result.left.kind}; ${result.left.distinct_states} visible states`],
      ['Second observer', `${result.right.kind}; ${result.right.distinct_states} visible states`],
      ['Different labels', `${result.disagreement_count} positions`]
    ].forEach(([term, description]) => {
      stats.append(element('dt', '', term), element('dd', '', description));
    });
    panel.append(stats);
    const scroll = element('div', 'table-scroll');
    const table = document.createElement('table');
    const caption = element('caption', '', 'Observed values for the same underlying run');
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Step', result.left.kind, result.right.kind].forEach(label => headRow.append(element('th', '', label)));
    head.append(headRow);
    const body = document.createElement('tbody');
    result.left.values.forEach((value, index) => {
      const row = document.createElement('tr');
      row.append(element('td', '', String(index)), element('td', '', formatValue(value)), element('td', '', formatValue(result.right.values[index])));
      body.append(row);
    });
    table.append(caption, head, body);
    scroll.append(table);
    panel.append(scroll);
    nodes.modeOutput.append(panel);
  }

  function sweepMetricLabel() {
    return {recurrence: 'Maximum separation', projection: 'Class count', signal: 'Discarded-detail mean squared error',
      optimization: 'Best objective value', 'integer-map': 'Transitions', 'finite-state': 'Detected cycle length (0 = not detected)'}[workingExperiment.family] || 'Measured value';
  }

  function renderSweep(result) {
    const panel = element('section', 'mode-result');
    panel.append(element('p', 'notice', `Requested ${result.requested_samples} samples; evaluated ${result.rows.length}. Stop: ${result.stopped_reason}. Intermediate parameter values are not covered by this finite sample.`));
    const scroll = element('div', 'table-scroll');
    const table = document.createElement('table');
    const caption = element('caption', '', `Sweep of ${result.parameter}`);
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Parameter', sweepMetricLabel(), 'Run completed within bound'].forEach(label => headRow.append(element('th', '', label)));
    head.append(headRow);
    const body = document.createElement('tbody');
    result.rows.forEach(item => {
      const row = document.createElement('tr');
      row.append(element('td', '', formatValue(item.value)), element('td', '', formatValue(item.metric)), element('td', '', item.complete ? 'yes' : 'no'));
      body.append(row);
    });
    table.append(caption, head, body);
    scroll.append(table);
    panel.append(scroll);
    nodes.modeOutput.append(panel);
  }

  function renderAttack(result) {
    const observation = result.observation;
    const panel = element('section', 'mode-result');
    const heading = element('div', 'observation-head');
    heading.append(element('h3', '', 'Bounded claim'), element('span', 'status', observation.status));
    panel.append(heading, element('p', '', result.claim));
    panel.append(element('p', 'micro', `${observation.evidence_class} · ${observation.proof_status}`));
    panel.append(element('p', '', observation.method));
    const resultBlock = element('pre', 'code-block', engine.canonical(observation.result));
    panel.append(resultBlock);
    panel.append(element('p', 'notice', observation.status === 'counterexample'
      ? 'The witness refutes only the bounded claim written above unless the claim itself was unbounded and the witness satisfies it.'
      : 'No counterexample was found inside the stated finite search. That is not evidence about cases outside the scope.'));
    nodes.modeOutput.append(panel);
  }

  function renderModeResult() {
    nodes.modeOutput.replaceChildren();
    if (currentMode === 'run') renderRunMode();
    else if (currentMode === 'diff') renderDiff(modeResult);
    else if (currentMode === 'observer') renderObserver(modeResult);
    else if (currentMode === 'sweep') renderSweep(modeResult);
    else if (currentMode === 'attack') renderAttack(modeResult);
  }

  function observerSpec(kind) {
    const parameters = {};
    if (kind === 'threshold') parameters.threshold = requiredNumber(nodes.observerThreshold, 'Observer threshold');
    if (kind === 'bins') parameters.bins = requiredNumber(nodes.observerBins, 'Observer bins');
    if (kind === 'remainder') parameters.modulus = requiredNumber(nodes.observerBins, 'Observer modulus');
    return {kind, parameters};
  }

  function requiredNumber(node, label) {
    const raw = node.value.trim();
    if (!raw) throw new Error(`${label} is required.`);
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
    return value;
  }

  function observerArtifact(kind) {
    const spec = observerSpec(kind);
    return {
      id: `local-${kind}-observer`,
      version: '1',
      kind,
      description: `Local ${kind} observer selected in the QEVA Mechanism Lab.`,
      parameters: spec.parameters
    };
  }

  function runAnalysis() {
    if (!baseExperiment) return;
    updateFiniteMapDomains();
    if (!nodes.form.checkValidity()) {
      nodes.form.reportValidity();
      setExecutionState('invalid input');
      return;
    }
    setError('');
    setExecutionState('running');
    try {
      const submittedParameters = readParameters();
      const parameters = {...submittedParameters};
      if (currentMode === 'sweep') {
        const defaults = engine.normalizeParameters(baseExperiment, engine.parameterDefaults(baseExperiment));
        parameters[nodes.sweepParameter.value] = defaults[nodes.sweepParameter.value];
      }
      workingExperiment = experimentWithParameters(parameters);
      currentRun = engine.runExperiment(workingExperiment, parameters);
      modeResult = null;
      modeOptions = {};
      importedSession = null;
      if (currentMode === 'diff') {
        modeOptions = {base_experiment: clone(baseExperiment)};
        modeResult = engine.compareRuns(baseExperiment, baseRun, workingExperiment, currentRun);
      } else if (currentMode === 'observer') {
        modeOptions = {left: observerSpec(nodes.observerLeft.value), right: observerSpec(nodes.observerRight.value)};
        modeResult = engine.observerSwitch(currentRun, modeOptions.left, modeOptions.right);
      } else if (currentMode === 'sweep') {
        const sweepOverrides = {...parameters};
        delete sweepOverrides[nodes.sweepParameter.value];
        modeOptions = {parameter: nodes.sweepParameter.value, minimum: requiredNumber(nodes.sweepMin, 'Sweep minimum'),
          maximum: requiredNumber(nodes.sweepMax, 'Sweep maximum'), samples: requiredNumber(nodes.sweepSamples, 'Sweep samples'), overrides: sweepOverrides};
        modeResult = engine.parameterSweep(workingExperiment, modeOptions.parameter, modeOptions.minimum, modeOptions.maximum, modeOptions.samples, modeOptions.overrides);
      } else if (currentMode === 'attack') {
        const attackOptions = {};
        if (!nodes.attackCases.disabled) attackOptions.max_cases = requiredNumber(nodes.attackCases, 'Attack cases');
        if (!nodes.attackSteps.disabled) attackOptions.steps = requiredNumber(nodes.attackSteps, 'Attack steps');
        if (!nodes.attackTarget.disabled) {
          attackOptions.target = requiredNumber(nodes.attackTarget, 'Attack target');
          attackOptions.table = parameters.table;
        }
        modeOptions = attackOptions;
        modeResult = engine.attack(workingExperiment, attackOptions);
      }
      renderCurrentOutput();
      updateLocation();
    } catch (error) {
      currentRun = null;
      modeResult = null;
      nodes.exportRun.disabled = true;
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  function renderCurrentOutput() {
    renderMetrics(currentRun.result.metrics);
    renderTrace(currentRun);
    renderObservations(currentMode === 'attack' ? [modeResult.observation] : currentRun.observations);
    renderModeResult();
    if (currentMode === 'sweep') plotSweep(modeResult);
    else if (currentMode === 'observer') plotObserver(modeResult);
    else plotRun(currentRun);
    nodes.experimentJson.textContent = engine.canonical(workingExperiment);
    setExecutionState(records.outcome(currentMode, currentRun, modeResult));
    nodes.exportRun.disabled = false;
  }

  function activateMode(mode, shouldRun) {
    if (!Object.prototype.hasOwnProperty.call(modes, mode)) return;
    currentMode = mode;
    nodes.tabs.forEach(tab => {
      const selected = tab.dataset.mode === mode;
      tab.setAttribute('aria-checked', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
    });
    nodes.observerControls.classList.toggle('hidden', mode !== 'observer');
    nodes.sweepControls.classList.toggle('hidden', mode !== 'sweep');
    nodes.attackControls.classList.toggle('hidden', mode !== 'attack');
    nodes.observerControls.disabled = mode !== 'observer';
    nodes.sweepControls.disabled = mode !== 'sweep';
    nodes.attackControls.disabled = mode !== 'attack';
    nodes.modeLabel.textContent = modes[mode].label;
    nodes.outputTitle.textContent = modes[mode].title;
    nodes.runButton.textContent = modes[mode].action;
    if (shouldRun) runAnalysis();
    else markStale();
  }

  function download(filename, value) {
    const blob = new Blob([engine.canonical(value)], {type: 'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function safeFilename(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function validateImportedShape(record) {
    const object = (value, name, required, allowed) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object.`);
      required.forEach(key => { if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error(`${name} is missing ${key}.`); });
      Object.keys(value).forEach(key => { if (!allowed.includes(key)) throw new Error(`${name} contains unknown field ${key}.`); });
    };
    object(record.state_space, 'state_space', ['kind','description','numeric_domain','bounds'], ['kind','description','numeric_domain','bounds']);
    object(record.observer, 'observer', ['id','version','kind','description','parameters'], ['id','version','kind','description','parameters']);
    object(record.randomness, 'randomness', ['algorithm','version','seed_parameter','deterministic'], ['algorithm','version','seed_parameter','deterministic']);
    object(record.run_bounds, 'run_bounds', ['steps','max_states','max_operations','timeout_ms'], ['steps','max_states','max_operations','timeout_ms']);
    object(record.executable, 'executable', ['engine','engine_version','artifact_sha256','kernel','kernel_version','representation','numeric_semantics'], ['engine','engine_version','artifact_sha256','kernel','kernel_version','representation','numeric_semantics']);
    object(record.provenance, 'provenance', ['created','creator','license','parent','source_refs'], ['created','creator','license','parent','source_refs']);
    object(record.stewardship, 'stewardship', ['steward','visibility','publication_state'], ['steward','visibility','publication_state']);
    ['entities','relations','operations','outputs'].forEach(name => {
      if (!record[name].every(item => item && typeof item === 'object' && !Array.isArray(item))) throw new Error(`${name} must contain only objects.`);
    });
    if (!record.boundary_conditions.every(item => typeof item === 'string')) throw new Error('boundary_conditions must contain only strings.');
    if (new Set(record.analyzers).size !== record.analyzers.length || record.analyzers.some(ref => !/^qeva-analyzer:1:[a-z0-9][a-z0-9._-]*@[1-9][0-9]*$/.test(ref))) throw new Error('analyzers must contain unique exact analyzer references.');
    if (new Set(record.related_objects).size !== record.related_objects.length || record.related_objects.some(ref => !/^qeva:1:[a-z0-9][a-z0-9._-]*@[1-9][0-9]*$/.test(ref))) throw new Error('related_objects must contain unique exact object references.');
    if (typeof record.provenance.created !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.provenance.created) || typeof record.provenance.creator !== 'string' || !record.provenance.creator || typeof record.provenance.license !== 'string' || !record.provenance.license || !Array.isArray(record.provenance.source_refs)) throw new Error('provenance fields are malformed.');
  }

  function exportExperiment() {
    try {
      const parameters = readParameters();
      const observer = currentMode === 'observer' ? observerArtifact(nodes.observerRight.value) : baseExperiment.observer;
      const fork = engine.forkExperiment(baseExperiment, parameters, observer);
      download(`${safeFilename(fork.id)}.json`, fork);
      setExecutionState('fork downloaded');
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  function exportRun() {
    if (!currentRun) {
      runAnalysis();
      if (!currentRun) return;
    }
    download(`${safeFilename(currentRun.experiment_ref)}-${currentMode}-run.json`, currentEnvelope());
    setExecutionState('run downloaded');
  }

  function currentEnvelope() {
    if (!currentRun) throw new Error('Run the current experiment before saving.');
    return importedSession || {local_export_version: '0.2', mode: currentMode, experiment: workingExperiment,
      run: currentRun, analysis: modeResult, analysis_options: modeOptions};
  }

  function expectedEngineHash() { return payload.experiments[0].executable.artifact_sha256; }

  function installRecord(source) {
    const decoded = records.decode(source, engine, expectedEngineHash());
    const record = decoded.experiment;
    validateImportedShape(record);
    const existing = experiments.find(experiment => engine.exactRef(experiment) === engine.exactRef(record));
    if (existing && engine.digest(existing) !== engine.digest(record)) throw new Error('This exact experiment reference already has different content. Create a fork or change its identifier.');
    engine.runExperiment(record, engine.parameterDefaults(record));
    if (!existing) experiments = experiments.concat([clone(record)]).sort((left, right) => left.title.localeCompare(right.title));
    renderExperimentOptions();
    selectExperiment(engine.exactRef(record), false);
    if (decoded.session) {
      const session = decoded.session;
      const options = session.analysis_options || {};
      const mode = decoded.analysis_verified ? session.mode : 'run';
      if (mode === 'observer') {
        nodes.observerLeft.value = options.left.kind; nodes.observerRight.value = options.right.kind;
        for (const spec of [options.left, options.right]) {
          if (spec.parameters.threshold !== undefined) nodes.observerThreshold.value = spec.parameters.threshold;
          if (spec.parameters.bins !== undefined) nodes.observerBins.value = spec.parameters.bins;
          if (spec.parameters.modulus !== undefined) nodes.observerBins.value = spec.parameters.modulus;
        }
      } else if (mode === 'sweep') {
        nodes.sweepParameter.value = options.parameter; updateSweepBounds();
        nodes.sweepMin.value = options.minimum; nodes.sweepMax.value = options.maximum; nodes.sweepSamples.value = options.samples;
      } else if (mode === 'attack') {
        if (options.max_cases !== undefined) nodes.attackCases.value = options.max_cases;
        if (options.steps !== undefined) nodes.attackSteps.value = options.steps;
        if (options.target !== undefined) nodes.attackTarget.value = options.target;
      } else if (mode === 'diff') {
        baseExperiment = clone(options.base_experiment);
        baseRun = engine.runExperiment(baseExperiment, engine.parameterDefaults(baseExperiment));
      }
      activateMode(mode, false);
      workingExperiment = clone(record); currentRun = clone(session.run);
      for (const parameter of record.parameters) {
        const control = document.querySelector(`[data-parameter-id="${parameter.id}"]`);
        const value = currentRun.parameters[parameter.id];
        if (control && value !== undefined) control.value = Array.isArray(value) ? value.join(', ') : String(value);
      }
      modeResult = decoded.analysis_verified ? clone(session.analysis) : null;
      modeOptions = clone(options); importedSession = clone(session);
      renderCurrentOutput();
      if (!decoded.analysis_verified) setExecutionState('run replayed; legacy attached analysis not replayed');
    } else setExecutionState('experiment imported');
    setError('');
  }

  function importExperiment(file) {
    if (!file) return;
    if (file.size > records.MAX_BYTES) { setError('Files must be 2 MB or smaller.'); return; }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try { installRecord(reader.result); }
      catch (error) { setError(`Import rejected: ${error instanceof Error ? error.message : String(error)}`); }
      finally { nodes.importFile.value = ''; }
    });
    reader.addEventListener('error', () => setError('The selected file could not be read.'));
    reader.readAsText(file);
  }

  function workspaceMessage(message) { nodes.workspaceStatus.textContent = message; }
  function refreshWorkspace(selected) {
    nodes.workspaceSelect.replaceChildren();
    for (const item of localStore.list()) {
      const option = element('option', '', item.label); option.value = item.id; nodes.workspaceSelect.append(option);
    }
    if (selected) nodes.workspaceSelect.value = selected;
    const empty = !nodes.workspaceSelect.options.length;
    byId('workspace-load').disabled = empty; byId('workspace-delete').disabled = empty;
  }
  function workspaceAction(action) {
    try {
      if (!localStore) throw new Error('Browser storage is unavailable. Export a JSON file instead.');
      action();
    } catch (error) { workspaceMessage(error.message || String(error)); }
  }
  function initializeWorkspace() {
    try { localStore = records.createStore(window.localStorage, engine, expectedEngineHash()); refreshWorkspace(); }
    catch (error) { workspaceMessage('Local storage is unavailable or unreadable. Export JSON to retain your work.'); }
    byId('workspace-save').addEventListener('click', () => workspaceAction(() => {
      const id = localStore.save(currentEnvelope(), nodes.workspaceName.value, nodes.workspaceNotes.value);
      refreshWorkspace(id); workspaceMessage('Saved in this browser.');
    }));
    byId('workspace-load').addEventListener('click', () => workspaceAction(() => {
      const entry = localStore.load(nodes.workspaceSelect.value);
      installRecord(entry.record); nodes.workspaceName.value = entry.label; nodes.workspaceNotes.value = entry.notes;
      workspaceMessage('Saved record loaded and replayed.');
    }));
    byId('workspace-delete').addEventListener('click', () => workspaceAction(() => {
      if (!window.confirm('Remove this saved entry from this browser? Export its run first to keep a copy.')) return;
      localStore.remove(nodes.workspaceSelect.value); refreshWorkspace(); workspaceMessage('Entry removed from this browser.');
    }));
  }

  function renderExperimentOptions() {
    const current = baseExperiment && engine.exactRef(baseExperiment);
    nodes.select.replaceChildren();
    experiments.forEach(experiment => {
      const option = element('option', '', `${experiment.title} · ${experiment.family}`);
      option.value = engine.exactRef(experiment);
      nodes.select.append(option);
    });
    if (current && experiments.some(experiment => engine.exactRef(experiment) === current)) nodes.select.value = current;
  }

  function bindEvents() {
    nodes.select.addEventListener('change', () => selectExperiment(nodes.select.value, true));
    nodes.form.addEventListener('submit', event => { event.preventDefault(); runAnalysis(); });
    nodes.tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activateMode(tab.dataset.mode, true));
      tab.addEventListener('keydown', event => {
        let next = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % nodes.tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + nodes.tabs.length) % nodes.tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = nodes.tabs.length - 1;
        else return;
        event.preventDefault();
        nodes.tabs[next].focus();
        activateMode(nodes.tabs[next].dataset.mode, true);
      });
    });
    nodes.sweepParameter.addEventListener('change', () => { updateSweepBounds(); markStale(); });
    [nodes.observerLeft, nodes.observerRight, nodes.observerThreshold, nodes.observerBins,
      nodes.sweepMin, nodes.sweepMax, nodes.sweepSamples,
      nodes.attackCases, nodes.attackSteps, nodes.attackTarget].forEach(node => {
      node.addEventListener('input', markStale);
      node.addEventListener('change', markStale);
    });
    nodes.importFile.addEventListener('change', () => importExperiment(nodes.importFile.files[0]));
    nodes.exportExperiment.addEventListener('click', exportExperiment);
    nodes.exportRun.addEventListener('click', exportRun);
  }

  function initialize() {
    if (!engine || !records || !payload || !Array.isArray(payload.experiments)) {
      setError('The local experiment catalog or Mechanism Engine did not load. The static JSON records remain available from the footer.');
      return;
    }
    experiments = payload.experiments.map(clone).sort((left, right) => left.title.localeCompare(right.title));
    if (!experiments.length) {
      setError('This release contains no experiment records.');
      return;
    }
    renderExperimentOptions();
    bindEvents();
    const query = new URLSearchParams(window.location.search);
    const requestedMode = query.get('mode');
    if (requestedMode && Object.prototype.hasOwnProperty.call(modes, requestedMode)) currentMode = requestedMode;
    selectExperiment(query.get('experiment') || 'logistic-sensitivity', true);
    initializeWorkspace();
  }

  initialize();
})();
