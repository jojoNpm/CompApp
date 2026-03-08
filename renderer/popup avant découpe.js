// =============================================
// POPUP.JS - VERSION COMPLÈTE CORRIGÉE
// =============================================
let currentScrapedProduct = null, currentEditProduct = null, chartInstance = null;

// ===============================
// FONCTION POUR L'ANIMATION DE LA MARQUE (inchangée)
// ===============================
function setupBrandSelector(product, containerId, brandElementId) {
  const container = document.getElementById(containerId);
  const brandDisplay = document.getElementById(brandElementId);
  const changeBtn = document.createElement('button');
  changeBtn.className = 'brand-select-button';
  changeBtn.textContent = 'Changer la marque';
  changeBtn.onclick = async () => {
    const brands = await window.api.getBrands();
    const dropdown = document.createElement('div');
    dropdown.className = 'brand-select-dropdown';
    const select = document.createElement('select');
    select.id = 'brand-select';
    select.innerHTML = brands.map(brand =>
      `<option value="${brand}" ${brand === product.brand ? 'selected' : ''}>${brand}</option>`
    ).join('');
    const actions = document.createElement('div');
    actions.className = 'dropdown-actions';
    actions.innerHTML = `
      <button class="btn update" id="confirm-brand-change">OK</button>
      <button class="btn delete" id="cancel-brand-change">Annuler</button>
    `;
    dropdown.append(select, actions);
    container.appendChild(dropdown);
    setTimeout(() => dropdown.classList.add('active'), 10);

    actions.querySelector('#confirm-brand-change').onclick = () => {
      const newBrand = select.value;
      brandDisplay.textContent = newBrand;
      product.brand = window.utils.normalizeBrand(newBrand);
      dropdown.classList.remove('active');
      setTimeout(() => dropdown.remove(), 300);
    };
    actions.querySelector('#cancel-brand-change').onclick = () => {
      dropdown.classList.remove('active');
      setTimeout(() => dropdown.remove(), 300);
    };
  };
  container.appendChild(changeBtn);
}

// ===============================
// FONCTIONS UTILITAIRES 
// ===============================
function formatPrice(price) {
  if (price == null) return 'N/A';
  return parseFloat(price).toFixed(2) + ' €';
}

// ===============================
// POPUP PRODUIT SCRAPÉ (inchangée)
// ===============================
async function showProductPopup(product, suggestions = []) {
  product.name = window.utils.extractBrandFromName(product.name, product.brand);
  product.brand = window.utils.normalizeBrand(product.brand);
  currentScrapedProduct = product;

  if (!product.canonicalName) {
    product.canonicalName = window.utils.generateCanonicalName(product.name);
  }

  const canonicalSuggestions = await window.api.getCanonicalSuggestions(product.canonicalName);
  const promoHtml = product.promotions?.label ?
    `<div style="margin-bottom:10px;">
      <strong>Promo :</strong><br>${product.promotions.label}<br>
      ${product.promotions.realPercent ? `<span style="color:green">-${product.promotions.realPercent}% réel</span>` : ''}
      ${product.promotions.promoPricePerKg ? `<span>${formatPrice(product.promotions.promoPricePerKg)}/kg</span>` : ''}
    </div>` : '';

  const popup = document.getElementById('popup');
  popup.innerHTML = `
    <div class="popupContent">
      <h3>Produit Scrapé</h3>
      <div><strong>Nom :</strong> ${product.name}</div>
      <div>
        <strong>Marque :</strong>
        <div id="brand-selector-container" class="brand-select-container">
          <span id="brand-display">${product.brand}</span>
        </div>
      </div>
      <div><strong>Site :</strong> ${product.site_name}</div>
      <div><strong>Prix :</strong> ${formatPrice(product.regular_price)}</div>
      ${promoHtml}
      <div><strong>€/kg :</strong> ${product.price_per_kg ? formatPrice(product.price_per_kg) : 'N/A'}</div>
      <div><strong>Poids :</strong> ${product.weight_raw}</div>
      <div><strong>URL :</strong><a href="#" class="product-link" data-url="${product.product_url}">Ouvrir</a></div>
      <div id="canonical-suggestions">
        <strong>Nom canonique :</strong>
        <div class="suggestions-list">
          ${canonicalSuggestions.map(s => `<div class="suggestion" data-suggestion="${s}">${s}</div>`).join('')}
          <div class="suggestion" id="other-suggestion">Autre...</div>
          <input id="custom-canonical" style="display:none; margin-top:10px; width:100%;" value="${product.canonicalName}">
        </div>
      </div>
      <div class="popupButtons" style="margin-top:20px;">
        <button id="add-to-table" class="btn update">Ajouter</button>
        <button id="close-popup" class="btn delete">Ignorer</button>
      </div>
    </div>
  `;

  popup.classList.remove('hidden');
   setupBrandSelector(currentScrapedProduct, 'brand-selector-container', 'brand-display');

  document.querySelectorAll('.suggestion').forEach(el => {
    el.onclick = () => {
      document.querySelectorAll('.suggestion').forEach(e => e.style.backgroundColor = '');
      el.style.backgroundColor = '#e6f2ff';
      if (el.id !== 'other-suggestion') {
        document.getElementById('custom-canonical').value = el.dataset.suggestion;
      } else {
        document.getElementById('custom-canonical').style.display = 'block';
        document.getElementById('custom-canonical').focus();
      }
    };
  });

  const customInput = document.getElementById('custom-canonical');
  if (customInput) customInput.oninput = () => currentScrapedProduct.canonicalName = customInput.value;

  document.getElementById('add-to-table').onclick = async () => {
    currentScrapedProduct.canonicalName = document.getElementById('custom-canonical').value ||
                                          window.utils.generateCanonicalName(product.name);
    if (window.api?.upsertProduct) {
      await window.api.upsertProduct(currentScrapedProduct);
      popup.classList.add('hidden');
      if (window.rendererLoadProducts) window.rendererLoadProducts();
    }
  };
  document.getElementById('close-popup').onclick = () => popup.classList.add('hidden');
}

// ===============================
// POPUP ÉDITION PRODUIT 
// ===============================
async function showEditPopup(product) {
  try {
    // 1. Initialisation des données
    product.name = window.utils.extractBrandFromName(product.name, product.brand);
    product.brand = window.utils.normalizeBrand(product.brand);
    currentEditProduct = {...product, history: [...(product.history || [])]};

    // Génère un nom canonique si absent
    if (!currentEditProduct.canonicalName) {
      currentEditProduct.canonicalName = window.utils.generateCanonicalName(product.name);
    }

    // 2. Génération du HTML
    const popup = document.getElementById('editPopup');
    popup.innerHTML = `
      <div class="popupContent">
        <h2>Modifier produit</h2>

        <label>Nom du produit</label>
        <input id="editName" value="${currentEditProduct.name || ''}">

        <label>Marque</label>
        <div id="edit-brand-selector-container" class="brand-select-container">
          <span id="edit-brand-display">${currentEditProduct.brand || ''}</span>
        </div>

        <label>Prix</label>
        <input id="editPrice" value="${currentEditProduct.regular_price || ''}">

        <label>% Promo site</label>
        <input id="editPromoSite" value="${currentEditProduct.promo_percent || ''}">

        <label>% Promo réel</label>
        <input id="editPromoReal" value="${currentEditProduct.promotions?.realPercent || ''}">

        <label>Poids</label>
        <input id="editWeight" value="${currentEditProduct.weight_raw || ''}">

        <label>Prix/kg</label>
        <input id="editKg" value="${currentEditProduct.price_per_kg || ''}">

        <label>Nom canonique</label>
        <input id="custom-canonical" value="${currentEditProduct.canonicalName || ''}">

        <h3>Historique des prix</h3>
        <div id="historyContainer"></div>
        <button id="addHistory" class="btn graph">Ajouter un prix</button>

        <div class="popupButtons">
          <button id="saveEdit" class="btn update">Sauvegarder</button>
          <button id="closeEdit" class="btn delete">Annuler</button>
        </div>
      </div>
    `;

    // 3. Récupération des éléments
    const historyContainer = document.getElementById('historyContainer');
    const addHistoryBtn = document.getElementById('addHistory');
    const saveEditBtn = document.getElementById('saveEdit');
    const closeEditBtn = document.getElementById('closeEdit');

    // 4. Configuration du sélecteur de marque
    setupBrandSelector(currentEditProduct, 'edit-brand-selector-container', 'edit-brand-display');

    // 5. Fonction pour créer une ligne d'historique
    function createHistoryRow(dateValue, priceValue) {
      const row = document.createElement('div');
      row.className = 'historyRow';
      row.innerHTML = `
        <input type="date" value="${dateValue || new Date().toISOString().split('T')[0]}">
        <input type="number" value="${priceValue || ''}" step="0.01" placeholder="Prix">
        <button class="deleteHistory">✕</button>
      `;
      row.querySelector('.deleteHistory').addEventListener('click', () => row.remove());
      return row;
    }

    // 6. Remplissage de l'historique existant
    if (currentEditProduct.history && currentEditProduct.history.length > 0) {
      currentEditProduct.history
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach(entry => {
          historyContainer.appendChild(createHistoryRow(entry.date, entry.price));
        });
    }

    // 7. Écouteur pour ajouter une ligne
    addHistoryBtn.addEventListener('click', () => {
      historyContainer.appendChild(createHistoryRow());
    });

    // 8. Écouteur pour le bouton Sauvegarder
    saveEditBtn.onclick = async function() {
      try {
        // Validation des champs
        const name = document.getElementById('editName').value.trim();
        if (!name) throw new Error("Le nom du produit est obligatoire");

        // Récupération des données
        const history = Array.from(historyContainer.children).map(row => {
          const [dateInput, priceInput] = row.querySelectorAll('input');
          const price = parseFloat(priceInput.value);
          return {
            date: dateInput.value,
            price: isNaN(price) ? null : price
          };
        }).filter(entry => entry.price !== null);

        // Tri chronologique
        history.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Construction de l'objet produit
        const updatedProduct = {
          ...currentEditProduct,
          name: name,
          brand: currentEditProduct.brand,
          regular_price: parseFloat(document.getElementById('editPrice').value) || 0,
          promo_percent: parseFloat(document.getElementById('editPromoSite').value) || 0,
          promotions: {
            label: currentEditProduct.promotions?.label || null,
            realPercent: parseFloat(document.getElementById('editPromoReal').value) || 0
          },
          weight_raw: document.getElementById('editWeight').value,
          price_per_kg: parseFloat(document.getElementById('editKg').value) || 0,
          canonicalName: document.getElementById('custom-canonical').value ||
                        window.utils.generateCanonicalName(name),
          history: history.map(h => ({
            ...h,
            date: h.date.includes('T') ? h.date : `${h.date}T00:00:00`
          }))
        };

        console.log("Produit à sauvegarder:", updatedProduct);

        // Sauvegarde via l'API
        const result = await window.api.upsertProduct(updatedProduct);
        console.log("Sauvegarde réussie:", result);

        // Fermeture et rechargement
        popup.classList.add('hidden');
        if (window.rendererLoadProducts) window.rendererLoadProducts();

      } catch (error) {
        console.error("Erreur sauvegarde:", error);
        alert(`Erreur: ${error.message}`);
      }
    };

    // 9. Écouteur pour Annuler
    closeEditBtn.onclick = () => {
      popup.classList.add('hidden');
    };

    popup.classList.remove('hidden');

  } catch (error) {
    console.error("Erreur dans showEditPopup:", error);
    alert(`Erreur: ${error.message}`);
  }
}


// ===============================
// POPUP HISTORIQUE AVEC ONGLETS
// ===============================
async function showHistoryPopup(product) {
  const popup = document.getElementById('historyPopup');
  popup.innerHTML = `
    <div class="popupContent" style="width: 900px;">
      <h2>Historique des prix - ${product.name}</h2>

      <!-- Onglets -->
      <div class="history-tabs">
        <button class="tab-button active" data-tab="table">Tableau</button>
        <button class="tab-button" data-tab="chart">Graphique</button>
      </div>

      <!-- Contenu des onglets -->
      <div class="tab-content active" data-tab="table">
        <table class="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Prix (€)</th>
            </tr>
          </thead>
          <tbody id="historyTableBody"></tbody>
        </table>
      </div>

      <div class="tab-content" data-tab="chart">
        <canvas id="historyChart" width="800" height="400"></canvas>
      </div>

      <button id="closeHistoryPopup" class="btn delete">Fermer</button>
    </div>
  `;

  try {
    const fullHistory = await window.api.getProductHistory(product.id);

    // Tableau
    const tableBody = document.getElementById('historyTableBody');
    if (fullHistory.length > 0) {
      tableBody.innerHTML = fullHistory.map(h => `
        <tr>
          <td>${h.date.split('T')[0]}</td>
          <td>${window.utils.formatPrice(h.price)}</td>
        </tr>
      `).join('');
    } else {
      tableBody.innerHTML = '<tr><td colspan="2">Aucun historique disponible</td></tr>';
    }

    // Graphique
    if (fullHistory.length > 0) {
      const ctx = document.getElementById('historyChart');
      if (window.historyChartInstance) {
        window.historyChartInstance.destroy();
      }

      window.historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: fullHistory.map(h => h.date.split('T')[0]),
          datasets: [{
            label: 'Prix (€)',
            data: fullHistory.map(h => h.price),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: false,
              title: { display: true, text: 'Prix (€)' }
            }
          }
        }
      });
    } else {
      document.querySelector('.tab-content[data-tab="chart"]').innerHTML =
        '<p style="text-align: center;">Aucune donnée disponible</p>';
    }

    // Gestion des onglets
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        button.classList.add('active');
        document.querySelector(`.tab-content[data-tab="${button.dataset.tab}"]`).classList.add('active');
      });
    });

    // Écouteur pour fermer
    document.getElementById('closeHistoryPopup').addEventListener('click', () => {
      popup.classList.add('hidden');
      if (window.historyChartInstance) {
        window.historyChartInstance.destroy();
        window.historyChartInstance = null;
      }
    });

    popup.classList.remove('hidden');

  } catch (error) {
    console.error("Erreur:", error);
    popup.innerHTML = `
      <div class="popupContent">
        <h2>Erreur</h2>
        <p>Impossible de charger l'historique: ${error.message}</p>
        <button id="closeHistoryPopup" class="btn delete">Fermer</button>
      </div>
    `;
    popup.classList.remove('hidden');
    document.getElementById('closeHistoryPopup').addEventListener('click', () => {
      popup.classList.add('hidden');
    });
  }
}

// ===============================
// POPUP GRAPHIQUE (inchangée)
// ===============================
function showChartPopup(selectedProducts) {
  const popup = document.getElementById('chartPopup');
  const canvas = document.getElementById('priceChart');

  if (window.chartInstance) {
    window.chartInstance.destroy();
    window.chartInstance = null;
  }

  if (selectedProducts.length > 0) {
    const product = selectedProducts[0];
    const labels = product.history?.map((_, i) => `J-${product.history.length - 1 - i}`) || [];
    const prices = product.history?.map(h => h.price) || [];

    window.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Prix (€)',
          data: prices,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${product.name} (${product.site_name})`
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Prix (€)'
            }
          }
        }
      }
    });
  }

  popup.classList.remove('hidden');
}

// Écouteur pour fermer le graphique
document.getElementById('closeChart').addEventListener('click', () => {
  document.getElementById('chartPopup').classList.add('hidden');
  if (window.chartInstance) {
    window.chartInstance.destroy();
    window.chartInstance = null;
  }
});

// ===============================
// CSS POUR L'ANIMATION ET LES ONGLETS
// ===============================
const style = document.createElement('style');
style.textContent = `
  /* Styles existants pour l'animation */
  .brand-select-container { position: relative; display: flex; align-items: center; width: 100%; margin-bottom: 10px; }
  .brand-select-button { background: linear-gradient(45deg, #ff9800, #ffb74d); color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-left: 10px; transition: all 0.3s ease; }
  .brand-select-button:hover { transform: translateY(-2px); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
  .brand-select-dropdown { position: absolute; left: 0; top: 100%; width: 100%; opacity: 0; max-height: 0; overflow: hidden; transition: all 0.3s ease; background: #3a3a3a; border-radius: 5px; z-index: 10; box-shadow: 0 4px 8px rgba(0,0,0,0.3); padding: 10px; margin-top: 5px; }
  .brand-select-dropdown.active { opacity: 1; max-height: 300px; }
  .brand-select-dropdown select { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #555; background: #444; color: white; margin-bottom: 10px; }
  .dropdown-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .dropdown-actions button { padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; }
  .historyRow { display: flex; gap: 10px; margin-bottom: 8px; align-items: center; }
  .historyRow input[type="date"] { width: 120px; }
  .historyRow input[type="number"] { width: 80px; }

/* Nouveaux styles pour les onglets */
  .history-tabs {
    display: flex;
    margin-bottom: 15px;
    border-bottom: 1px solid #ddd;
  }
  .tab-button {
    padding: 8px 16px;
    background: #f1f1f1;
    border: none;
    cursor: pointer;
    margin-right: 5px;
    border-radius: 4px 4px 0 0;
  }
  .tab-button.active {
    background: #fff;
    border-bottom: 2px solid #4CAF50;
    font-weight: bold;
  }
  .tab-content {
    display: none;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 0 0 4px 4px;
  }
  .tab-content.active {
    display: block;
  }
  .history-table {
    width: 100%;
    border-collapse: collapse;
  }
  .history-table th, .history-table td {
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  .history-table th {
    background-color: #f2f2f2;
  }
  .historyRow {
    display: flex;
    gap: 10px;
    margin-bottom: 8px;
    align-items: center;
  }
  .historyRow input[type="date"] { width: 120px; }
  .historyRow input[type="number"] { width: 80px; }
`;
document.head.appendChild(style);

// ===============================
// EXPORT POUR RENDERER.JS
// ===============================
window.showProductPopup = showProductPopup;
window.showEditPopup = showEditPopup;
window.showChartPopup = showChartPopup;
window.showHistoryPopup = showHistoryPopup;
