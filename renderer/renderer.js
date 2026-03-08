// =============================================
// RENDERER.JS - VERSION MODULAIRE AVEC CHARGEMENT DES POPUPS
// =============================================
async function loadPopupModules() {
  try {
    // Chargement dynamique des modules de popup
    await Promise.all([
      import('./popup/edit-product.js'),
      import('./popup/history-popup.js'),
      import('./popup/chart-popup.js'),
      import('./popup/scraped-product.js')
    ]);
    console.log("Tous les modules de popup chargés avec succès");
  } catch (error) {
    console.error("Erreur lors du chargement des modules:", error);
    alert("Erreur lors du chargement de l'application. Voir la console pour plus de détails.");
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Chargement des modules de popup en premier
  await loadPopupModules();

  // 2. Initialisation du reste de l'application
  const tableBody = document.getElementById('products-body');
  const selectionCount = document.getElementById('selectionCount');
  let selectedProducts = [];

  // ===============================
  // UTILITAIRES (inchangés)
  // ===============================
  function formatPrice(price) {
    if (price === null || price === undefined) return 'N/A';
    return parseFloat(price).toFixed(2) + ' €';
  }

  function getUpdateColor(days) {
    if (days <= 2) return 'updateGreen';
    if (days <= 5) return 'updateLight';
    if (days <= 10) return 'updateOrange';
    return 'updateRed';
  }

  function updateSelection() {
    selectionCount.textContent = selectedProducts.length;
  }

  // ===============================
  // RENDU DU TABLEAU (AVEC BOUTON HISTORIQUE)
  // ===============================
  function renderProducts(products) {
    tableBody.innerHTML = '';
    const brands = {};
    let brandIndex = 0;

    // Regroupement par marque et nom canonique
    products.forEach(p => {
      if (!brands[p.brand]) brands[p.brand] = {};
      const canonicalKey = p.canonicalName || p.canonical || 'Inconnu';
      if (!brands[p.brand][canonicalKey]) brands[p.brand][canonicalKey] = [];
      brands[p.brand][canonicalKey].push(p);
    });

    // Affichage par marque
    Object.keys(brands).forEach(brand => {
      const brandRow = document.createElement('tr');
      brandRow.className = `brandRow ${brandIndex % 2 === 0 ? 'brandBlockEven' : 'brandBlockOdd'}`;
      brandRow.innerHTML = `<td colspan="11" style="text-align: left; padding-left: 20px;">${brand}</td>`;
      tableBody.appendChild(brandRow);
      brandIndex++;

      // Affichage par nom canonique
      Object.keys(brands[brand]).forEach(canonicalKey => {
        const canonRow = document.createElement('tr');
        canonRow.className = 'canonRow';
        canonRow.innerHTML = `<td colspan="11" style="text-align: left; padding-left: 30px;">${canonicalKey}</td>`;
        tableBody.appendChild(canonRow);

        const group = brands[brand][canonicalKey];
        const bestPrice = Math.min(...group.map(p => p.price_per_kg || Infinity));

        group.forEach(p => {
          const tr = document.createElement('tr');
          const bestClass = p.price_per_kg === bestPrice ? 'bestPrice' : '';
          const promoPriceHtml = p.promo_price
            ? `<span class="promoPrice">${formatPrice(p.promo_price)}</span><span class="oldPrice">${formatPrice(p.regular_price)}</span>`
            : formatPrice(p.regular_price);

          // ORDRE CORRIGÉ DES COLONNES + BOUTON HISTORIQUE :
          tr.innerHTML = `
            <td><input type="checkbox" class="product-checkbox"></td>
            <td class="name">
              <a href="#" class="product-link" data-url="${p.product_url}">${p.name}</a>
            </td>
            <td class="site ${p.site_name}">${p.site_name}</td>
            <td>${promoPriceHtml}</td>
            <td>${p.promotions?.realPercent ? `-${p.promotions.realPercent}%` : ''}</td>
            <td>${p.weight_raw || ''}</td>
            <td class="${bestClass}">${p.price_per_kg ? formatPrice(p.price_per_kg) : 'N/A'}</td>
            <td class="brand ${p.brand}">
              <a href="#" class="brand-link" data-brand="${p.brand}" data-site="${p.site_name}">${p.brand}</a>
            </td>
            <td class="update ${getUpdateColor(p.updated_days || 0)}">${p.updated_days || 0}j</td>
            <td>
              <button class="edit">✎</button>
              <button class="history-btn">📊</button>  <!-- NOUVEAU BOUTON HISTORIQUE -->
            </td>
          `;

          // =====================================
          // ÉCOUTEURS
          // =====================================

          // 1. Sélection/déselection (clic sur la ligne)
          tr.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'A') {
              const checkbox = tr.querySelector('.product-checkbox');
              checkbox.checked = !checkbox.checked;
              const isChecked = checkbox.checked;
              if (isChecked && !selectedProducts.includes(p)) {
                selectedProducts.push(p);
                tr.classList.add('selected');
              } else if (!isChecked && selectedProducts.includes(p)) {
                selectedProducts = selectedProducts.filter(x => x !== p);
                tr.classList.remove('selected');
              }
              updateSelection();
            }
          };

          // 2. Double-clic pour éditer
          tr.ondblclick = (e) => {
            e.stopPropagation();
            window.showEditPopup(p);
          };

          // 3. Checkbox pour la sélection
          tr.querySelector('.product-checkbox').addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            if (isChecked && !selectedProducts.includes(p)) {
              selectedProducts.push(p);
              tr.classList.add('selected');
            } else if (!isChecked && selectedProducts.includes(p)) {
              selectedProducts = selectedProducts.filter(x => x !== p);
              tr.classList.remove('selected');
            }
            updateSelection();
          });

          // 4. Bouton d'édition
          tr.querySelector('.edit').onclick = (e) => {
            e.stopPropagation();
            window.showEditPopup(p);
          };

          // 5. NOUVEAU : Bouton d'historique
          tr.querySelector('.history-btn').onclick = (e) => {
            e.stopPropagation();
            if (window.showHistoryPopup) {
              window.showHistoryPopup(p);
            } else {
              console.error("Fonction showHistoryPopup non définie");
            }
          };

          tableBody.appendChild(tr);
        });
      });
    });
  }

  // ===============================
  // CHARGEMENT DES PRODUITS (inchangé)
  // ===============================
  async function loadProducts() {
    if (window.api?.getProducts) {
      const products = await window.api.getProducts();
      renderProducts(products);
    }
  }

  // ===============================
  // ÉCOUTEURS GLOBAUX 
  // ===============================
  document.addEventListener('click', async (e) => {
    // Clic sur un lien produit
    if (e.target.classList.contains('product-link')) {
      e.preventDefault();
      const url = e.target.dataset.url;
      await window.api.openInWindow(url);
    }
    // Clic sur un lien marque
    if (e.target.classList.contains('brand-link')) {
      e.preventDefault();
      const brand = e.target.dataset.brand;
      const site = e.target.dataset.site;
      const url = await window.api.getBrandUrl(brand, site);
      if (url) await window.api.openInWindow(url);
    }
  });

  // ===============================
  // ÉCOUTEURS DES BOUTONS DE LA SIDEBAR (inchangés)
  // ===============================
  document.getElementById('scrape-url').addEventListener('click', async () => {
    const url = document.getElementById('product-url').value.trim();
    if (!url) return alert('URL invalide');
    if (window.api?.scrapeProduct) {
      const result = await window.api.scrapeProduct(url);
      if (result.success) {
        window.showProductPopup(result.data, await window.api.getCanonicalSuggestions(result.data.name));
      } else {
        alert(`Erreur : ${result.error}`);
      }
    }
  });

  document.getElementById('show-graph-all').addEventListener('click', () => {
    if (selectedProducts.length > 0) {
      window.showChartPopup(selectedProducts);
    } else {
      alert('Aucun produit sélectionné.');
    }
  });

  document.getElementById('update-selected').addEventListener('click', async () => {
    if (selectedProducts.length > 0 && window.api?.upsertProduct) {
      for (const product of selectedProducts) {
        await window.api.upsertProduct(product);
      }
      loadProducts();
    }
  });

  document.getElementById('delete-selected').addEventListener('click', async () => {
    if (selectedProducts.length > 0 && window.api?.deleteProducts) {
      const urls = selectedProducts.map(p => p.product_url);
      await window.api.deleteProducts(urls);
      selectedProducts = [];
      loadProducts();
    }
  });

  // ===============================
  // CHARGEMENT INITIAL (inchangé)
  // ===============================
  loadProducts();
  window.rendererLoadProducts = loadProducts;
});
