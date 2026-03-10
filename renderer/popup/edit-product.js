// =======================================
// EDIT PRODUCT POPUP
// =======================================

function showEditPopup(product) {

  const html = `
  <div class="popupContent">

    <h2>Modifier : ${product.name}</h2>

    <label>Nom du produit</label>
    <input id="editName" value="${product.name}" class="popupInput">

    <div class="popupButtons">

      <button id="saveEdit" class="btn update">
        Sauvegarder
      </button>

      <button id="cancelEdit" class="btn delete">
        Annuler
      </button>

    </div>

  </div>
  `;

  window.popupManager.open(html);

  // boutons

  document.getElementById("cancelEdit").onclick = () => {
    window.popupManager.close();
  };

  document.getElementById("saveEdit").onclick = async () => {

    try {

      const updatedProduct = {
        ...product,
        name: document.getElementById("editName").value.trim() || product.name
      };

      await window.api.upsertProduct(updatedProduct);

    } catch (error) {

      console.error("Erreur sauvegarde :", error);

    } finally {

      window.popupManager.close();

      if (window.rendererLoadProducts) {
        window.rendererLoadProducts();
      }

    }

  };

}

window.showEditPopup = showEditPopup;