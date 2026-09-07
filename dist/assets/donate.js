(function () {
  'use strict';

  const DAY = 24 * 60 * 60 * 1000;
  const SETTINGS = {
    readDelay: 4 * 60 * 1000,
    minimumArrivalDelay: 15 * 1000,
    scrollDepth: 0.7,
    visitTrigger: 3,
    closeCooldown: 60 * DAY,
    maybeLaterCooldown: 30 * DAY
  };

  const DONATION_OPTIONS = [
    {
      id: 'stripe',
      kind: 'link',
      label: 'Stripe',
      description: 'Card and local payment methods through Stripe.',
      url: 'https://buy.stripe.com/7sYaEW9vsdgk8ES8JC2kw00'
    },
    {
      id: 'paypal',
    enabled: false,
      kind: 'link',
      label: 'PayPal',
      description: 'Send a one-time contribution with PayPal.',
      url: 'REPLACE_WITH_PAYPAL_LINK'
    },
    {
      id: 'buy-me-a-coffee',
    enabled: false,
      kind: 'link',
      label: 'Buy Me a Coffee',
      description: 'A lightweight way to support small independent work.',
      url: 'REPLACE_WITH_BUY_ME_A_COFFEE_LINK'
    },
    {
      id: 'kofi',
    enabled: false,
      kind: 'link',
      label: 'Ko-fi',
      description: 'One-time support without a platform-heavy experience.',
      url: 'REPLACE_WITH_KOFI_LINK'
    },
    {
      id: 'github-sponsors',
    enabled: false,
      kind: 'link',
      label: 'GitHub Sponsors',
      description: 'Sponsor ongoing open research and tooling work.',
      url: 'REPLACE_WITH_GITHUB_SPONSORS_LINK'
    },
    {
      id: 'promptpay',
    enabled: false,
      kind: 'copy',
      label: 'PromptPay',
      description: 'PromptPay ID for Thai bank transfers.',
      valueLabel: 'PromptPay ID',
      value: 'REPLACE_WITH_PROMPTPAY_ID',
      qrImage: 'REPLACE_WITH_PROMPTPAY_QR_IMAGE_PATH'
    },
    {
      id: 'bitcoin',
      enabled: false,
      kind: 'copy',
      label: 'Bitcoin',
      description: 'BTC wallet address.',
      valueLabel: 'BTC address',
      value: 'REPLACE_WITH_BITCOIN_ADDRESS',
      qrImage: 'REPLACE_WITH_BITCOIN_QR_IMAGE_PATH'
    },
    {
      id: 'ethereum',
      enabled: false,
      kind: 'copy',
      label: 'Ethereum',
      description: 'ETH wallet address.',
      valueLabel: 'ETH address',
      value: 'REPLACE_WITH_ETHEREUM_ADDRESS',
      qrImage: 'REPLACE_WITH_ETHEREUM_QR_IMAGE_PATH'
    },
    {
      id: 'solana',
      enabled: false,
      kind: 'copy',
      label: 'Solana',
      description: 'SOL wallet address.',
      valueLabel: 'SOL address',
      value: 'REPLACE_WITH_SOLANA_ADDRESS',
      qrImage: 'REPLACE_WITH_SOLANA_QR_IMAGE_PATH'
    },
    {
      id: 'usdt',
      enabled: false,
      kind: 'copy',
      label: 'USDT',
      description: 'USDT wallet address. Set the network before publishing.',
      valueLabel: 'USDT address',
      value: 'REPLACE_WITH_USDT_ADDRESS',
      network: 'REPLACE_WITH_USDT_NETWORK',
      qrImage: 'REPLACE_WITH_USDT_QR_IMAGE_PATH'
    },
    {
      id: 'usdc',
      enabled: false,
      kind: 'copy',
      label: 'USDC',
      description: 'USDC wallet address. Set the network before publishing.',
      valueLabel: 'USDC address',
      value: 'REPLACE_WITH_USDC_ADDRESS',
      network: 'REPLACE_WITH_USDC_NETWORK',
      qrImage: 'REPLACE_WITH_USDC_QR_IMAGE_PATH'
    }
  ];

  const STORE_KEY = 'qeva.donation-state.v1';
  const VISIT_KEY = 'qeva.donation-visits.v1';
  const SESSION_KEY = 'qeva.donation-session-shown.v1';
  const VISIT_SESSION_KEY = 'qeva.donation-visit-counted.v1';
  const byId = id => document.getElementById(id);
  const now = () => Date.now();

  let layer = null;
  let dialog = null;
  let previousFocus = null;
  let promptScheduled = false;

  function isPlaceholder(value) {
    return !value || /^REPLACE_WITH_/i.test(String(value));
  }

  function isConfigured(value) {
    return !isPlaceholder(value);
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { /* Donation state is best-effort and must never break the site. */ }
  }

  function readState() {
    const state = readJson(STORE_KEY, {});
    return state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  }

  function updateState(patch) {
    const state = Object.assign({}, readState(), patch);
    writeJson(STORE_KEY, state);
    return state;
  }

  function markSessionShown() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (error) {}
  }

  function wasSessionShown() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (error) { return false; }
  }

  function isDonatePage() {
    return Boolean(byId('donate-page-methods'));
  }

  function donationUrl() {
    const script = document.currentScript || document.querySelector('script[src$="donate.js"]');
    const source = script && script.src ? script.src : 'assets/donate.js';
    return new URL('../donate/index.html', source).href;
  }

  function assetUrl(value) {
    if (!isConfigured(value)) return '';
    const script = document.currentScript || document.querySelector('script[src$="donate.js"]');
    const source = script && script.src ? script.src : 'assets/donate.js';
    try { return new URL(value, source).href; }
    catch (error) { return value; }
  }

  function shouldSuppressPrompt() {
    const state = readState();
    if (state.donated) return true;
    if (Number(state.dismissedUntil) > now()) return true;
    if (Number(state.maybeLaterUntil) > now()) return true;
    return wasSessionShown();
  }

  function countVisit() {
    try {
      if (sessionStorage.getItem(VISIT_SESSION_KEY) === location.pathname) return readJson(VISIT_KEY, {count: 0}).count || 0;
      sessionStorage.setItem(VISIT_SESSION_KEY, location.pathname);
    } catch (error) {}
    const visits = readJson(VISIT_KEY, {count: 0});
    const count = Math.min(999, Number(visits.count || 0) + 1);
    writeJson(VISIT_KEY, {count, updatedAt: new Date().toISOString()});
    return count;
  }

  function element(name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function configuredMethods() {
    return DONATION_OPTIONS.filter(option => option.enabled !== false);
  }

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
    const area = element('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    try { document.execCommand('copy'); }
    finally { area.remove(); }
    return Promise.resolve();
  }

  function methodCard(method) {
    const card = element('article', 'donate-method-card');
    const head = element('div', 'donate-method-head');
    head.append(element('h3', '', method.label));
    if (method.network && isConfigured(method.network)) head.append(element('span', 'status', method.network));
    card.append(head, element('p', '', method.description));

    if (method.kind === 'link') {
      const active = isConfigured(method.url);
      const link = element('a', active ? 'button' : 'button ghost donate-disabled', active ? `Open ${method.label}` : 'Add link');
      link.href = active ? method.url : '#';
      link.target = active ? '_blank' : '';
      link.rel = active ? 'noopener noreferrer' : '';
      link.setAttribute('aria-disabled', active ? 'false' : 'true');
      if (!active) link.addEventListener('click', event => event.preventDefault());
      card.append(link);
      return card;
    }

    const active = isConfigured(method.value);
    const copyRow = element('div', 'donate-copy-row');
    const value = element('code', 'donate-copy-value', active ? method.value : `${method.valueLabel} not configured`);
    const button = element('button', active ? 'button ghost' : 'button ghost donate-disabled', active ? 'Copy' : 'Add address');
    button.type = 'button';
    button.disabled = !active;
    button.addEventListener('click', () => {
      copyText(method.value).then(() => {
        const old = button.textContent;
        button.textContent = 'Copied';
        window.setTimeout(() => { button.textContent = old; }, 1600);
      });
    });
    copyRow.append(value, button);
    card.append(element('p', 'micro', method.valueLabel), copyRow);

    const qr = element('div', 'donate-qr');
    const image = assetUrl(method.qrImage);
    if (image) {
      const img = document.createElement('img');
      img.src = image;
      img.alt = `${method.label} QR code`;
      img.loading = 'lazy';
      qr.append(img);
    } else {
      qr.append(element('span', '', 'QR'));
    }
    card.append(qr);
    return card;
  }

  function renderMethods(target) {
    target.replaceChildren();
    const fragment = document.createDocumentFragment();
    configuredMethods().forEach(method => fragment.append(methodCard(method)));
    target.append(fragment);
  }

  function closeModal(mode) {
    if (!layer) return;
    if (mode === 'maybe') updateState({maybeLaterUntil: now() + SETTINGS.maybeLaterCooldown});
    else if (mode === 'donated') updateState({donated: true, donatedAt: new Date().toISOString()});
    else if (mode === 'close') updateState({dismissedUntil: now() + SETTINGS.closeCooldown});
    layer.classList.remove('is-visible');
    document.body.classList.remove('donate-open');
    window.setTimeout(() => { if (layer) layer.hidden = true; }, 180);
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({preventScroll: true});
  }

  function trapFocus(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal('close');
      return;
    }
    if (event.key !== 'Tab' || !dialog) return;
    const focusable = [...dialog.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(node => !node.hasAttribute('disabled') && node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function buildModal() {
    if (layer) return;
    layer = element('div', 'donate-layer');
    layer.hidden = true;
    layer.addEventListener('click', event => {
      if (event.target === layer) closeModal('close');
    });
    dialog = element('section', 'donate-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'donate-modal-title');
    dialog.setAttribute('aria-describedby', 'donate-modal-copy');

    const top = element('div', 'donate-dialog-top');
    const copy = element('div');
    copy.append(
      element('p', 'kicker', 'SUPPORT QEVA'),
      element('h2', '', 'Enjoying QEVA?')
    );
    copy.querySelector('h2').id = 'donate-modal-title';
    const close = element('button', 'donate-close', 'Close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close donation request');
    close.addEventListener('click', () => closeModal('close'));
    top.append(copy, close);

    const message = element('p', 'donate-dialog-copy', 'If this project has been useful, consider supporting future research, preservation work, and the small tools that keep the archive readable.');
    message.id = 'donate-modal-copy';

    const methods = element('div', 'donate-method-grid');
    renderMethods(methods);

    const actions = element('div', 'donate-dialog-actions');
    const maybe = element('button', 'button ghost', 'Maybe later');
    const donated = element('button', 'button ghost', 'I donated');
    maybe.type = 'button';
    donated.type = 'button';
    maybe.addEventListener('click', () => closeModal('maybe'));
    donated.addEventListener('click', () => closeModal('donated'));
    actions.append(maybe, donated);

    dialog.append(top, message, methods, actions);
    layer.append(dialog);
    document.body.append(layer);
    document.addEventListener('keydown', trapFocus);
  }

  function openModal(options) {
    if (options && options.auto && shouldSuppressPrompt()) return;
    buildModal();
    previousFocus = document.activeElement;
    layer.hidden = false;
    markSessionShown();
    document.body.classList.add('donate-open');
    requestAnimationFrame(() => {
      layer.classList.add('is-visible');
      const first = dialog.querySelector('a[href],button:not([disabled])');
      if (first) first.focus({preventScroll: true});
    });
  }

  function schedulePrompt() {
    if (promptScheduled || shouldSuppressPrompt() || isDonatePage()) return;
    promptScheduled = true;
    window.setTimeout(() => openModal({auto: true}), SETTINGS.minimumArrivalDelay);
  }

  function installPassiveButton() {
    if (isDonatePage() || readState().donated || Number(readState().dismissedUntil) > now() || Number(readState().maybeLaterUntil) > now()) return;
    const button = element('button', 'donate-float', 'Support QEVA');
    button.type = 'button';
    button.addEventListener('click', () => openModal());
    document.body.append(button);
    const reveal = () => {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      if (scrollY / scrollable > 0.25) button.classList.add('is-visible');
    };
    addEventListener('scroll', reveal, {passive: true});
    window.setTimeout(() => button.classList.add('is-visible'), 45 * 1000);
    reveal();
  }

  function installEngagementTriggers() {
    const visits = countVisit();
    if (visits >= SETTINGS.visitTrigger) schedulePrompt();
    window.setTimeout(schedulePrompt, SETTINGS.readDelay);
    const onScroll = () => {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      if (scrollY / scrollable >= SETTINGS.scrollDepth) {
        removeEventListener('scroll', onScroll);
        schedulePrompt();
      }
    };
    addEventListener('scroll', onScroll, {passive: true});
    onScroll();
  }

  function initialize() {
    const pageMethods = byId('donate-page-methods');
    if (pageMethods) renderMethods(pageMethods);
    document.querySelectorAll('[data-donate-open]').forEach(node => {
      node.addEventListener('click', event => {
        event.preventDefault();
        openModal();
      });
    });
    document.querySelectorAll('[data-donate-done]').forEach(node => {
      node.addEventListener('click', () => {
        updateState({donated: true, donatedAt: new Date().toISOString()});
        node.textContent = 'Thank you. Reminders are hidden.';
        node.disabled = true;
      });
    });
    installPassiveButton();
    installEngagementTriggers();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
