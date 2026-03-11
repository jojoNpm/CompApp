// =======================================
// EDIT-PRODUCT.JS
// =======================================
let popupOverlay = null;
let popupContainer = null;
let currentProduct = null;

/**
 * Affiche la popup "Edit Product" complète
 */
function showEditPopup(product) {
  try {
    if (!product) {
      console.error("[EDIT] Produit non défini");
      return;
    }

    currentProduct = { ...product };
    popupOverlay = document.getElementById("popupOverlay");
    popupContainer = document.getElementById("popupContainer");

    if (!popupOverlay || !popupContainer) {
      console.error("[EDIT] Conteneurs popup manquants");
      alert("Les éléments de la popup sont manquants. Vérifiez le HTML.");
      return;
    }

    // Construction HTML de la popup
    popupContainer.innerHTML = `
      <h2 style="margin-top:0;">Modifier produit</h2>

      <!-- Nom canonique -->
      <div class="popup-field">
        <label>Nom canonique</label>
        <div id="canonicalWrapper">
          <input id="canonicalInput" value="${product.canonical_name || ''}" style="width:100%; padding:8px; background:#444; color:white; border:none; border-radius:5px;">
          <div id="canonicalSuggestions" style="margin-top:5px; display:flex; gap:10px;"></div>
        </div>
      </div>

      <!-- Nom produit -->
      <div class="popup-field">
        <label>Nom produit</label>
        <input id="productName" value="${product.name || ''}" style="width:100%; padding:8px; background:#444; color:white; border:none; border-radius:5px;">
      </div>

      <!-- URL produit -->
      <div class="popup-field">
        <label>URL produit</label>
        <input id="productUrl" value="${product.product_url || ''}" style="width:100%; padding:8px; background:#444; color:white; border:none; border-radius:5px;">
      </div>

      <!-- Marque -->
      <div class="popup-field" style="display:flex; align-items:center; justify-content:space-between;">
        <div>
          <label>Marque (Site: ${product.site || ''})</label>
          <span id="brandDisplay">${product.brand || ''}</span>
        </div>
        <button id="changeBrandBtn" class="popup-btn" style="background:#2196F3; color:white;">Changer la marque</button>
      </div>

      <!-- URL Marque -->
      <div class="popup-field">
        <label>URL marque</label>
        <input id="brandUrl" value="${product.brand_url || ''}" style="width:100%; padding:8px; background:#444; color:white; border:none; border-radius:5px;">
      </div>

      <!-- Poids -->
      <div class="popup-field">
        <label>Poids</label>
        <input id="weightInput" value="${product.weight || ''}" style="width:100%; padding:8px; background:#444; color:white; border:none; border-radius:5px;">
      </div>

      <!-- Boutons -->
      <div class="popup-buttons">
        <button id="saveBtn" class="popup-btn btn-save">Sauvegarder</button>
        <button id="cancelBtn" class="popup-btn btn-cancel">Annuler</button>
      </div>
    `;

    popupOverlay.classList.remove('hidden');

    // ---------- SUGGESTIONS NOM CANONIQUE ----------
    const canonicalInput = document.getElementById('canonicalInput');
    const canonicalSuggestions = document.getElementById('canonicalSuggestions');

    async function updateCanonicalSuggestions(query) {
      try {
        const res = await window.api.getCanonicalSuggestions(query);
        canonicalSuggestions.innerHTML = '';
        if (res.success && Array.isArray(res.suggestions)) {
          const suggestions = res.suggestions.slice(0, 2);
          suggestions.forEach(s => {
            const btn = document.createElement('button');
            btn.textContent = s;
            btn.className = 'popup-btn';
            btn.style.background = '#555';
            btn.style.color = 'white';
            btn.onclick = () => {
              canonicalInput.value = s;
            };
            canonicalSuggestions.appendChild(btn);
          });
          // "Autre" bouton
          const otherBtn = document.createElement('button');
          otherBtn.textContent = 'Autre';
          otherBtn.className = 'popup-btn';
          otherBtn.style.background = '#777';
          otherBtn.style.color = 'white';
          otherBtn.onclick = () => {
            canonicalInput.removeAttribute('readonly');
            canonicalInput.focus();
          };
          canonicalSuggestions.appendChild(otherBtn);
        }
      } catch (err) {
        console.error("[EDIT] getCanonicalSuggestions:", err);
      }
    }

    canonicalInput.addEventListener('input', () => {
      updateCanonicalSuggestions(canonicalInput.value);
    });

    // ---------- CHANGER MARQUE ----------
    const changeBrandBtn = document.getElementById('changeBrandBtn');
    const brandDisplay = document.getElementById('brandDisplay');
    const brandUrlInput = document.getElementById('brandUrl');

    changeBrandBtn.onclick = async () => {
      try {
        const res = await window.api.getAllBrands(); // suppose une liste de marques depuis DB
        if (res.success && Array.isArray(res.brands)) {
          const select = document.createElement('select');
          res.brands.forEach(b => {
            const option = document.createElement('option');
            option.value = b;
            option.textContent = b;
            if (b === currentProduct.brand) option.selected = true;
            select.appendChild(option);
          });
          select.onchange = async () => {
            const newBrand = select.value;
            brandDisplay.textContent = newBrand;
            // récupérer l'url de la nouvelle marque
            const urlRes = await window.api.getBrandUrl(newBrand);
            if (urlRes.success) brandUrlInput.value = urlRes.url || '';
          };
          // remplacer le bouton par le select
          changeBrandBtn.replaceWith(select);
        }
      } catch (err) {
        console.error("[EDIT] changer marque:", err);
      }
    };

    // ---------- BOUTON ANNULER ----------
    const cancelBtn = document.getElementById('cancelBtn');
    cancelBtn.onclick = () => {
      popupOverlay.classList.add('hidden');
    };

    // ---------- BOUTON SAUVEGARDER ----------
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.onclick = async () => {
      try {
        const updatedProduct = {
          id: product.id,
          canonical_name: canonicalInput.value.trim(),
          name: document.getElementById('productName').value.trim(),
          product_url: document.getElementById('productUrl').value.trim(),
          brand: brandDisplay.textContent,
          brand_url: brandUrlInput.value.trim(),
          weight: document.getElementById('weightInput').value.trim()
        };
        const result = await window.api.upsertProduct(updatedProduct);
        if (!result.success) throw new Error(result.error || "Erreur inconnue");

        popupOverlay.classList.add('hidden');
        if (typeof window.rendererLoadProducts === 'function') {
          window.rendererLoadProducts();
        }
      } catch (err) {
        console.error("[EDIT] Sauvegarde produit:", err);
        alert("Erreur: " + err.message);
      }
    };

    // Initialisation suggestions
    updateCanonicalSuggestions(canonicalInput.value);

  } catch (err) {
    console.error("[EDIT] Erreur globale:", err);
    alert("Erreur critique: " + err.message);
  }
}

window.showEditPopup = showEditPopup;
console.log("[EDIT] Module edit-product chargé");