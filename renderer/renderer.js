// ======================================
// RENDERER.JS
// ======================================

// ===============================
// CHARGEMENT SÉCURISÉ DES MODULES
// ===============================
let popupModulesLoaded = false;

async function loadPopupModules() {
  try {
    console.log("[RENDERER] Début du chargement des modules...");

    // Modules popup + toast
    await import('./popup/popup-core.js');
    await import('./popup/scraped-product.js');
    await import('./popup/edit-product.js');
    await import('./popup/history-popup.js');
    await import('./popup/chart-popup.js');
    await import('./utils/toast.js');

    popupModulesLoaded = true;
    console.log("[RENDERER] Tous les modules chargés avec succès");
    return true;
  } catch (error) {
    console.error("[RENDERER] Erreur critique lors du chargement:", error);
    window.showToast?.(`Erreur fatale: ${error.message}`, 5000);
    throw error;
  }
}

// ===============================
// INITIALISATION PRINCIPALE
// ===============================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadPopupModules();

    const utilsModule = await import('../services/utils.js');

    console.log("[RENDERER] utils.js chargé depuis /services/ et exposé globalement");

    const tableBody = document.getElementById('products-body');
    const selectionCount = document.getElementById('selectionCount');
    let selectedProducts = [];

    // ===============================
    // FONCTIONS UTILITAIRES
    // ===============================
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
    // RENDU DES PRODUITS
    // ===============================
    function renderProducts(products) {
      if (!tableBody) return console.error("[RENDERER] tableBody introuvable");

      tableBody.innerHTML = '';
      const brands = {};
      let brandIndex = 0;

      try {
        // Organisation par marque et nom canonique
        products.forEach(p => {
          if (!p.brand) p.brand = 'Inconnu';
          if (!brands[p.brand]) brands[p.brand] = {};
          const canonicalKey = p.canonical_name || p.name || 'Inconnu';
          if (!brands[p.brand][canonicalKey]) brands[p.brand][canonicalKey] = [];
          brands[p.brand][canonicalKey].push(p);
        });

        Object.keys(brands).forEach(brand => {
          const brandRow = document.createElement('tr');
          brandRow.className = `brandRow ${brandIndex % 2 === 0 ? 'brandBlockEven' : 'brandBlockOdd'}`;
          brandRow.innerHTML = `<td colspan="11" style="text-align: left; padding-left: 20px;">${brand}</td>`;
          tableBody.appendChild(brandRow);
          brandIndex++;

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
              const priceDisplay = p.regular_price
                ? (window.utils?.formatPrice ? window.utils.formatPrice(p.regular_price) : p.regular_price)
                : 'N/A';
              const pricePerKgDisplay = p.price_per_kg
                ? (window.utils?.formatPrice ? window.utils.formatPrice(p.price_per_kg) : p.price_per_kg)
                : 'N/A';
              const promoDisplay = p.promo_percent ? `-${p.promo_percent}%` : '';

              tr.innerHTML = `
                <td><input type="checkbox" class="product-checkbox"></td>
                <td class="name">
                  <a href="#" class="product-link" data-url="${p.product_url}">${p.name}</a>
                </td>
                <td class="site ${p.site_name}">${p.site_name}</td>
                <td>${priceDisplay}</td>
                <td>${promoDisplay}</td>
                <td>${p.weight_raw || ''}</td>
                <td class="${bestClass}">${pricePerKgDisplay}</td>
                <td class="brand ${p.brand}">
                  <a href="#" class="brand-link" data-brand="${p.brand}" data-site="${p.site_name}">${p.brand}</a>
                </td>
                <td class="update ${getUpdateColor(p.updated_days || 0)}">${p.updated_days || 0}j</td>
                <td>
                  <button class="edit-btn">✎</button>
                  <button class="history-btn">📊</button>
                </td>
              `;

              // Checkbox + sélection
              const checkbox = tr.querySelector('.product-checkbox');
              checkbox?.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                if (isChecked && !selectedProducts.includes(p)) {
                  selectedProducts.push(p);
                  tr.classList.add('selected');
                } else if (!isChecked) {
                  selectedProducts = selectedProducts.filter(x => x !== p);
                  tr.classList.remove('selected');
                }
                updateSelection();
              });

              // Edit / History buttons
              const editBtn = tr.querySelector('.edit-btn');
              editBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof window.showEditProductPopup === 'function') {
                  try { window.showEditProductPopup(p); }
                  catch (err) { console.error(err); window.showToast.error(`Erreur popup: ${err.message}`); }
                } else window.showToast.warning("Fonction d'édition indisponible");
              });

              const historyBtn = tr.querySelector('.history-btn');
              historyBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof window.showHistoryPopup === 'function') window.showHistoryPopup(p);
                else window.showToast.warning("Historique indisponible");
              });

              tableBody.appendChild(tr);
            });
          });
        });
      } catch (err) {
        console.error("[RENDERER] Erreur rendu tableau:", err);
        tableBody.innerHTML = '<tr><td colspan="11">Erreur d\'affichage. Voir console.</td></tr>';
      }
    }

    // ===============================
    // CHARGEMENT PRODUITS
    // ===============================
    async function loadProducts() {
      try {
        if (!popupModulesLoaded) await new Promise(r => setTimeout(r, 500));
        if (typeof window.api?.getProducts !== 'function') throw new Error("API getProducts non disponible");
        const products = await window.api.getProducts();
        renderProducts(products);
      } catch (err) {
        console.error("[RENDERER] Erreur chargement produits:", err);
        tableBody.innerHTML = '<tr><td colspan="11">Erreur de chargement. Voir console.</td></tr>';
      }
    }

    // ===============================
    // ÉCOUTEURS GLOBAUX
    // ===============================
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('product-link')) {
        e.preventDefault();
        const url = e.target.dataset.url;
        if (url && typeof window.api?.openInWindow === 'function') {
          try { await window.api.openInWindow(url); }
          catch (err) { console.error(err); window.showToast.error("Erreur ouverture URL"); }
        }
      }

      if (e.target.classList.contains('brand-link')) {
        e.preventDefault();
        const brand = e.target.dataset.brand;
        const site = e.target.dataset.site;
        if (brand && site && typeof window.api?.getBrandUrl === 'function') {
          try {
            const url = await window.api.getBrandUrl(brand, site);
            if (url && typeof window.api.openInWindow === 'function') await window.api.openInWindow(url);
          } catch (err) { console.error(err); window.showToast.error("Erreur ouverture lien marque"); }
        }
      }
    });

    // ===============================
    // SIDEBAR BUTTONS
    // ===============================
    const setupSidebarButtons = () => {
      const scrapeBtn = document.getElementById('scrape-url');
      const graphBtn = document.getElementById('show-graph-all');
      const updateBtn = document.getElementById('update-selected');
      const deleteBtn = document.getElementById('delete-selected');

      // SCRAPING
      scrapeBtn?.addEventListener('click', async () => {
        const urlInput = document.getElementById('product-url');
        const url = urlInput?.value.trim();
        if (!url) return window.showToast.warning("URL requise");
        if (!window.api?.scrapeProduct) return window.showToast.warning("Scraping indisponible");

        try {
          window.showToast("Scraping en cours...", 0);
          const result = await window.api.scrapeProduct(url);
          if (result.success) {
            window.showScrapedProductPopup(result.data);
            await loadProducts(); // reload automatique après insertion
          } else {
            window.showToast.error("Erreur : " + result.error);
          }
        } catch (err) { console.error(err); window.showToast.error("Erreur : " + err.message); }
      });

      // GRAPH
      graphBtn?.addEventListener('click', () => {
        if (selectedProducts.length === 0) return window.showToast.warning('Aucun produit sélectionné');
        if (typeof window.showChartPopup !== 'function') return window.showToast.warning("Graph indisponible");
        window.showChartPopup(selectedProducts);
      });

      // UPDATE
      updateBtn?.addEventListener('click', async () => {
        if (selectedProducts.length === 0) return window.showToast.warning('Aucun produit sélectionné');
        if (!window.api?.upsertProduct) return window.showToast.warning("Mise à jour indisponible");

        try {
          for (const p of selectedProducts) await window.api.upsertProduct(p);
          await loadProducts();
          window.showToast.success("Produits mis à jour avec succès");
        } catch (err) { console.error(err); window.showToast.error(`Mise à jour échouée: ${err.message}`); }
      });

      // DELETE
      deleteBtn?.addEventListener('click', async () => {
        if (selectedProducts.length === 0) return window.showToast.warning('Aucun produit sélectionné');
        if (!window.api?.deleteProducts) return window.showToast.warning("Suppression indisponible");

        try {
          const urls = selectedProducts.map(p => p.product_url);
          await window.api.deleteProducts(urls);
          selectedProducts = [];
          document.querySelectorAll('tr.selected').forEach(tr => tr.classList.remove('selected'));
          await loadProducts();
          window.showToast.success("Produits supprimés avec succès");
        } catch (err) { console.error(err); window.showToast.error(`Suppression échouée: ${err.message}`); }
      });
    };

    setTimeout(setupSidebarButtons, 300);

    // ===============================
    // CHARGEMENT INITIAL
    // ===============================
    await loadProducts();
    window.rendererLoadProducts = loadProducts;

  } catch (err) {
    console.error("[RENDERER] Erreur initiale fatale:", err);
    document.body.innerHTML = `
      <div style="color: red; padding: 20px; text-align: center;">
        <h2>Erreur critique</h2>
        <p>${err.message}</p>
        <p>Veuillez recharger la page.</p>
      </div>`;
  }
});