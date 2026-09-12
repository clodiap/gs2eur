(() => {
  const CLASS_NAME = 'gs2eur-badge';
  const DEFAULT_RATE = 8000; // ₲ pour 1 € (valeur de secours si rien n'est enregistré)

  let RATE = DEFAULT_RATE;
  let ENABLED = true;
  let observer = null;

  // Détecte : ₲ 150.000 / Gs. 150.000 / PYG 150000 / 150.000 ₲ / 150.000 Gs
  const CURRENCY_REGEX = new RegExp(
    '(₲|Gs\\.?|PYG)\\s?(\\d{1,3}(?:[.,]\\d{3})+|\\d{4,})' +
    '|(\\d{1,3}(?:[.,]\\d{3})+|\\d{4,})\\s?(₲|Gs\\.?|PYG)\\b',
    'gi'
  );

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'IFRAME']);

  function parseGuaraniNumber(raw) {
    const cleaned = raw.replace(/[.,]/g, '');
    const value = parseInt(cleaned, 10);
    return Number.isNaN(value) ? null : value;
  }

  function formatEuro(value) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  function convertMatch(match) {
    const numberStr = match[2] || match[3];
    const original = parseGuaraniNumber(numberStr);
    if (original === null || original === 0) return null;
    const eur = original / RATE;
    return { originalText: match[0], eurText: formatEuro(eur) };
  }

  function shouldSkip(node) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el) {
      if (SKIP_TAGS.has(el.tagName)) return true;
      if (el.isContentEditable) return true;
      if (el.classList && el.classList.contains(CLASS_NAME)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function processTextNode(textNode) {
    if (!textNode.parentNode) return;
    if (shouldSkip(textNode)) return;
    const text = textNode.nodeValue;
    if (!text || !/₲|Gs\.?|PYG/i.test(text)) return;

    CURRENCY_REGEX.lastIndex = 0;
    let match;
    let lastIndex = 0;
    const frag = document.createDocumentFragment();
    let changed = false;

    while ((match = CURRENCY_REGEX.exec(text)) !== null) {
      const converted = convertMatch(match);
      if (!converted) continue;
      changed = true;

      const before = text.slice(lastIndex, match.index);
      if (before) frag.appendChild(document.createTextNode(before));

      const badge = document.createElement('span');
      badge.className = CLASS_NAME;
      badge.textContent = converted.eurText;
      badge.title = `Prix original : ${converted.originalText} (taux utilisé : 1 € = ${RATE.toLocaleString('fr-FR')} ₲)`;
      badge.dataset.original = converted.originalText;
      frag.appendChild(badge);

      lastIndex = match.index + match[0].length;
    }

    if (!changed) return;
    const after = text.slice(lastIndex);
    if (after) frag.appendChild(document.createTextNode(after));
    textNode.parentNode.replaceChild(frag, textNode);
  }

  // Certains sites (ex : AliExpress) éclatent un prix sur plusieurs <span>
  // ("Gs." / "46" / "." / "814") mais placent le montant complet dans un
  // attribut aria-label du conteneur, pour l'accessibilité. On s'appuie
  // dessus quand le texte brut ne suffit pas.
  function processAriaLabelElement(el) {
    if (shouldSkip(el)) return;
    if (el.closest('[data-gs2eur-aria-handled]')) return;

    const label = el.getAttribute('aria-label');
    if (!label || !/₲|Gs\.?|PYG/i.test(label)) return;

    CURRENCY_REGEX.lastIndex = 0;
    const match = CURRENCY_REGEX.exec(label);
    if (!match) return;
    const converted = convertMatch(match);
    if (!converted) return;

    // Reprend le style (couleur, taille) d'un des spans internes pour
    // que le badge s'intègre visuellement au reste de la page.
    const sampleSpan = el.querySelector('span[style]');
    const sampleStyle = sampleSpan ? sampleSpan.getAttribute('style') : '';

    const wrapper = document.createElement('span');
    wrapper.className = 'gs2eur-hidden-original';
    while (el.firstChild) {
      wrapper.appendChild(el.firstChild);
    }

    const badge = document.createElement('span');
    badge.className = CLASS_NAME;
    if (sampleStyle) badge.setAttribute('style', sampleStyle);
    badge.textContent = converted.eurText;
    badge.title = `Prix original : ${converted.originalText} (taux utilisé : 1 € = ${RATE.toLocaleString('fr-FR')} ₲)`;
    badge.dataset.original = converted.originalText;

    el.appendChild(wrapper);
    el.appendChild(badge);
    el.dataset.gs2eurAriaHandled = 'true';
    el.setAttribute('data-gs2eur-original-label', label);
    el.setAttribute('aria-label', converted.eurText);
  }

  function walkAriaLabels(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    const candidates = [];
    if (root.hasAttribute && root.hasAttribute('aria-label')) candidates.push(root);
    if (root.querySelectorAll) {
      root.querySelectorAll('[aria-label]').forEach((el) => candidates.push(el));
    }
    candidates.forEach(processAriaLabelElement);
  }

  function walk(root) {
    walkAriaLabels(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return shouldSkip(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(processTextNode);
  }

  function restoreAll() {
    // Restaure les conversions basées sur aria-label en premier, car leurs
    // badges vivent à l'intérieur d'un élément qu'il faut aussi "déplier".
    document.querySelectorAll('[data-gs2eur-aria-handled]').forEach((el) => {
      const wrapper = el.querySelector(':scope > .gs2eur-hidden-original');
      const badge = el.querySelector(':scope > .' + CLASS_NAME);
      if (wrapper) {
        while (wrapper.firstChild) el.insertBefore(wrapper.firstChild, wrapper);
        wrapper.remove();
      }
      if (badge) badge.remove();
      const originalLabel = el.getAttribute('data-gs2eur-original-label');
      if (originalLabel) el.setAttribute('aria-label', originalLabel);
      el.removeAttribute('data-gs2eur-original-label');
      delete el.dataset.gs2eurAriaHandled;
    });

    document.querySelectorAll('.' + CLASS_NAME).forEach((badge) => {
      const original = badge.dataset.original || badge.textContent;
      badge.replaceWith(document.createTextNode(original));
    });
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!ENABLED) return;
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
          } else if (node.nodeType === Node.ELEMENT_NODE && !shouldSkip(node)) {
            walk(node);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function applyState() {
    if (ENABLED) {
      walk(document.body);
      startObserver();
    } else {
      stopObserver();
      restoreAll();
    }
  }

  function init() {
    chrome.storage.sync.get(['gs2eur_rate', 'gs2eur_enabled'], (data) => {
      RATE = data.gs2eur_rate || DEFAULT_RATE;
      ENABLED = data.gs2eur_enabled !== false;
      applyState();
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    let needsRefresh = false;
    if (changes.gs2eur_rate) {
      RATE = changes.gs2eur_rate.newValue || DEFAULT_RATE;
      needsRefresh = true;
    }
    if (changes.gs2eur_enabled) {
      ENABLED = changes.gs2eur_enabled.newValue;
      needsRefresh = true;
    }
    if (needsRefresh) {
      restoreAll();
      applyState();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
