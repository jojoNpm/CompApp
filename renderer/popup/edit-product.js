// ==============================
// EDIT PRODUCT POPUP - VERSION FINALE
// ==============================

function showEditPopup(product) {
  const popup = document.getElementById('editProductPopup');
  popup.style.display = 'flex';

  // ===== Contenu HTML =====
  const container = document.getElementById('editProductContainer');
  container.innerHTML = `
    <div class="product-edit-card">
      <h2>Modifier Produit</h2>
      <div class="field-group">
        <label>Nom canonique :</label>
        <input type="text" id="editCanonical" value="${product.canonicalName || ''}">
      </div>
      <div class="field-group">
        <label>Nom produit :</label>
        <input type="text" id="editName" value="${product.name || ''}">
      </div>
      <div class="field-group">
        <label>Marque :</label>
        <input type="text" id="editBrand" value="${product.brand || ''}">
      </div>
      <div class="field-group">
        <label>Site :</label>
        <input type="text" id="editSite" value="${product.site_name || ''}" disabled>
      </div>
      <div class="field-group">
        <label>Poids :</label>
        <input type="text" id="editWeight" value="${product.weight_raw || ''}">
      </div>
      <div class="button-row">
        <button id="saveEditBtn" class="btn btn-save">💾 Sauvegarder</button>
        <button id="closeEditBtn" class="btn btn-close">✖ Fermer</button>
      </div>
    </div>
  `;

  // ===== Écouteurs =====
  document.getElementById('saveEditBtn').onclick = async () => {
    const updatedProduct = {
      id: product.id,
      canonicalName: document.getElementById('editCanonical').value.trim(),
      name: document.getElementById('editName').value.trim(),
      brand: document.getElementById('editBrand').value.trim(),
      site_name: product.site_name,
      weight_raw: document.getElementById('editWeight').value.trim()
    };

    if (!updatedProduct.name) return alert('Le nom du produit est requis !');

    try {
      await window.api.upsertProduct(updatedProduct);
      alert('Produit mis à jour ✅');
      popup.style.display = 'none';
      if (window.rendererLoadProducts) window.rendererLoadProducts();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sauvegarde du produit.');
    }
  };

  document.getElementById('closeEditBtn').onclick = () => {
    popup.style.display = 'none';
  };
}

// ===== Exposer globalement pour renderer.js =====
window.showEditPopup = showEditPopup;

// ===== Styles sombres et modernes =====
const style = document.createElement('style');
style.textContent = `
#editProductPopup {
  display: none;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #1e1e2f;
  color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.7);
  width: 400px;
  padding: 20px;
  font-family: sans-serif;
  flex-direction: column;
}

.product-edit-card h2 {
  text-align: center;
  margin-bottom: 15px;
}

.field-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.field-group label {
  font-weight: bold;
  margin-bottom: 4px;
}

.field-group input {
  padding: 8px;
  border-radius: 6px;
  border: none;
  outline: none;
  background-color: #2b2b3c;
  color: #fff;
}

.field-group input:focus {
  box-shadow: 0 0 5px #ff9a3c;
  background-color: #33334d;
}

.button-row {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
}

.btn {
  cursor: pointer;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn:hover {
  transform: scale(1.1);
}

.btn-save {
  background: #3c9aff;
  color: #fff;
}

.btn-close {
  background: #ff4c4c;
  color: #fff;
}
`;
document.head.appendChild(style);