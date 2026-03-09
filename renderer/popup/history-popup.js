// ===============================
// POPUP ÉDITION PRODUIT
// ===============================

let currentEditProduct = null;

function ensurePopupExists() {
  let popup = document.getElementById("editPopup");

  if (!popup) {
    popup = document.createElement("div");
    popup.id = "editPopup";
    popup.className = "popup hidden";

    popup.style.position = "fixed";
    popup.style.top = "0";
    popup.style.left = "0";
    popup.style.width = "100%";
    popup.style.height = "100%";
    popup.style.background = "rgba(0,0,0,0.6)";
    popup.style.display = "flex";
    popup.style.alignItems = "center";
    popup.style.justifyContent = "center";
    popup.style.zIndex = "9999";

    document.body.appendChild(popup);
  }

  return popup;
}

async function showEditPopup(product) {
  try {

    const popup = ensurePopupExists();

    product.name = window.utils.extractBrandFromName(product.name, product.brand);
    product.brand = window.utils.normalizeBrand(product.brand);

    currentEditProduct = { ...product };

    if (!currentEditProduct.canonicalName) {
      currentEditProduct.canonicalName =
        window.utils.generateCanonicalName(product.name);
    }

    popup.innerHTML = `
      <div style="
        background:#1e1e1e;
        padding:25px;
        border-radius:10px;
        width:420px;
        color:white;
        box-shadow:0 0 20px rgba(0,0,0,0.5);
        display:flex;
        flex-direction:column;
        gap:10px;
      ">

        <h2 style="margin-top:0;">Modifier produit</h2>

        <label>Nom produit</label>
        <input id="editName" value="${currentEditProduct.name}">

        <label>Marque</label>
        <input id="editBrand" value="${currentEditProduct.brand}">

        <label>Prix (€)</label>
        <input id="editPrice" type="number" step="0.01"
        value="${currentEditProduct.regular_price || ""}">

        <label>Poids</label>
        <input id="editWeight" value="${currentEditProduct.weight_raw || ""}">

        <label>Prix/kg</label>
        <input disabled value="${currentEditProduct.price_per_kg || ""}">

        <label>Nom canonique</label>
        <input id="editCanonical"
        value="${currentEditProduct.canonicalName || ""}">

        <div style="
          display:flex;
          justify-content:flex-end;
          gap:10px;
          margin-top:15px;
        ">
          <button id="closeEdit">Annuler</button>
          <button id="saveEdit">Sauvegarder</button>
        </div>

      </div>
    `;

    popup.classList.remove("hidden");

    // ======================
    // BOUTON ANNULER
    // ======================

    document.getElementById("closeEdit").onclick = () => {
      popup.classList.add("hidden");
    };

    // ======================
    // BOUTON SAUVEGARDER
    // ======================

    document.getElementById("saveEdit").onclick = async () => {
      try {

        const updatedProduct = {
          ...currentEditProduct,
          name: document.getElementById("editName").value.trim(),
          brand: document.getElementById("editBrand").value.trim(),
          regular_price: parseFloat(
            document.getElementById("editPrice").value
          ),
          weight_raw: document.getElementById("editWeight").value.trim(),
          canonicalName: document
            .getElementById("editCanonical")
            .value.trim()
        };

        const result = await window.api.upsertProduct(updatedProduct);

        if (!result || !result.success) {
          throw new Error(result?.error || "Erreur sauvegarde");
        }

        popup.classList.add("hidden");

        if (window.rendererLoadProducts) {
          window.rendererLoadProducts();
        }

      } catch (err) {
        console.error(err);
        alert("Erreur sauvegarde : " + err.message);
      }
    };

  } catch (err) {
    console.error("Erreur showEditPopup:", err);
  }
}

window.showEditPopup = showEditPopup;