// ===============================
// POPUP ÉDITION PRODUIT 
// ===============================
let currentEditProduct = null;

async function showEditPopup(product) {
  try {
    console.log("Ouverture de la popup pour:", product.name); // Log de debug

    // 1. Préparation des données
    product.name = window.utils.extractBrandFromName(product.name, product.brand);
    product.brand = window.utils.normalizeBrand(product.brand);
    currentEditProduct = {...product, history: [...(product.history || [])]};

    if (!currentEditProduct.canonicalName) {
      currentEditProduct.canonicalName = window.utils.generateCanonicalName(product.name);
    }

    // 2. Génération du HTML
    const popup = document.getElementById('editPopup');
    if (!popup) {
      console.error("Élément editPopup introuvable !");
      return;
    }

    popup.innerHTML = `
      <div class="popupContent">
        <h2>Modifier ${product.name}</h2>

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

    if (!historyContainer || !saveEditBtn || !closeEditBtn) {
      console.error("Éléments manquants dans la popup !");
      return;
    }

    // 4. Configuration du sélecteur de marque
    if (window.setupBrandSelector) {
      window.setupBrandSelector(currentEditProduct, 'edit-brand-selector-container', 'edit-brand-display');
    }

    // 5. Fonction pour créer une ligne d'historique
    function createHistoryRow(dateValue, priceValue) {
      const row = document.createElement('div');
      row.className = 'historyRow';
      row.innerHTML = `
        <input type="date" value="${dateValue || new Date().toISOString().split('T')[0]}">
        <input type="number" value="${priceValue || ''}" step="0.01" placeholder="Prix">
        <button class="deleteHistory">✕</button>
      `;

      row.querySelector('.deleteHistory').onclick = () => row.remove();
      return row;
    }

    // 6. Remplissage de l'historique existant
    if (currentEditProduct.history.length > 0) {
      currentEditProduct.history
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach(entry => {
          historyContainer.appendChild(createHistoryRow(entry.date, entry.price));
        });
    }

    // 7. Écouteur pour ajouter une ligne d'historique
    if (addHistoryBtn) {
      addHistoryBtn.onclick = () => {
        historyContainer.appendChild(createHistoryRow());
      };
    }

    // 8. Écouteur pour Sauvegarder
    saveEditBtn.onclick = async function() {
      try {
        const name = document.getElementById('editName').value.trim();
        if (!name) throw new Error("Le nom est obligatoire");

        const history = Array.from(historyContainer.children).map(row => {
          const inputs = row.querySelectorAll('input');
          if (inputs.length < 2) return null;
          return {
            date: inputs[0].value,
            price: parseFloat(inputs[1].value)
          };
        }).filter(entry => entry && !isNaN(entry.price));

        console.log("Historique à sauvegarder:", history); // Log de debug

        const updatedProduct = {
          ...currentEditProduct,
          name: name,
          regular_price: parseFloat(document.getElementById('editPrice').value) || 0,
          history: history.map(h => ({
            date: h.date.includes('T') ? h.date : `${h.date}T00:00:00`,
            price: h.price
          }))
        };

        console.log("Produit complet:", updatedProduct); // Log de debug

        const result = await window.api.upsertProduct(updatedProduct);
        console.log("Résultat API:", result);

        popup.classList.add('hidden');
        if (window.rendererLoadProducts) window.rendererLoadProducts();

      } catch (error) {
        console.error("Erreur:", error);
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

// Export global
window.showEditPopup = showEditPopup;
