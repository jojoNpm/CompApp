// ===============================
// POPUP PRODUIT SCRAPÉ
// ===============================
let currentScrapedProduct = null;

async function showProductPopup(product, suggestions = []) {
  product.name = window.utils.extractBrandFromName(product.name, product.brand);
  product.brand = window.utils.normalizeBrand(product.brand);
  currentScrapedProduct = product;

  if (!product.canonicalName) {
    product.canonicalName = window.utils.generateCanonicalName(product.name);
  }

  const canonicalSuggestions = await window.api.getCanonicalSuggestions(product.canonicalName);
  const popup = document.getElementById('popup');
  popup.innerHTML = `
    <div class="popupContent">
      <h3>Produit Scrapé</h3>
      <!-- ... (ton HTML existant pour le produit scrapé) ... -->
    </div>
  `;

  // ... (le reste de ton code existant pour le produit scrapé)
  window.setupBrandSelector(currentScrapedProduct, 'brand-selector-container', 'brand-display');
}

// Export
window.showProductPopup = showProductPopup;
