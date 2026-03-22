// =============================================
// EDIT-PRODUCT.JS
// Popup édition produit
// =============================================

let editingProduct = null;
let currentKeydownHandler = null;

// =============================================
// PUBLIC FUNCTION
// =============================================
window.showEditProductPopup = async function(product) {
  if (!product) {
    console.error("[EDIT] produit invalide");
    return;
  }

  editingProduct = { ...product };

  // =========================
  // IMAGE
  // =========================
  await resolveProductImage(editingProduct);

  // =========================
  // OPEN POPUP
  // =========================
  const html = buildPopupHTML(editingProduct);
  window.popupCore.openPopup(html);

  // =========================
  // BRAND SELECTOR
  // =========================
  await window.popupCore.setupBrandSelector(
    "editBrandDisplay",
    "editBrandSelectorContainer",
    editingProduct
  );

  // =========================
  // URL MARQUE AUTO
  // =========================
  await window.popupCore.updateBrandUrlField(editingProduct);

  // =========================
  // CANONICAL
  // =========================
  await loadCanonicalSuggestions();

  // =========================
  // URL bouton ouvrir
  // =========================
  window.popupCore.setupUrlOpen?.();

  // =========================
  // ➕ NOUVELLE MARQUE
  // =========================
  const addBrandBtn = document.getElementById("addNewBrandBtn");
  if (addBrandBtn) {
    addBrandBtn.onclick = () => {
      window.popupCore.openNewBrandPopup(
        editingProduct.brand,
        editingProduct.site_name,
        async (name, url) => {
          editingProduct.brand = name;
          editingProduct.brand_url = url;

          const display = document.getElementById("editBrandDisplay");
          if (display) display.innerText = name;

          await window.popupCore.updateBrandUrlField(editingProduct);
        }
      );
    };
  }

  // =========================
  // ACTIONS
  // =========================
  document.getElementById("editCancelBtn").onclick = () => window.popupCore.closePopup();

  document.getElementById("editSaveBtn").onclick = async () => {
    try {
      if (!editingProduct.brand || !(await window.api.isBrandKnown(editingProduct.brand))) {
        return window.popupCore.showToast("⚠ Marque non reconnue", "error");
      }

      editingProduct.name = document.getElementById("editNameField").value || "";
      editingProduct.canonical_name = document.getElementById("editCanonicalField").value || "";
      editingProduct.weight_raw = document.getElementById("editWeightField").value || "";
      editingProduct.product_url = document.getElementById("editProductUrlField").value || "";
      editingProduct.brand_url = document.getElementById("editBrandUrlField").value || "";

      const result = await window.api.upsertProduct(editingProduct);

      if (result.success) {
        (window.toast?.success || window.popupCore.showToast)("Produit modifié");
        window.popupCore.closePopup();
        window.rendererLoadProducts?.();
      }

    } catch (err) {
      console.error(err);
      (window.toast?.error || window.popupCore.showToast)("Erreur modification");
    }
  };

  // =========================
  // KEYBOARD
  // =========================
  setupKeyboard();
};

// =============================================
// IMAGE
// =============================================
async function resolveProductImage(product) {
  try {
    if (product.image_url) {
      product.image_source = "scraped";
      return; // Priorité à l'image scrapée
    }
    const img = await window.api.getCanonicalImage(product.canonical_name);
    if (img) {
      product.image_url = img;
      product.image_source = "database";
    } else {
      product.image_source = "none";
    }
  } catch (err) {
    console.error("[IMAGE]", err);
    product.image_source = "none";
  }
}

// =============================================
// BUILD HTML
// =============================================
function buildPopupHTML(product) {
  return `
<div class="popup-container product-popup">

  ${window.popupCore.buildHeader(product)}

  <div class="popup-body">

    <div class="popup-field">
      <label>Nom produit</label>
      <input type="text" id="editNameField" value="${product.name || ""}"/>
    </div>

    <div class="popup-field">
      <label>Nom canonique</label>
      <input type="text" id="editCanonicalField" value="${product.canonical_name || ""}"/>
      <div class="canonical-suggestions"></div>
    </div>

    <div class="popup-field">
      <label>Marque</label>

      <div class="brand-row" style="margin-top: 10px;">
        <div class="brand-main" style="flex: 1; text-align: center;">
          <div id="editBrandDisplay" class="brand-display" style="font-size: 14px; font-weight: bold;">${product.brand || ""}</div>
        </div>
        <div class="brand-actions" style="margin-left: 10px;">
          <span id="addNewBrandBtn" class="brand-add">➕ Nouvelle</span>
        </div>
      </div>

      <div id="editBrandSelectorContainer" style="margin-top: 6px;"></div>
    </div>

    <div class="popup-field">
      <label>Poids</label>
      <input type="text" id="editWeightField" value="${product.weight_raw || ""}"/>
    </div>

    <div class="popup-field">
      <label>URL produit</label>
      <div style="display:flex;gap:6px;">
        <input type="text" id="editProductUrlField" value="${product.product_url || ""}"/>
        <button class="open-url" data-url="${product.product_url || ""}">ouvrir</button>
      </div>
    </div>

    <div class="popup-field">
      <label>URL marque</label>
      <input type="text" id="editBrandUrlField" value="${product.brand_url || ""}"/>
    </div>

  </div>

  <div class="popup-footer">
    <button id="editCancelBtn" class="btn-secondary">Annuler</button>
    <button id="editSaveBtn" class="btn-primary">Mettre à jour</button>
  </div>

</div>
  `;
}

// =============================================
// CANONICAL SUGGESTIONS
// =============================================
async function loadCanonicalSuggestions() {
  try {
    const name = document.getElementById("editNameField")?.value;
    if (!name || !window.api?.getCanonicalSuggestions) return;

    const res = await window.api.getCanonicalSuggestions(name);
    if (!res.success) return;

    const suggestions = Array.isArray(res.suggestions) ? res.suggestions : [];

    const container = document.querySelector(".canonical-suggestions");
    if (!container) return;

    container.innerHTML = "";

    suggestions.slice(0, 2).forEach(s => {
      const div = document.createElement("div");
      div.className = "canonical-suggestion";
      div.innerText = s;

      div.onclick = () => {
        document.getElementById("editCanonicalField").value = s;
        editingProduct.canonical_name = s;
      };

      container.appendChild(div);
    });

    window.popupCore.setupCanonicalSuggestions(
      ".canonical-suggestion",
      "editCanonicalField",
      editingProduct
    );

  } catch (err) {
    console.warn("[CANONICAL]", err);
  }
}

// =============================================
// KEYBOARD
// =============================================
function setupKeyboard() {
  if (currentKeydownHandler) {
    document.removeEventListener("keydown", currentKeydownHandler);
  }

  currentKeydownHandler = (e) => {
    if (e.key === "Escape") window.popupCore.closePopup();
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      document.getElementById("editSaveBtn")?.click();
    }
  };

  document.addEventListener("keydown", currentKeydownHandler);
}

console.log("[EDIT POPUP] VERSION ALIGNÉE CORE");