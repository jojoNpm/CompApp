// =============================================
// POPUP CORE - VERSION CENTRALISÉE ET ALIGNÉE
// =============================================

let popupOverlay = null;
let popupContainer = null;
let currentKeydownHandler = null;

// ===============================
// COULEURS SITES (GLOBAL)
// ===============================
const siteColors = {
  'Carrefour': '#1976d2',
  'Vegetal Food': '#89b944',
  'OVS': '#66cdaa',
  'Chronodrive': '#e3e300',
  'Intermarché': '#fa6d3d'
};

// ===============================
// CREATION OVERLAY
// ===============================
function createPopupOverlay() {
  if (popupOverlay) return;

  popupOverlay = document.createElement("div");
  popupOverlay.id = "popupOverlay";
  popupOverlay.className = "popup-overlay hidden";

  popupContainer = document.createElement("div");
  popupContainer.id = "popupContainer";

  popupOverlay.appendChild(popupContainer);
  document.body.appendChild(popupOverlay);

  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) closePopup();
  });
}

// ===============================
// OUVERTURE / FERMETURE POPUP
// ===============================
function openPopup(html) {
  createPopupOverlay();
  if (!popupContainer) return console.error("[POPUP] container introuvable");

  if (!html.includes("popup-container")) {
    html = `<div class="popup-container" id="popupInner">${html}</div>`;
  }

  popupContainer.innerHTML = html;
  popupOverlay.classList.remove("hidden");

  const inner = popupContainer.querySelector(".popup-container");
  if (inner) inner.addEventListener("click", (e) => e.stopPropagation());

  setTimeout(() => popupOverlay.classList.add("visible"), 10);
}

function closePopup() {
  if (!popupOverlay) return;

  popupOverlay.classList.remove("visible");

  if (currentKeydownHandler) {
    document.removeEventListener("keydown", currentKeydownHandler);
    currentKeydownHandler = null;
  }

  setTimeout(() => {
    popupOverlay.classList.add("hidden");
    if (popupContainer) popupContainer.innerHTML = "";
  }, 200);
}

// ===============================
// TOAST (centralisé dans toast.js)
// ===============================
function showToast(message, type = "info", duration = 2500) {
  if (window.toast) {
    if (type === "success") return window.toast.success(message, duration);
    if (type === "error") return window.toast.error(message, duration);
    if (type === "warning") return window.toast.warning(message, duration);
    return window.toast.show(message, duration);
  }

  const toast = document.createElement("div");
  toast.className = `popup-toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ===============================
// HEADER COMMUN (titre centré + site + image)
// =============================================
function buildHeader(product) {
  const siteColor = siteColors[product.site_name] || "#999";

  return `
    <div class="popup-header" style="display:flex;justify-content:space-between;align-items:center;gap:20px;">
      <div style="flex:1;text-align:center;">
        <h2 style="margin:0;" class="auto-width-text">${product.name}</h2>
        <div style="
          background:${siteColor};
          color:white;
          padding:4px 10px;
          border-radius:6px;
          display:inline-block;
          margin-top:6px;
          font-size:12px;
        ">
          ${product.site_name || "Site inconnu"}
        </div>
      </div>
      <div style="width:120px;">
        ${buildImageBlock(product)}
      </div>
    </div>
  `;
}

// ===============================
// IMAGE
// ===============================
function buildImageBlock(product) {
  if (product.image_url) {
    return `<div class="popup-product-image">
      <img src="${product.image_url}" loading="lazy" style="cursor:pointer;" onclick="window.popupCore.openImageZoom('${product.image_url}')" />
    </div>`;
  }

  return `<div class="popup-product-image">
    <div class="popup-image-placeholder">📦<span>Image non disponible</span></div>
  </div>`;
}

// ===============================
// IMAGE ZOOM (CLICK)
// =========================
function openImageZoom(url) {
  if (!url) return;

  openPopup(`<div class="popup-container" style="
    background:transparent;
    box-shadow:none;
    display:flex;
    justify-content:center;
    align-items:center;">
      <img src="${url}" style="
        max-width:90vw;
        max-height:90vh;
        border-radius:12px;
        box-shadow:0 10px 30px rgba(0,0,0,0.3);
        animation: zoomIn 0.2s ease;"
      />
  </div>`);
}

// ===============================
// NOUVELLE MARQUE (CENTRALISÉ)
// ===============================
function openNewBrandPopup(prefillName = "", siteName = "", callback) {
  if (!siteName) return console.error("[NEW BRAND] siteName manquant");

  const siteColor = siteColors[siteName] || "#999";

  const html = `
    <div class="popup-container">
      <div class="popup-header"><h3>➕ Nouvelle marque</h3></div>
      <div class="popup-body" style="display:flex;flex-direction:column;gap:12px;">
        <div>Site : <span style="background:${siteColor}; color:white; padding:4px 10px; border-radius:6px; font-size:12px; margin-left:6px;">${siteName}</span></div>
        <div class="popup-field">
          <label>Nom de la marque</label>
          <input id="newBrandName" class="editing-field" value="${prefillName || ""}" placeholder="Ex: Bjorg"/>
        </div>
        <div class="popup-field">
          <label>URL marque</label>
          <input id="newBrandUrl" class="editing-field" placeholder="https://..."/>
        </div>
      </div>
      <div class="popup-footer">
        <button id="cancelNewBrandBtn" class="btn-secondary">Annuler</button>
        <button id="addNewBrandBtn" class="btn-primary">Ajouter</button>
      </div>
    </div>
  `;

  openPopup(html);

  document.getElementById("cancelNewBrandBtn").onclick = closePopup;

  document.getElementById("addNewBrandBtn").onclick = async () => {
    const name = document.getElementById("newBrandName")?.value.trim();
    const url = document.getElementById("newBrandUrl")?.value.trim();

    if (!name) return showToast("⚠ Nom de marque obligatoire", "error");
    if (!url) return showToast("⚠ URL de marque obligatoire", "error");

    try {
      await window.api.upsertBrand({ brand_name: name, site_name: siteName, brand_url: url });
      showToast(`Marque ajoutée : ${name}`, "success");
      if (typeof callback === "function") callback(name, url, siteName);
      closePopup();
    } catch (err) {
      console.error("[NEW BRAND ERROR]", err);
      showToast("Erreur ajout marque", "error");
    }
  };
}

// ===============================
// ÉDITION GÉNÉRIQUE (centralisé)
// ===============================
function enableFieldEditing(id, product, key) {
  const field = document.getElementById(id);
  if (!field) return;

  field.onclick = () => {
    const input = document.createElement("input");
    input.className = "editing-field";
    input.value = product[key] || "";

    field.replaceWith(input);
    input.focus();

    input.onblur = () => {
      product[key] = input.value.trim();

      const div = document.createElement("div");
      div.id = id;
      div.className = "editable-field";
      div.innerText = product[key];

      input.replaceWith(div);
      enableFieldEditing(id, product, key);

      div.style.display = "inline-block";
      div.style.width = "auto";
    };
  };
}

// ===============================
// CANONICAL SUGGESTIONS (centralisé)
// ===============================
function setupCanonicalSuggestions(selector, displayId, product) {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.onclick = () => {
      const value = btn.innerText.trim();
      product.canonical_name = value;
      const display = document.getElementById(displayId);
      if (display) display.innerText = value;
      btn.classList.add("pulse");
      setTimeout(() => btn.classList.remove("pulse"), 300);
    };
  });
}

// ===============================
// SELECTEUR DE MARQUE (centralisé)
// ===============================
async function setupBrandSelector(displayId, dropdownId, product) {
  const display = document.getElementById(displayId);
  const container = document.getElementById(dropdownId);
  if (!display || !container) return;

  let brands = [];
  try {
    brands = await window.api.getAllBrandsWithSites();
  } catch (err) {
    console.error(err);
    showToast("Erreur chargement marques", "error");
    return;
  }

  const siteBrands = [...new Map(
    brands.map(b => [b.brand_name.toLowerCase(), b])
  ).values()].sort((a, b) => a.brand_name.localeCompare(b.brand_name));

  display.onclick = async () => {
    const existingDropdown = container.querySelector(".brand-dropdown");
    if (existingDropdown) {
      existingDropdown.remove();
      return;
    }

    let fuzzySuggestions = [];
    if (window.fuzzyMatchBrand) {
      const { detectedBrand } = await window.fuzzyMatchBrand(product.brand);
      fuzzySuggestions = siteBrands
        .filter(b => b.brand_name !== detectedBrand)
        .map(b => ({ ...b, score: similarityScore(product.brand, b.brand_name) }))
        .filter(b => b.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    }

    const dropdown = document.createElement("div");
    dropdown.className = "brand-dropdown active";

    dropdown.innerHTML = `
      ${fuzzySuggestions.length > 0 ? `<div class="brand-suggestion">
        Suggestions : ${fuzzySuggestions.map(s => s.brand_name).join(", ")}
      </div>` : ""}

      <input type="text" id="brandSearch" placeholder="Rechercher..." class="brand-search"/>
      <div class="brand-list">
        ${siteBrands.map(b => `<div class="brand-item" data-brand="${b.brand_name}">${b.brand_name}</div>`).join("")}
      </div>
    `;

    container.appendChild(dropdown);

    dropdown.querySelector("#brandSearch").oninput = (e) => {
      const s = e.target.value.toLowerCase();
      dropdown.querySelectorAll(".brand-item").forEach(i => {
        i.style.display = i.innerText.toLowerCase().includes(s) ? "block" : "none";
      });
    };

    dropdown.querySelectorAll(".brand-item").forEach(item => {
      item.onclick = async () => {
        product.brand = item.dataset.brand;
        product.isNewBrand = false;
        display.innerText = product.brand;

        await updateBrandUrlField(product);
        dropdown.remove();
      };
    });

    setTimeout(() => {
      document.addEventListener("click", function handler(e) {
        if (!container.contains(e.target)) {
          dropdown.remove();
          document.removeEventListener("click", handler);
        }
      });
    }, 0);
  };
}

// ===============================
// URL MARQUE CENTRALISÉ
// ===============================
async function updateBrandUrlField(product, fieldId = "scrapedBrandUrl") {
  try {
    const urlField = document.getElementById(fieldId);
    if (!urlField) return;

    if (!product.brand || !product.site_name) {
      if (urlField.tagName === "INPUT") urlField.value = "";
      else urlField.innerText = "";
      return;
    }

    const url = await window.api.getBrandUrl(product.brand, product.site_name);

    if (urlField.tagName === "INPUT") urlField.value = url || "";
    else urlField.innerText = url || "";

    urlField.classList.add("editable-hover");

  } catch (err) {
    console.error("Erreur updateBrandUrlField:", err);
  }
}

// ===============================
// UTILITAIRE : SCORE SIMILARITÉ
// ===============================
function similarityScore(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().replace(/[^a-z0-9]/g,"");
  b = b.toLowerCase().replace(/[^a-z0-9]/g,"");
  let score = 0;
  for (let c of a) if (b.includes(c)) score++;
  return score / Math.max(a.length, b.length);
}

// ===============================
// EXPORT
// ===============================
window.popupCore = {
  openPopup,
  closePopup,
  showToast,
  enableFieldEditing,
  setupCanonicalSuggestions,
  setupBrandSelector,
  updateBrandUrlField,
  buildHeader,
  buildImageBlock,
  openImageZoom,
  openNewBrandPopup
};

console.log("[POPUP CORE] VERSION CENTRALISÉE : header, auto-width, nouvelle marque animé");