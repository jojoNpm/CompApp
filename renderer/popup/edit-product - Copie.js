// ===============================
// POPUP ÉDITION PRODUIT
// ===============================
let currentEditProduct = null;

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
    if (!popup) {
      console.error("Élément editPopup introuvable dans le DOM");
      return;
    }

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

    // 3. Récupération SÉCURISÉE des éléments
    const historyContainer = document.getElementById('historyContainer');
    const addHistoryBtn = document.getElementById('addHistory');
    const saveEditBtn = document.getElementById('saveEdit');
    const closeEditBtn = document.getElementById('closeEdit');

    // Vérification des éléments
    if (!historyContainer || !addHistoryBtn || !saveEditBtn || !closeEditBtn) {
      console.error("Éléments manquants dans le DOM:", {
        historyContainer: !!historyContainer,
        addHistoryBtn: !!addHistoryBtn,
        saveEditBtn: !!saveEditBtn,
        closeEditBtn: !!closeEditBtn
      });
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

      // Écouteur pour le bouton de suppression
      const deleteBtn = row.querySelector('.deleteHistory');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => row.remove());
      }

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

    // 7. Écouteur pour ajouter une ligne (avec vérification)
    if (addHistoryBtn) {
      addHistoryBtn.addEventListener('click', () => {
        historyContainer.appendChild(createHistoryRow());
      });
    }

    // 8. Écouteur pour le bouton Sauvegarder (avec vérification et LOGS)
    if (saveEditBtn) {
  saveEditBtn.onclick = async function() {
    try {
      // 1. Validation des champs
      const name = document.getElementById('editName').value.trim();
      if (!name) throw new Error("Le nom du produit est obligatoire");

      // 2. Récupération de l'historique
      const historyRows = document.querySelectorAll('#historyContainer .historyRow');
      const history = Array.from(historyRows).map(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length < 2) return null;
        return {
          date: inputs[0].value,
          price: parseFloat(inputs[1].value)
        };
      }).filter(entry => entry && !isNaN(entry.price));

      console.log("Historique récupéré:", history); // Log de debug

      // 3. Construction de l'objet produit
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
          date: h.date.includes('T') ? h.date : `${h.date}T00:00:00`,
          price: h.price
        }))
      };

      console.log("Produit à sauvegarder:", updatedProduct); // Log de debug

      // 4. Appel à l'API
      const result = await window.api.upsertProduct(updatedProduct);
      console.log("Résultat API:", result);

      // 5. Fermeture et rechargement
      popup.classList.add('hidden');
      if (window.rendererLoadProducts) window.rendererLoadProducts();

    } catch (error) {
      console.error("Erreur complète:", error);
      alert(`Erreur: ${error.message}`);
    }
  };
}

  } catch (error) {
    console.error("Erreur dans showEditPopup:", error);
    alert(`Erreur: ${error.message}`);
  }
}

// Export
window.showEditPopup = showEditPopup;
