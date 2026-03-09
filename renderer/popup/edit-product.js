// ===============================
// POPUP ÉDITION PRODUIT (VERSION CORRIGÉE AVEC HISTORIQUE INTÉGRÉ)
// ===============================
let currentEditProduct = null;

async function showEditPopup(product) {
  try {
    console.log("Ouverture de la popup pour:", product.name);

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

        <!-- Section principale -->
        <div class="mainSection">
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
        </div>

        <!-- Section Historique -->
        <div class="historySection">
          <h3>Historique des prix</h3>
          <div id="historyForm">
            <div class="historyInputRow">
              <input type="date" id="newHistoryDate" value="${new Date().toISOString().split('T')[0]}">
              <input type="number" id="newHistoryPrice" step="0.01" placeholder="Prix">
              <button id="addHistoryBtn" class="btn graph">Ajouter</button>
            </div>
          </div>

          <div id="historyTableContainer">
            <table id="historyTable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Prix (€)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="historyTableBody">
                <!-- Les lignes seront ajoutées dynamiquement -->
              </tbody>
            </table>
          </div>
        </div>

        <div class="popupButtons">
          <button id="saveEdit" class="btn update">Sauvegarder</button>
          <button id="closeEdit" class="btn delete">Annuler</button>
        </div>
      </div>
    `;

    // 3. Récupération des éléments
    const saveEditBtn = document.getElementById('saveEdit');
    const closeEditBtn = document.getElementById('closeEdit');
    const addHistoryBtn = document.getElementById('addHistoryBtn');
    const historyTableBody = document.getElementById('historyTableBody');

    if (!saveEditBtn || !closeEditBtn || !addHistoryBtn || !historyTableBody) {
      console.error("Éléments manquants dans la popup !");
      return;
    }

    // 4. Configuration du sélecteur de marque
    if (window.setupBrandSelector) {
      window.setupBrandSelector(currentEditProduct, 'edit-brand-selector-container', 'edit-brand-display');
    }

    // 5. Fonction pour afficher l'historique existant
    function renderHistoryTable() {
      historyTableBody.innerHTML = '';
      if (!currentEditProduct.history || currentEditProduct.history.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="3">Aucun historique</td></tr>';
        return;
      }

      // Tri par date décroissante
      const sortedHistory = [...currentEditProduct.history].sort((a, b) => new Date(b.date) - new Date(a.date));

      sortedHistory.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${entry.date}</td>
          <td>${entry.price.toFixed(2)} €</td>
          <td><button class="deleteHistoryEntry" data-date="${entry.date}">✕</button></td>
        `;
        historyTableBody.appendChild(row);
      });
    }

    // 6. Écouteur pour ajouter une nouvelle entrée d'historique
    addHistoryBtn.onclick = () => {
      const dateInput = document.getElementById('newHistoryDate');
      const priceInput = document.getElementById('newHistoryPrice');

      const date = dateInput.value;
      const price = parseFloat(priceInput.value);

      if (!date) {
        alert("Veuillez sélectionner une date.");
        return;
      }

      if (isNaN(price) || price <= 0) {
        alert("Veuillez saisir un prix valide (ex: 2.50).");
        return;
      }

      // Vérifie si la date existe déjà
      const dateExists = currentEditProduct.history.some(entry => entry.date === date);
      if (dateExists) {
        alert(`Un prix est déjà enregistré pour la date du ${date}. Une seule entrée par date est autorisée.`);
        return;
      }

      // Ajoute la nouvelle entrée
      currentEditProduct.history.push({ date, price });
      currentEditProduct.history.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Met à jour le tableau
      renderHistoryTable();

      // Réinitialise les champs
      priceInput.value = '';
    };

    // 7. Écouteur pour supprimer une entrée d'historique
    historyTableBody.addEventListener('click', (e) => {
      if (e.target.classList.contains('deleteHistoryEntry')) {
        const dateToDelete = e.target.dataset.date;
        currentEditProduct.history = currentEditProduct.history.filter(entry => entry.date !== dateToDelete);
        renderHistoryTable();
      }
    });

    // 8. Affiche l'historique existant
    renderHistoryTable();

    // 9. Écouteur pour Sauvegarder
    saveEditBtn.onclick = async function() {
      try {
        // 1. Validation des champs principaux
        const name = document.getElementById('editName').value.trim();
        if (!name) throw new Error("Le nom est obligatoire");

        // 2. Construction de l'objet produit
        const updatedProduct = {
          ...currentEditProduct,
          name: name,
          regular_price: parseFloat(document.getElementById('editPrice').value) || 0,
          history: currentEditProduct.history.map(h => ({
            date: h.date.includes('T') ? h.date : `${h.date}T00:00:00`,
            price: h.price
          }))
        };

        console.log("Produit à sauvegarder:", updatedProduct);

        // 3. Appel à l'API
        const result = await window.api.upsertProduct(updatedProduct);
        if (!result?.success) {
          throw new Error(result?.error || "Échec de la sauvegarde.");
        }

        // 4. Fermeture et rechargement
        popup.classList.add('hidden');
        if (window.rendererLoadProducts) window.rendererLoadProducts();

      } catch (error) {
        console.error("Erreur complète:", error);
        alert(`Erreur: ${error.message}`);
      }
    };

    // 10. Écouteur pour Annuler
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
