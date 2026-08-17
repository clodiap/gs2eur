# ₲ Guaraní → € Euro

Extension pour navigateurs basés sur Chromium (**Brave**, Chrome, Edge...) qui détecte automatiquement les prix affichés en **Guaraní paraguayen (₲ / Gs. / PYG)** sur n'importe quelle page web et les convertit en **Euro (€)** en temps réel.

## ✨ Fonctionnalités

- Détection automatique des formats courants : `₲ 150.000`, `Gs. 150.000`, `150.000 Gs`, `PYG 150000`...
- Remplacement du prix par sa valeur en euro (ex : `18,75 €`), avec le montant original visible au survol.
- Fonctionne aussi sur les sites dynamiques (React, Vue, etc.) grâce à un `MutationObserver` qui surveille le contenu ajouté après le chargement initial.
- Taux de change réglable manuellement ou récupérable en un clic via une API gratuite.
- Activation / désactivation instantanée depuis le popup.

## 📦 Installation

1. Téléchargez ou clonez ce dépôt :
   ```bash
   git clone https://github.com/votre-utilisateur/gs2eur-extension.git
   ```
2. Ouvrez `brave://extensions` (ou `chrome://extensions` sur Chrome).
3. Activez le **Mode développeur** (coin supérieur droit).
4. Cliquez sur **Charger l'extension non empaquetée** et sélectionnez le dossier du projet.
5. L'icône de l'extension apparaît dans la barre d'outils.

## ⚙️ Configuration

Cliquez sur l'icône de l'extension pour ouvrir le popup :

- **Taux de change (₲ pour 1 €)** : renseignez le taux manuellement, ou cliquez sur **🔄 Récupérer le taux actuel** pour le récupérer automatiquement (via [open.er-api.com](https://www.exchangerate-api.com/)).
- **Activer la conversion** : bascule la conversion pour toutes les pages ouvertes.
- Cliquez sur **Enregistrer** pour appliquer les changements immédiatement, sans recharger la page.

## 🗂️ Structure du projet

```
gs2eur-extension/
├── manifest.json     # Configuration de l'extension (Manifest V3)
├── content.js        # Script injecté dans chaque page : détecte et convertit les prix
├── content.css        # Style du badge affichant le prix converti
├── popup.html          # Interface du popup
├── popup.js            # Logique du popup (réglages, récupération du taux)
└── README.md
```

## 🔍 Comment ça marche

`content.js` parcourt les nœuds de texte de la page à l'aide d'un `TreeWalker`, applique une expression régulière pour repérer les montants en guaraní, puis remplace chaque occurrence par un `<span>` contenant le montant converti. Les paramètres (taux, activation) sont stockés via `chrome.storage.sync` et synchronisés en direct grâce à `chrome.storage.onChanged`, sans avoir besoin de recharger l'onglet.

## ⚠️ Limitations connues

- Un prix découpé sur plusieurs éléments HTML distincts (ex : montant et devise dans deux balises séparées) peut ne pas être détecté.
- Les taux de change ne sont pas mis à jour automatiquement en continu : pensez à cliquer régulièrement sur **Récupérer le taux actuel**.
- L'extension modifie uniquement l'affichage ; elle n'interagit pas avec les formulaires, paniers d'achat ou processus de paiement.

## 📄 Licence

MIT — libre d'utilisation, de modification et de distribution.
