// ===============================
// POPUP PRODUIT SCRAPÉ
// ===============================

let currentScrapedProduct = null;

async function showProductPopup(product, suggestions = []) {
  try {
    product.name = window.utils.extractBrandFromName(product.name, product.brand);
    product.brand = window.utils.normalizeBrand(product.brand);
    currentScrapedProduct = product;

    if (!product.canonicalName) {
      product.canonicalName = window.utils.generateCanonicalName(product.name);
    }

    const popup = document.getElementById("popup");
    if (!popup) return console.error("popup introuvable");

    const canonicalSuggestions = await window.api.getCanonicalSuggestions(product.canonicalName);

    popup.innerHTML = `
      <div class="popupContent">
      <h2>Produit détecté</h2>

      <label>Nom : </label><p>${product.name}</p>
      <label>Prix : </label><p>${product.price}</p>

      <label>Nom canonique</label>
      <input id="canonicalInput" list="canonicalList">

      <datalist id="canonicalList">
         ${canonicalSuggestions.map(s => `<option value="${s}">`).join("")}
      </datalist>

      <div class="popupButtons">
        <button id="saveScraped">Ajouter</button>
        <button id="cancelScraped">Annuler</button>
      </div>
      </div>
    `;

    document.getElementById("cancelScraped").onclick = () => popup.classList.add("hidden");

    document.getElementById("saveScraped").onclick = async () => {
      const canonical = document.getElementById("canonicalInput").value;
      product.canonicalName = canonical;

      await window.api.upsertProduct(product);
      popup.classList.add("hidden");
      if (window.rendererLoadProducts) window.rendererLoadProducts();
    };

    popup.classList.remove("hidden");

  } catch (err) {
    console.error("Erreur showProductPopup:", err);
  }
}

window.showProductPopup = showProductPopup;