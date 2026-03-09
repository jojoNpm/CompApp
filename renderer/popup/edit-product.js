// ===============================
// POPUP ÉDITION PRODUIT (SANS HISTORIQUE)
// ===============================

let currentEditProduct = null;

async function showEditPopup(product) {
  try {
    product.name = window.utils.extractBrandFromName(product.name, product.brand);
    product.brand = window.utils.normalizeBrand(product.brand);

    currentEditProduct = { ...product };

    if (!currentEditProduct.canonicalName) {
      currentEditProduct.canonicalName = window.utils.generateCanonicalName(product.name);
    }

    const popup = document.getElementById("editPopup");
    if (!popup) return console.error("Élément editPopup introuvable !");

    popup.innerHTML = `
      <div class="popupContent">
        <h2>Modifier ${product.name}</h2>

        <label>Nom du produit</label>
        <input id="editName" value="${currentEditProduct.name}">

        <label>Marque</label>
        <input id="editBrand" value="${currentEditProduct.brand}">

        <label>Prix</label>
        <input id="editPrice" value="${product.regular_price || ""}" type="number">

        <label>Poids</label>
        <input id="editWeight" value="${currentEditProduct.weight_raw || ""}">

        <label>Prix/kg</label>
        <input id="editKg" value="${product.price_per_kg || ""}" disabled>

        <label>Nom canonique</label>
        <input id="editCanonical" value="${currentEditProduct.canonicalName}">

        <div class="popupButtons">
          <button id="saveEdit" class="btn update">Sauvegarder</button>
          <button id="closeEdit" class="btn delete">Annuler</button>
        </div>
      </div>
    `;

    document.getElementById("saveEdit").onclick = async () => {
      try {
        const updatedProduct = {
          ...currentEditProduct,
          name: document.getElementById("editName").value.trim(),
          brand: document.getElementById("editBrand").value.trim(),
          regular_price: parseFloat(document.getElementById("editPrice").value),
          weight_raw: document.getElementById("editWeight").value.trim(),
          canonicalName: document.getElementById("editCanonical").value.trim()
        };

        const result = await window.api.upsertProduct(updatedProduct);
        if (!result.success) throw new Error(result.error);

        popup.classList.add("hidden");
        if (window.rendererLoadProducts) window.rendererLoadProducts();
      } catch (err) {
        alert("Erreur lors de la sauvegarde : " + err.message);
      }
    };

    document.getElementById("closeEdit").onclick = () => popup.classList.add("hidden");

    popup.classList.remove("hidden");

  } catch (err) {
    console.error("Erreur showEditPopup:", err);
  }
}

window.showEditPopup = showEditPopup;