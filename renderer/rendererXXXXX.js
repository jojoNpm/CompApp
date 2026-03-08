document.addEventListener('DOMContentLoaded', () => {

let scrapedData;
const popup = document.getElementById('popup');

/* =======================================================
UTILITAIRES
======================================================= */

function formatPrice(price) {
  if (price === null || price === undefined) return 'N/A';
  return parseFloat(price).toFixed(2) + ' €';
}

function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR');
}

/* =======================================================
PROMO ENRICHMENT
======================================================= */

function enrichPromoData(product) {

  if (!product.promotions) {
    product.promotions = {};
  }

  const label =
    product.promotions.label ||
    product.promoLabel ||
    product.promotion_label ||
    '';

  let realPercent = product.promotions.realPercent;
  let promoPricePerKg = product.promotions.promoPricePerKg;

  if (realPercent === undefined && label.match(/2[eè]?m?e?\s*(?:à|a)\s*-(\d+)%/i)) {

    const match2nd = label.match(/2[eè]?m?e?\s*(?:à|a)\s*-(\d+)%/i);
    const percent = parseInt(match2nd[1], 10);

    realPercent = Math.round(percent / 2);

    if (product.price_per_kg) {
      promoPricePerKg = +(product.price_per_kg * (1 - realPercent / 100)).toFixed(2);
    }

  }

  product.promotions.label = label;
  product.promotions.realPercent = realPercent;
  product.promotions.promoPricePerKg = promoPricePerKg;

}

/* =======================================================
CANONICAL SUGGESTIONS
======================================================= */

async function getCanonicalSuggestions(name) {
  return await window.api.getCanonicalSuggestions(name);
}

/* =======================================================
POPUP LISTENERS
======================================================= */

function attachPopupListeners() {

  const closeBtn = popup.querySelector('#close-popup');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      popup.style.display = 'none';
    });
  }

  const addBtn = popup.querySelector('#add-to-table');

  if (addBtn) {

    addBtn.addEventListener('click', async () => {

      try {

        if (!scrapedData.canonicalName) {

          const selectedSuggestion = document.querySelector('.suggestion[style*="background-color"]');

          if (selectedSuggestion) {
            scrapedData.canonicalName = selectedSuggestion.dataset.suggestion;
          } else {
            scrapedData.canonicalName = document.getElementById('custom-canonical').value;
          }

        }

        const result = await window.api.addProduct(scrapedData);

        if (result.success) {

          popup.style.display = 'none';
          await loadProducts();

        } else {
          alert(`Erreur : ${result.error}`);
        }

      } catch (err) {
        console.error(err);
      }

    });

  }

}

/* =======================================================
CANONICAL CLICK
======================================================= */

function attachCanonicalSuggestionListeners() {

  document.querySelectorAll('.suggestion').forEach(el => {

    el.addEventListener('click', function () {

      document.querySelectorAll('.suggestion').forEach(e => e.style.backgroundColor = '');

      this.style.backgroundColor = '#e6f2ff';

      if (this.id !== 'other-suggestion') {
        scrapedData.canonicalName = this.dataset.suggestion;
      }

    });

  });

  const other = document.getElementById('other-suggestion');
  const customInput = document.getElementById('custom-canonical');

  if (other && customInput) {

    other.addEventListener('click', () => {

      document.querySelectorAll('.suggestion').forEach(e => e.style.backgroundColor = '');

      other.style.backgroundColor = '#e6f2ff';

      customInput.style.display = 'block';
      customInput.focus();

    });

    customInput.addEventListener('input', () => {
      scrapedData.canonicalName = customInput.value;
    });

  }

}

/* =======================================================
POPUP PRODUIT
======================================================= */

async function showProductPopup() {

const suggestions = await getCanonicalSuggestions(scrapedData.name);

let promoHtml = '';

if (scrapedData.promotions?.label) {

  const label = scrapedData.promotions.label;

  const percent =
    scrapedData.promotions.realPercent ??
    scrapedData.promo_percent ??
    0;

  const priceKg = scrapedData.promotions.promoPricePerKg;

  promoHtml = `
  <div style="margin-bottom:10px;">
  <strong>Promo :</strong><br>
  ${label}<br>
  ${percent ? `<span style="color:green">-${percent}% réel</span>` : ''}
  ${priceKg ? `<span>${formatPrice(priceKg)}/kg</span>` : ''}
  </div>
  `;

}

popup.innerHTML = `
<div class="popup-content">

<h3>Produit Scrapé</h3>

<div><strong>Nom :</strong> ${scrapedData.name}</div>

<div>
<strong>Marque :</strong>
<span id="brand-name">${scrapedData.brand}</span>
<button id="change-brand-btn">Changer la marque</button>
</div>

<div><strong>Site :</strong> ${scrapedData.site_name}</div>

<div><strong>Prix :</strong> ${formatPrice(scrapedData.regular_price)}</div>

${promoHtml}

<div><strong>Prix/kg :</strong> ${scrapedData.price_per_kg ? formatPrice(scrapedData.price_per_kg) + '/kg' : 'N/A'}</div>

<div><strong>Poids :</strong> ${scrapedData.weight_raw}</div>

<div>
<strong>URL :</strong>
<a href="#" class="product-link" data-url="${scrapedData.product_url}">Ouvrir</a>
</div>

<div id="canonical-suggestions">

${suggestions.map(s => `
<div class="suggestion" data-suggestion="${s}">
${s}
</div>
`).join('')}

<div class="suggestion" id="other-suggestion">Autre...</div>

<input id="custom-canonical" style="display:none">

</div>

<button id="add-to-table">Ajouter</button>
<button id="close-popup">Ignorer</button>

</div>
`;

attachPopupListeners();
attachCanonicalSuggestionListeners();

popup.style.display = 'flex';

}

/* =======================================================
TABLEAU PRODUITS
======================================================= */

function renderProducts(products) {

const tableBody = document.getElementById('products-body');

tableBody.innerHTML = '';

products.forEach(product => {

const row = document.createElement('tr');

const priceCell = product.promo_price
? `<span style="text-decoration:line-through;color:red">${formatPrice(product.regular_price)}</span>
<span style="color:green">${formatPrice(product.promo_price)}</span>`
: `${formatPrice(product.regular_price)}`;

row.innerHTML = `

<td>
<input type="checkbox" class="product-checkbox" data-url="${product.product_url}">
</td>

<td>
<a href="#" class="product-link" data-url="${product.product_url}">
${product.name}
</a>
</td>

<td>${product.site_name}</td>

<td>${priceCell}</td>

<td>${product.weight_raw || 'N/A'}</td>

<td>${product.price_per_kg ? formatPrice(product.price_per_kg) + '/kg' : 'N/A'}</td>

<td>
<a href="#" class="brand-link"
data-brand="${product.brand}"
data-site="${product.site_name}">
${product.brand}
</a>
</td>

<td>${formatDate(product.last_seen)}</td>

`;

tableBody.appendChild(row);

});

}

/* =======================================================
LOAD PRODUITS
======================================================= */

async function loadProducts() {

try {

const products = await window.api.getProducts();

renderProducts(products);

} catch (err) {
console.error(err);
}

}

/* =======================================================
SCRAPING
======================================================= */

const scrapeUrlButton = document.getElementById('scrape-url');
const productUrlInput = document.getElementById('product-url');

if (scrapeUrlButton) {

scrapeUrlButton.addEventListener('click', async () => {

const url = productUrlInput.value.trim();

if (!url) return alert("URL invalide");

popup.innerHTML = `<p>Scraping en cours...</p>`;
popup.style.display = 'flex';

try {

const result = await window.api.scrapeProduct(url);

if (!result.success) {

popup.innerHTML = `<p>Erreur : ${result.error}</p>`;

return;

}

scrapedData = result.data;

enrichPromoData(scrapedData);

showProductPopup();

} catch (err) {

popup.innerHTML = `<p>${err.message}</p>`;

}

});

}

/* =======================================================
EVENT DELEGATION GLOBALE
======================================================= */

document.addEventListener('click', async (e) => {

if (e.target.matches('.product-link')) {

e.preventDefault();

const url = e.target.dataset.url;

await window.api.openInWindow(url);

}

if (e.target.matches('.brand-link')) {

e.preventDefault();

const brand = e.target.dataset.brand;
const site = e.target.dataset.site;

const url = await window.api.getBrandUrl(brand, site);

if (url) await window.api.openInWindow(url);

}

if (e.target.matches('#change-brand-btn')) {

showBrandSelectionPopup();

}

});

/* =======================================================
INIT
======================================================= */

loadProducts();

});