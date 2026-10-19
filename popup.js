const rateInput = document.getElementById('rate');
const enabledInput = document.getElementById('enabled');
const status = document.getElementById('status');
const fetchBtn = document.getElementById('fetchRate');
const saveBtn = document.getElementById('save');
const gsInput = document.getElementById('gs');
const eurInput = document.getElementById('eur');
const rateHint = document.getElementById('rateHint');

// Dernier champ modifié par l'utilisateur : sert à recalculer l'autre
// quand le taux change.
let lastEdited = 'gs';

function currentRate() {
  const r = parseFloat(rateInput.value);
  return r > 0 ? r : null;
}

// --- Parsing / formatage -------------------------------------------------

// Guaraní : pas de centimes, tout séparateur est un séparateur de milliers.
function parseGs(str) {
  const digits = str.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

// Euro : accepte "18,5", "18.5", "1 234,56" ou "1.234,56".
function parseEur(str) {
  let s = str.replace(/[\s\u00a0\u202f€]/g, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(',', '.');
  }
  const v = parseFloat(s);
  return Number.isNaN(v) ? null : v;
}

function formatGs(value) {
  return Math.round(value).toLocaleString('es-PY');
}

function formatEur(value) {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// --- Conversion ----------------------------------------------------------

function updateHint() {
  const rate = currentRate();
  rateHint.textContent = rate
    ? `Taux utilisé : 1 € = ${rate.toLocaleString('es-PY')} ₲`
    : 'Renseignez un taux de change valide ci-dessous.';
}

function convertFromGs() {
  const rate = currentRate();
  const gs = parseGs(gsInput.value);
  if (!rate || gs === null) {
    eurInput.value = '';
    return;
  }
  eurInput.value = formatEur(gs / rate);
}

function convertFromEur() {
  const rate = currentRate();
  const eur = parseEur(eurInput.value);
  if (!rate || eur === null) {
    gsInput.value = '';
    return;
  }
  gsInput.value = formatGs(eur * rate);
}

gsInput.addEventListener('input', () => {
  lastEdited = 'gs';
  convertFromGs();
});

eurInput.addEventListener('input', () => {
  lastEdited = 'eur';
  convertFromEur();
});

rateInput.addEventListener('input', () => {
  updateHint();
  if (lastEdited === 'gs') convertFromGs();
  else convertFromEur();
});

// --- Réglages ------------------------------------------------------------

function loadSettings() {
  chrome.storage.sync.get(['gs2eur_rate', 'gs2eur_enabled'], (data) => {
    rateInput.value = data.gs2eur_rate || 8000;
    enabledInput.checked = data.gs2eur_enabled !== false;
    updateHint();
  });
}

saveBtn.addEventListener('click', () => {
  const rate = parseFloat(rateInput.value);
  if (!rate || rate <= 0) {
    status.textContent = 'Veuillez entrer un taux valide.';
    return;
  }
  chrome.storage.sync.set(
    { gs2eur_rate: rate, gs2eur_enabled: enabledInput.checked },
    () => {
      status.textContent = 'Paramètres enregistrés ✔ — la page va se mettre à jour.';
      setTimeout(() => (status.textContent = ''), 2500);
    }
  );
});

fetchBtn.addEventListener('click', async () => {
  status.textContent = 'Récupération du taux en cours...';
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR');
    const data = await res.json();
    if (data && data.rates && data.rates.PYG) {
      const rate = Math.round(data.rates.PYG);
      rateInput.value = rate;
      rateInput.dispatchEvent(new Event('input'));
      status.textContent = `Taux mis à jour : 1 € = ${rate.toLocaleString('es-PY')} ₲ (pensez à enregistrer)`;
    } else {
      status.textContent = 'Impossible de récupérer le taux PYG (réessayez plus tard).';
    }
  } catch (e) {
    status.textContent = 'Erreur réseau lors de la récupération du taux.';
  }
});

loadSettings();
