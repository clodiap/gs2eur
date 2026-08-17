const rateInput = document.getElementById('rate');
const enabledInput = document.getElementById('enabled');
const status = document.getElementById('status');
const fetchBtn = document.getElementById('fetchRate');
const saveBtn = document.getElementById('save');

function loadSettings() {
  chrome.storage.sync.get(['gs2eur_rate', 'gs2eur_enabled'], (data) => {
    rateInput.value = data.gs2eur_rate || 8000;
    enabledInput.checked = data.gs2eur_enabled !== false;
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
      status.textContent = `Taux mis à jour : 1 € = ${rate.toLocaleString('fr-FR')} ₲`;
    } else {
      status.textContent = "Impossible de récupérer le taux PYG (réessayez plus tard).";
    }
  } catch (e) {
    status.textContent = 'Erreur réseau lors de la récupération du taux.';
  }
});

loadSettings();
