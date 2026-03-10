// =======================================
// EDIT-PRODUCT.JS
// Popup édition produit
// =======================================

let currentProduct = null;

function closePopup() {

  const overlay = document.getElementById("popupOverlay");
  const container = document.getElementById("popupContainer");

  overlay.classList.add("hidden");
  container.innerHTML = "";

}

function showEditPopup(product) {

  try {

    console.log("[EDIT] Ouverture popup pour:", product.name);

    currentProduct = { ...product };

    const overlay = document.getElementById("popupOverlay");
    const container = document.getElementById("popupContainer");

    if (!overlay || !container) {
      console.error("[EDIT] Overlay ou container introuvable");
      return;
    }

    container.innerHTML = `

      <h2>Modifier produit</h2>

      <div class="popup-field">
        <label>Nom du produit</label>
        <input id="editName" value="${product.name || ""}">
      </div>

      <div class="popup-field">
        <label>URL produit</label>
        <input id="editUrl" value="${product.product_url || ""}">
      </div>

      <div class="popup-field">
        <label>Poids</label>
        <input id="editWeight" value="${product.weight || ""}">
      </div>

      <div class="popup-buttons">

        <button id="saveBtn" class="popup-btn btn-save">
          Sauvegarder
        </button>

        <button id="cancelBtn" class="popup-btn btn-cancel">
          Annuler
        </button>

      </div>

    `;

    overlay.classList.remove("hidden");

    setTimeout(() => {

      const saveBtn = document.getElementById("saveBtn");
      const cancelBtn = document.getElementById("cancelBtn");

      const nameInput = document.getElementById("editName");
      const urlInput = document.getElementById("editUrl");
      const weightInput = document.getElementById("editWeight");

      if (!saveBtn || !cancelBtn) {
        console.error("[EDIT] Boutons introuvables");
        return;
      }

      // -------------------------
      // Annuler
      // -------------------------

      cancelBtn.onclick = () => {

        console.log("[EDIT] Fermeture via Annuler");

        closePopup();

      };

      // -------------------------
      // Sauvegarder
      // -------------------------

      saveBtn.onclick = async () => {

        try {

          console.log("[EDIT] Sauvegarde produit...");

          const updatedProduct = {

            id: currentProduct.id,

            name: nameInput.value.trim(),

            product_url: urlInput.value.trim(),

            weight: weightInput.value.trim()

          };

          const result = await window.api.upsertProduct(updatedProduct);

          if (!result.success) {
            throw new Error(result.error || "Erreur sauvegarde");
          }

          console.log("[EDIT] Sauvegarde OK");

          closePopup();

          if (window.rendererLoadProducts) {
            window.rendererLoadProducts();
          }

        }
        catch (error) {

          console.error("[EDIT] Erreur sauvegarde:", error);

          alert("Erreur : " + error.message);

        }

      };

    }, 50);

  }
  catch (error) {

    console.error("[EDIT] Erreur globale:", error);

    alert("Erreur critique : " + error.message);

  }

}

// fermeture ESC

document.addEventListener("keydown", (e) => {

  if (e.key === "Escape") {

    const overlay = document.getElementById("popupOverlay");

    if (!overlay.classList.contains("hidden")) {
      closePopup();
    }

  }

});

window.showEditPopup = showEditPopup;

console.log("[EDIT] Module edit-product chargé");