// ===============================
// Variables globales
// ===============================
let currentScrapedProduct = null;
let currentEditProduct = null;
let chartInstance = null;

const popupContainer = document.getElementById('popup');

// ===============================
// Utilitaires
// ===============================
function formatPrice(price) {
  if (price == null) return 'N/A';
  return parseFloat(price).toFixed(2) + ' €';
}

function hidePopup() {
  popupContainer.classList.add('hidden');
  popupContainer.innerHTML = '';
}

// ===============================
// Popup produit scrapé vertical
// ===============================
async function showProductPopup(product, suggestions = []) {
  currentScrapedProduct = product;

  let promoHtml = '';
  if (product.promotions?.label) {
    const percent = product.promotions.realPercent ?? 0;
    const priceKg = product.promotions.promoPricePerKg;
    promoHtml = `
      <div style="margin-bottom:10px;">
        <strong>Promo :</strong><br>
        ${product.promotions.label}<br>
        ${percent ? `<span style="color:green">-${percent}% réel</span>` : ''}
        ${priceKg ? `<span>${formatPrice(priceKg)}/kg</span>` : ''}
      </div>
    `;
  }

  popupContainer.innerHTML = `
    <div class="popup-content">
      <h3>Produit Scrapé</h3>

      <div class="line"><strong>Nom :</strong><span>${product.name}</span></div>
      <div class="line">
        <span><strong>Marque :</strong> ${product.brand}</span>
        <button id="change-brand-btn" class="btn update" style="padding:5px 10px;">Changer la marque</button>
      </div>
      <div class="line"><strong>Site :</strong><span>${product.site_name}</span></div>
      <div class="line"><strong>Prix :</strong><span>${formatPrice(product.regular_price)}</span></div>
      ${promoHtml}
      <div class="line"><strong>€/kg :</strong><span>${product.price_per_kg ? formatPrice(product.price_per_kg) : 'N/A'}</span></div>
      <div class="line"><strong>Poids :</strong><span>${product.weight_raw}</span></div>
      <div class="line"><strong>URL :</strong><a href="#" class="product-link" data-url="${product.product_url}">Ouvrir</a></div>

      <div id="canonical-suggestions">
        ${suggestions.map(s => `<div class="suggestion" data-suggestion="${s}">${s}</div>`).join('')}
        <div class="suggestion" id="other-suggestion">Autre...</div>
        <input id="custom-canonical" style="display:none">
      </div>

      <button id="add-to-table" class="btn update">Ajouter</button>
      <button id="close-popup" class="btn delete">Ignorer</button>
    </div>
  `;

  popupContainer.classList.remove('hidden');

  // Listeners
  document.getElementById('close-popup').onclick = hidePopup;
  document.getElementById('add-to-table').onclick = async () => {
    if(window.api?.addProduct) {
      await window.api.addProduct(currentScrapedProduct);
    }
    hidePopup();
    if(window.rendererLoadProducts) window.rendererLoadProducts();
  };

  const other = document.getElementById('other-suggestion');
  const customInput = document.getElementById('custom-canonical');
  document.querySelectorAll('.suggestion').forEach(el => {
    el.onclick = () => {
      document.querySelectorAll('.suggestion').forEach(e => e.style.backgroundColor = '');
      el.style.backgroundColor = '#e6f2ff';
      if(el.id !== 'other-suggestion') currentScrapedProduct.canonicalName = el.dataset.suggestion;
      if(el.id === 'other-suggestion') customInput.style.display = 'block';
    };
  });
  if(customInput) {
    customInput.oninput = () => currentScrapedProduct.canonicalName = customInput.value;
  }
}

// ===============================
// Export
// ===============================
window.showProductPopup = showProductPopup;
window.hidePopup = hidePopup;