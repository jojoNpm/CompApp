document.addEventListener('DOMContentLoaded', () => {
  let scrapedData;
  const popup = document.getElementById('popup');

  /* =======================================================
       FONCTIONS UTILITAIRES
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
       NOM CANONIQUE
  ======================================================= */
  window.generateCanonicalName = function(name = '', brand = '') {
    const ignoredWords = [
      'végétal', 'végétales', 'végétarien', 'végétariennes', 'veggie', 'vegan', 'bio',
      'gr', 'kg', ' g '
    ];
    let cleaned = name;
    ignoredWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });
    cleaned = cleaned.replace(/[-–—]/g, ' ').replace(/\([^)]*\)/g, '');
    const articles = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou'];
    articles.forEach(article => {
      const regex = new RegExp(`\\b${article}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });
    const quantityRegex = /(\d+\s*x\s*|\s*x\s*\d+|\d+x|x\d+)/gi;
    const quantities = cleaned.match(quantityRegex) || [];
    cleaned = cleaned.replace(quantityRegex, '');
    const weightRegex = /(\s\d+\s*(?:g|gr|kg|kilo|kilos|l|litre|litres|ml|cl))/gi;
    cleaned = cleaned.replace(weightRegex, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, '');
    quantities.forEach(q => { cleaned += `${q}`; });
    return cleaned.trim().toLowerCase();
  };

  window.generateCanonicalSuggestions = function(name = '') {
    const baseName = window.generateCanonicalName(name);
    const suggestions = [
      baseName,
      baseName.replace(/x\d+|\d+x/gi, '').trim(),
      baseName.replace(/x\s*\d+|\d+\s*x/gi, '').trim()
    ];
    return suggestions.filter((s, i, arr) => arr.indexOf(s) === i && s !== '');
  };

  /* =======================================================
       CALCUL PROMO CARREFOUR / UNIVERSAL
  ======================================================= */
  function enrichPromoData(product) {
  // Initialiser promotions si inexistant
  if (!product.promotions) {
    product.promotions = {};
  }

  // Récupérer la label de promo (si disponible)
  const label = product.promotions.label ||
                product.promoLabel ||
                product.promotion_label ||
                '';

  // Récupérer les valeurs existantes (ou null)
  let realPercent = product.promotions.realPercent;
  let promoPricePerKg = product.promotions.promoPricePerKg;

  // Calculer realPercent si la promo est de type "2ème à -X%"
  if (realPercent === undefined && label.match(/2[eè]?m?e?\s*(?:à|a)\s*-(\d+)%/i)) {
    const match2nd = label.match(/2[eè]?m?e?\s*(?:à|a)\s*-(\d+)%/i);
    const percent = parseInt(match2nd[1], 10);
    realPercent = Math.round(percent / 2);  // 30% pour "2ème à -60%"

    // Calculer le prix/kg promo si possible
    if (product.price_per_kg) {
      promoPricePerKg = +(product.price_per_kg * (1 - realPercent / 100)).toFixed(2);
    }
  }

  // Mettre à jour les valeurs dans promotions
  product.promotions.label = label;
  product.promotions.realPercent = realPercent;
  product.promotions.promoPricePerKg = promoPricePerKg;
}


  /* =======================================================
       FONCTIONS POPUP
  ======================================================= */
  function attachPopupListeners() {
    const closeBtn = popup.querySelector('#close-popup');
    if (closeBtn) closeBtn.addEventListener('click', () => { popup.style.display = 'none'; });

    const addBtn = popup.querySelector('#add-to-table');
    if (addBtn) addBtn.addEventListener('click', async () => {
      try {
        if (!scrapedData.canonicalName) {
          const selectedSuggestion = document.querySelector('.suggestion[style*="background-color: rgb(230, 242, 255)"]');
          if (selectedSuggestion) scrapedData.canonicalName = selectedSuggestion.dataset.suggestion;
          else scrapedData.canonicalName = document.getElementById('custom-canonical').value;
        }
        const result = await window.api.addProduct(scrapedData);
        if (result.success) {
          popup.style.display = 'none';
          await loadProducts();
        } else {
          alert(`Erreur lors de l'ajout : ${result.error}`);
        }
      } catch (err) {
        console.error(err);
        alert(`Erreur : ${err.message}`);
      }
    });

    const changeBrandBtn = document.getElementById('change-brand-btn');
    if (changeBrandBtn) changeBrandBtn.addEventListener('click', showBrandSelectionPopup);

    const productLink = popup.querySelector('.product-link');
    if (productLink) {
      productLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = productLink.dataset.url;
        if (!url) {
          alert("URL produit manquante.");
          return;
        }
        try {
          await window.api.openInWindow(url);
        } catch (err) {
          console.error(err);
          alert("Impossible d'ouvrir le lien.");
        }
      });
    }
  }

  function attachCanonicalSuggestionListeners() {
    document.querySelectorAll('.suggestion').forEach(el => {
      el.addEventListener('click', function() {
        document.querySelectorAll('.suggestion').forEach(e => e.style.backgroundColor = '');
        this.style.backgroundColor = '#e6f2ff';
        if (this.id !== 'other-suggestion') scrapedData.canonicalName = this.dataset.suggestion;
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
      customInput.addEventListener('input', () => { scrapedData.canonicalName = customInput.value; });
    }
  }

  async function showProductPopup() {
    const suggestions = window.generateCanonicalSuggestions(scrapedData.name);

    // =========================
    // Construire le bloc promo
    // =========================
    let promoHtml = '';
    if (scrapedData.promotions?.label || scrapedData.promo_percent) {
      const label = scrapedData.promotions?.label || scrapedData.promotion_label || 'N/A';
      // Utiliser realPercent si disponible (calculé par enrichPromoData), sinon promo_percent
// Utiliser realPercent SI DISPONIBLE, sinon promo_percent (fallback)
const percent = scrapedData.promotions?.realPercent ?? scrapedData.promo_percent ?? 0;
console.log("DEBUG: Using percent =", percent, "(realPercent =", scrapedData.promotions?.realPercent, ", promo_percent =", scrapedData.promo_percent, ")");


      const priceKg = scrapedData.promotions?.promoPricePerKg || scrapedData.promotion_multi_price;

      promoHtml = `
        <div style="margin-bottom:10px; padding:5px 10px; background:#f9f9f9; border-left:4px solid #4CAF50; border-radius:3px;">
          <strong>Promo :</strong><br>
          ${label}<br>
          ${percent ? `<span style="color:green;font-weight:bold;">soit -${percent}% réel</span><br>` : ''}
          ${priceKg ? `<span style="color:blue;">${formatPrice(priceKg)}/kg</span>` : ''}
        </div>
      `;
    }

    // =========================
    // Construire le popup
    // =========================
    popup.innerHTML = `
      <div class="popup-content" style="font-family:Arial, sans-serif; line-height:1.5; max-width:520px;">
        <div class="popup-panel" style="padding:15px; border:1px solid #ddd; border-radius:5px; background:#fff;">
          <h3 style="margin-bottom:15px;">Produit Scrapé</h3>

          <div style="margin-bottom:10px;"><strong>Nom :</strong> ${scrapedData.name || 'Non spécifié'}</div>

          <div style="margin-bottom:10px;">
            <strong>Marque :</strong>
            <span id="brand-name">${scrapedData.brand || 'Non spécifiée'}</span>
            <button id="change-brand-btn" style="margin-left:10px;padding:2px 5px;font-size:0.8em;">Changer la marque</button>
          </div>

          <div style="margin-bottom:10px;"><strong>Site :</strong> ${scrapedData.site_name || 'Non spécifié'}</div>

          <div style="margin-bottom:10px;">
            <strong>Prix :</strong> ${formatPrice(scrapedData.regular_price)}
            ${scrapedData.promo_price ?
              `<br><span class="price-original" style="text-decoration:line-through;color:red;">${formatPrice(scrapedData.regular_price)}</span>
               <span class="price-promo" style="color:green;font-weight:bold;">${formatPrice(scrapedData.promo_price)}</span>` : ''}
          </div>

          ${promoHtml}

          <div style="margin-bottom:10px;"><strong>Prix/kg :</strong> ${scrapedData.price_per_kg ? formatPrice(scrapedData.price_per_kg) + '/kg' : 'N/A'}</div>

          <div style="margin-bottom:10px;"><strong>Poids :</strong> ${scrapedData.weight_raw || 'Non spécifié'}</div>

          <div style="margin-bottom:10px;">
            <strong>Disponibilité :</strong>
            <span style="color:${scrapedData.availability ? 'green' : 'red'}; font-weight:bold;">
              ${scrapedData.availability ? 'Disponible' : 'Indisponible'} ${scrapedData.availability ? '' : '⚠'}
            </span>
          </div>

          <div style="margin-bottom:15px;">
            <strong>URL :</strong>
            <a href="#" class="product-link" data-url="${scrapedData.product_url || ''}">Ouvrir</a>
          </div>

          <div style="margin-bottom:10px;">
            <strong>Nom canonique :</strong>
            <div id="canonical-suggestions" style="margin-top:5px;">
              ${suggestions.map((s, i) => `
                <div class="suggestion" data-suggestion="${s}"
                     style="cursor:pointer; padding:5px; margin:2px; border:1px solid #ddd; border-radius:3px;">
                  ${i + 1}. ${s}
                </div>`).join('')}
              <div class="suggestion" id="other-suggestion"
                   style="cursor:pointer; padding:5px; margin:2px; border:1px solid #ddd; border-radius:3px; background-color:#f0f8ff;">
                Autre...
              </div>
              <input type="text" id="custom-canonical" style="width:100%; margin-top:5px; display:none;" placeholder="Entrez un nom canonique personnalisé">
            </div>
          </div>
        </div>

        <div class="popup-actions" style="display:flex; justify-content:space-between; padding:10px;">
          <button id="add-to-table" style="padding:5px 10px;">Ajouter au tableau</button>
          <button id="close-popup" style="padding:5px 10px;">Ignorer</button>
        </div>
      </div>
    `;

    attachPopupListeners();
    attachCanonicalSuggestionListeners();
  }

  async function showBrandSelectionPopup() {
    const brands = await window.api.getAllBrands();
    popup.innerHTML = `
      <div class="popup-content">
        <div class="popup-panel">
          <h3>Sélection de la Marque</h3>
          <p><strong>Marque actuelle :</strong> ${scrapedData.brand || 'Non spécifiée'}</p>
          <p><strong>Nouvelle marque :</strong></p>
          <select id="brand-select" style="width:100%;margin-bottom:10px;padding:5px;">
            ${brands.map(b => `<option value="${b}">${b}</option>`).join('')}
          </select>
          <p>Ou <button id="new-brand-btn" style="background:none;border:none;color:#0066cc;cursor:pointer;text-decoration:underline;">Créer une nouvelle marque</button></p>
        </div>
        <div class="popup-actions">
          <button id="save-brand-selection">Enregistrer</button>
          <button id="cancel-brand-selection">Annuler</button>
        </div>
      </div>
    `;

    document.getElementById('new-brand-btn').addEventListener('click', () => {
      const newBrand = prompt("Entrez le nom de la nouvelle marque :");
      if (!newBrand) return;
      scrapedData.brand = newBrand;
      showProductPopup();
    });

    document.getElementById('save-brand-selection').addEventListener('click', () => {
      const selectedBrand = document.getElementById('brand-select').value;
      scrapedData.brand = selectedBrand;
      showProductPopup();
    });

    document.getElementById('cancel-brand-selection').addEventListener('click', () => {
      showProductPopup();
    });
  }

  /* =======================================================
       CHECKBOXES + LIENS TABLEAU
  ======================================================= */
  function attachCheckAllListeners() {
    const checkAll = document.getElementById('check-all');
    if (checkAll) {
      checkAll.addEventListener('change', function() {
        const checked = this.checked;
        document.querySelectorAll('.product-checkbox, .canonical-checkbox').forEach(cb => cb.checked = checked);
      });
    }

    document.querySelectorAll('.canonical-checkbox').forEach(cb => {
      cb.addEventListener('change', function() {
        const canonicalId = this.id;
        const isChecked = this.checked;
        document.querySelectorAll(`.product-checkbox[data-canonical="${canonicalId}"]`).forEach(pcb => pcb.checked = isChecked);
      });
    });

    // PRODUITS
    document.querySelectorAll('.product-link').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = e.target.dataset.url;
        if (!url) return alert("URL produit manquante.");
        try {
          await window.api.openInWindow(url);
        } catch(err) {
          console.error(err);
          alert("Impossible d'ouvrir le lien dans Electron.");
        }
      });
    });

    // MARQUES
    document.querySelectorAll('.brand-link').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const brand = e.target.dataset.brand;
        const site = e.target.dataset.site;
        try {
          const url = await window.api.getBrandUrl(brand, site);
          if (url) await window.api.openInWindow(url);
          else alert(`Aucun lien trouvé pour ${brand} sur ${site}`);
        } catch(err) {
          console.error(err);
          alert("Impossible de récupérer le lien de la marque.");
        }
      });
    });
  }

  /* =======================================================
       RENDER TABLEAU PRODUITS
  ======================================================= */
  function renderProducts(products) {
    const tableBody = document.getElementById('products-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (products.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Aucun produit trouvé.</td></tr>';
      return;
    }

    const groupedByBrand = {};
    products.forEach(product => {
      if (!groupedByBrand[product.brand]) groupedByBrand[product.brand] = {};
      const canonicalName = product.canonicalName || window.generateCanonicalName(product.name, product.brand);
      if (!groupedByBrand[product.brand][canonicalName]) groupedByBrand[product.brand][canonicalName] = [];
      groupedByBrand[product.brand][canonicalName].push(product);
    });

    const sortedBrands = Object.keys(groupedByBrand).sort((a, b) => a.localeCompare(b));
    let brandIndex = 0;

    sortedBrands.forEach(brand => {
      const isAlt = brandIndex % 2 !== 0;
      const brandColor = isAlt ? '#e9ecef' : '#f8f9fa';
      brandIndex++;

      // Ligne marque
      const brandRow = document.createElement('tr');
      brandRow.style.backgroundColor = brandColor;
      brandRow.style.border = '2px solid #999';
      brandRow.style.borderRadius = '5px 5px 0 0';
      brandRow.innerHTML = `<td colspan="10" style="font-weight:bold; padding:10px;">${brand}</td>`;
      tableBody.appendChild(brandRow);

      const canonicalNames = Object.keys(groupedByBrand[brand]).sort((a, b) => a.localeCompare(b));
      canonicalNames.forEach((canonicalName, canonicalIndex) => {
        const canonicalId = `canonical-${brandIndex}-${canonicalIndex + 1}`;
        const canonicalRow = document.createElement('tr');
        canonicalRow.style.backgroundColor = brandColor;
        canonicalRow.style.borderLeft = '2px solid #999';
        canonicalRow.style.borderRight = '2px solid #999';
        canonicalRow.innerHTML = `
          <td style="text-align:center;">
            <input type="checkbox" class="canonical-checkbox" id="${canonicalId}" data-canonical="${canonicalName}">
          </td>
          <td colspan="9" style="font-weight:bold; font-style:italic; padding:8px;">${canonicalName}</td>
        `;
        tableBody.appendChild(canonicalRow);

        groupedByBrand[brand][canonicalName].forEach((product, prodIndex) => {
          const row = document.createElement('tr');
          row.style.backgroundColor = brandColor;
          row.style.borderLeft = '2px solid #999';
          row.style.borderRight = '2px solid #999';
          row.style.borderBottom = (prodIndex === groupedByBrand[brand][canonicalName].length - 1) ? '2px solid #999' : '1px solid #ccc';

          const priceCell = product.promo_price
            ? `<span style="color:red;text-decoration:line-through;font-size:0.9em;">${formatPrice(product.regular_price)}</span> <span style="color:green;font-weight:bold;">${formatPrice(product.promo_price)}</span>`
            : `${formatPrice(product.regular_price)}`;

          let promoCell = 'N/A';
          if (product.promotions && product.promotions.label) {
            promoCell = `<span title="soit -${product.promotions.realPercent || 'N/A'}% réel\n${product.promotions.promoPricePerKg ? formatPrice(product.promotions.promoPricePerKg) + '/kg' : ''}">${product.promotions.label}</span>`;
          } else if (product.promo_percent_label) {
            promoCell = product.promo_percent_label;
          }

          row.innerHTML = `
            <td style="text-align:center;">
              <input type="checkbox" class="product-checkbox" data-url="${product.product_url}" data-canonical="${canonicalId}">
            </td>
            <td>
              <a href="#" class="product-link" data-url="${product.product_url}">${product.name}</a>
              ${product.availability === 'Indisponible' ? '<span style="color:red; font-weight:bold; margin-left:5px;">⚠</span>' : ''}
            </td>
            <td>${product.site_name || 'Non spécifié'}</td>
            <td>${priceCell}</td>
            <td>${product.promo_percent ? product.promo_percent + ' %' : 'N/A'}</td>
            <td>${product.weight_raw || 'N/A'}</td>
            <td>${product.price_per_kg ? formatPrice(product.price_per_kg) + '/kg' : 'N/A'}</td>
            <td><a href="#" class="brand-link" data-brand="${product.brand}" data-site="${product.site_name}">${product.brand}</a></td>
            <td>${formatDate(product.last_seen)}</td>
            <td>
              <button class="edit-btn" data-url="${product.product_url}">Modifier</button>
              <button class="compare-btn" data-url="${product.product_url}">Comparer</button>
            </td>
          `;
          tableBody.appendChild(row);
        });
      });

      const footerRow = document.createElement('tr');
      footerRow.style.backgroundColor = brandColor;
      footerRow.style.borderLeft = '2px solid #999';
      footerRow.style.borderRight = '2px solid #999';
      footerRow.style.borderBottom = '2px solid #999';
      footerRow.innerHTML = '<td colspan="10" style="height:1px;padding:0;"></td>';
      tableBody.appendChild(footerRow);
    });

    attachCheckAllListeners();
  }

  /* =======================================================
       LOAD + SCRAPE
  ======================================================= */
  async function loadProducts() {
    try {
      const products = await window.api.getProducts();
      renderProducts(products);
    } catch(err) {
      console.error(err);
    }
  }

  const scrapeUrlButton = document.getElementById('scrape-url');
  const productUrlInput = document.getElementById('product-url');
  if (scrapeUrlButton && productUrlInput && popup) {
    scrapeUrlButton.addEventListener('click', async () => {
      const url = productUrlInput.value.trim();
      if (!url) return alert("Veuillez coller une URL valide.");

      popup.innerHTML = `<div class="popup-content"><p>Scraping en cours pour : ${url}</p><div class="loader"></div></div>`;
      popup.style.display = 'flex';

      try {
        const result = await window.api.scrapeProduct(url);
        console.log("SCRAP RESULT:", result);
        if (!result.success) {
          popup.innerHTML = `<div class="popup-content"><h3>Erreur</h3><p>${result.error}</p><button id="close-popup">Fermer</button></div>`;
          attachPopupListeners();
          return;
        }
        scrapedData = result.data;
        enrichPromoData(scrapedData);
        showProductPopup();
      } catch(err) {
        console.error(err);
        popup.innerHTML = `<div class="popup-content"><h3>Erreur inattendue</h3><p>${err.message}</p><button id="close-popup">Fermer</button></div>`;
        attachPopupListeners();
      }
    });
  }

  /* =======================================================
       SUPPRESSION
  ======================================================= */
  const deleteSelectedBtn = document.getElementById('delete-selected');
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', async () => {
      const checkedBoxes = document.querySelectorAll('.product-checkbox:checked');
      if (!checkedBoxes.length) return alert("Aucun produit sélectionné à supprimer.");

      const urlsToDelete = Array.from(checkedBoxes).map(cb => cb.dataset.url);
      const confirmMsg = urlsToDelete.length === 1
        ? "Êtes-vous sûr de vouloir supprimer ce produit ?"
        : `Êtes-vous sûr de vouloir supprimer ces ${urlsToDelete.length} produits ?`;

      if (!confirm(confirmMsg)) return;

      try {
        const result = await window.api.deleteProducts(urlsToDelete);
        if (result.success) {
          await loadProducts();
        } else {
          alert(`Erreur : ${result.error}`);
        }
      } catch(err) {
        console.error(err);
        alert("Erreur suppression. Voir console.");
      }
    });
  }

  /* =======================================================
       INITIALISATION
  ======================================================= */
  loadProducts();
});
