(function () {
  'use strict';

  const data = window.QEVA_DATA;
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-q');
  const kind = document.getElementById('search-kind');
  const results = document.getElementById('search-results');
  const count = document.getElementById('search-count');
  const fallback = document.getElementById('search-fallback');
  if (!data || !form || !input || !kind || !results || !count || !fallback) return;

  const esc = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const terms = value => normalize(value).replace(/[_−–—]/g, '-').split(/[^a-z0-9π+*/=<>()\-]+/).filter(Boolean);
  const entries = [];

  (data.objects || []).forEach(item => entries.push({
    type: 'concept', title: item.title, subtitle: `${item.kind} · ${item.lane} · ${item.verification}`,
    text: [item.title, item.plain, item.question, item.exact, item.example, ...(item.domains || []), ...(item.aliases || [])].join(' '),
    href: `../objects/${encodeURIComponent(item.id)}/index.html`
  }));
  (data.experiments || []).forEach(item => entries.push({
    type: 'experiment', title: item.title, subtitle: `${item.family} · runnable offline`,
    text: [item.title, item.summary, ...(item.formulae || [])].join(' '),
    href: `../lab/index.html?experiment=${encodeURIComponent(item.id)}`
  }));
  (data.history || []).forEach(item => entries.push({
    type: 'history', title: item.title, subtitle: `${item.date} · ${item.branch} · ${item.region}`,
    text: [item.date, item.branch, item.region, item.title, item.people, item.note, ...(item.source_refs || [])].join(' '),
    href: `../history/index.html?q=${encodeURIComponent(item.title)}`
  }));

  entries.forEach(entry => {
    entry.normalizedTitle = normalize(entry.title);
    entry.normalizedText = normalize(entry.text);
    entry.tokens = new Set(terms(entry.text));
  });

  function score(entry, queryTerms, raw) {
    let value = 0;
    if (entry.normalizedTitle === raw) value += 120;
    if (entry.normalizedTitle.startsWith(raw)) value += 60;
    if (entry.normalizedTitle.includes(raw)) value += 35;
    if (entry.normalizedText.includes(raw)) value += 18;
    queryTerms.forEach(term => {
      if (entry.tokens.has(term)) value += 12;
      else if (entry.normalizedText.includes(term)) value += 4;
    });
    return value;
  }

  function render(updateUrl) {
    const raw = normalize(input.value.trim());
    const selectedKind = kind.value;
    if (updateUrl) {
      const url = new URL(location.href);
      raw ? url.searchParams.set('q', input.value.trim()) : url.searchParams.delete('q');
      selectedKind ? url.searchParams.set('kind', selectedKind) : url.searchParams.delete('kind');
      try { history.replaceState(null, '', url.pathname + url.search); } catch (error) { /* Direct file snapshots may disallow URL mutation. */ }
    }
    if (!raw) {
      results.replaceChildren();
      fallback.hidden = false;
      count.textContent = 'Browse the complete local index below.';
      return;
    }
    const queryTerms = terms(raw);
    const matches = entries
      .filter(entry => !selectedKind || entry.type === selectedKind)
      .map(entry => ({entry, score: score(entry, queryTerms, raw)}))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
      .slice(0, 80);
    fallback.hidden = true;
    results.innerHTML = matches.map(({entry}) => `<li class="unified-result"><a href="${entry.href}"><span class="result-kind">${esc(entry.type)}</span><strong>${esc(entry.title)}</strong><span>${esc(entry.subtitle)}</span></a></li>`).join('');
    count.textContent = matches.length
      ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'} in this offline release.`
      : 'No local match. Try fewer words, a notation fragment, or browse the map.';
    if (!matches.length) results.innerHTML = '<li class="search-empty"><a href="../map/index.html">Browse the logical map</a> or inspect the <a href="../archive/index.html">complete current archive</a>.</li>';
  }

  form.addEventListener('submit', event => { event.preventDefault(); render(true); });
  input.addEventListener('input', () => render(true));
  kind.addEventListener('change', () => render(true));
  const params = new URLSearchParams(location.search);
  input.value = params.get('q') || '';
  if ([...kind.options].some(option => option.value === params.get('kind'))) kind.value = params.get('kind');
  render(false);
})();
