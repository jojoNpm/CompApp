// ==============================
// HISTORY POPUP - Onglet Tableau Final
// ==============================

function showHistoryPopup(product) {
  const popup = document.getElementById('historyPopup');
  popup.style.display = 'flex';

  // ---- Carte produit (gauche) ----
  const cardContainer = document.getElementById('historyCardContainer');
  cardContainer.innerHTML = `
    <div class="product-card">
      <h3>${product.canonicalName || 'Inconnu'}</h3>
      <p><strong>Nom :</strong> ${product.name}</p>
      <p><strong>Marque :</strong> ${product.brand}</p>
      <p><strong>Site :</strong> ${product.site_name}</p>
    </div>
  `;

  // ---- Zone droite : scraping + formulaire ----
  const formContainer = document.getElementById('historyFormContainer');
  formContainer.innerHTML = `
    <button id="scrapeBtn" class="btn btn-scrape">📈 Mise à jour des prix</button>
    <div class="form-inputs">
      <input type="date" id="manualDate" class="input-field" placeholder="Date">
      <input type="number" step="0.01" id="manualPrice" class="input-field" placeholder="Prix €">
      <button id="addBtn" class="btn btn-add">+</button>
    </div>
  `;

  const addBtn = document.getElementById('addBtn');
  const scrapeBtn = document.getElementById('scrapeBtn');
  const dateInput = document.getElementById('manualDate');
  const priceInput = document.getElementById('manualPrice');
  const tableBody = document.getElementById('historyTableBody');

  // ---- Charger et afficher l'historique ----
  async function loadHistory() {
    const history = await window.api.getProductHistory(product.id);
    renderTable(history);
  }

  function renderTable(history) {
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    tableBody.innerHTML = '';
    history.forEach(h => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${h.date}</td>
        <td>${h.price.toFixed(2)} €</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // ---- Ajouter date/prix manuel ----
  addBtn.onclick = async () => {
    const dateVal = dateInput.value;
    const priceVal = parseFloat(priceInput.value);
    if (!dateVal || isNaN(priceVal)) return alert('Date et prix requis !');

    const history = await window.api.getProductHistory(product.id);
    const exists = history.find(h => h.date === dateVal);
    let proceed = true;

    if (exists) {
      proceed = confirm('Cette date existe déjà. Écraser les valeurs existantes ?');
    }

    if (proceed) {
      await window.api.addOrUpdateHistory(product.id, dateVal, priceVal);
      dateInput.value = '';
      priceInput.value = '';
      loadHistory();
    }
  };

  // ---- Scraping automatique ----
  scrapeBtn.onclick = async () => {
    scrapeBtn.disabled = true;
    scrapeBtn.textContent = '⏳ Mise à jour...';
    const result = await window.api.scrapeAndComparePrice(product);

    if (result.updated) {
      alert('✅ Nouveau prix ajouté : ' + result.price.toFixed(2) + ' €');
    } else {
      alert('ℹ Pas de changement de prix, date du jour ajoutée avec les mêmes valeurs.');
    }

    loadHistory();
    scrapeBtn.disabled = false;
    scrapeBtn.textContent = '📈 Mise à jour des prix';
  };

  // Chargement initial
  loadHistory();
}

// ---- Styles sombres et boutons stylés ----
const style = document.createElement('style');
style.textContent = `
#historyPopup {
  display: none;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #1e1e2f;
  color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.7);
  width: 85%;
  height: 70%;
  flex-direction: column;
  padding: 20px;
  font-family: sans-serif;
}

#historyPopup .product-card {
  background: #2b2b3c;
  padding: 15px;
  border-radius: 10px;
  margin-right: 20px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
}

#historyPopup .form-inputs {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.input-field {
  padding: 8px;
  border-radius: 6px;
  border: none;
  outline: none;
  width: 120px;
  text-align: center;
  background-color: #2b2b3c;
  color: #fff;
}

.input-field:focus {
  box-shadow: 0 0 5px #ff9a3c;
  background-color: #33334d;
}

.btn {
  cursor: pointer;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn:hover {
  transform: scale(1.1);
}

.btn-add {
  background: #ff9a3c;
  color: #1e1e2f;
}

.btn-scrape {
  background: #3c9aff;
  color: #fff;
  margin-bottom: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

table tr:nth-child(even) { background: #2b2b3c; }
table tr:hover { background: #444466; transform: scale(1.01); }
table td { padding: 8px; text-align: center; }
`;
document.head.appendChild(style);