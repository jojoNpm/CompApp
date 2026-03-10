// =============================================
// RENDERER.JS - Gestion complète de l'interface
// =============================================

// ===============================
// CHARGEMENT SÉCURISÉ DES MODULES
// ===============================

let popupModulesLoaded = false;

async function loadPopupModules() {

  try {

    console.log("[RENDERER] Début du chargement des modules...");

    // manager en premier
    await import('./popup/popup-manager.js');

    // popups
    await import('./popup/edit-product.js');
    await import('./popup/history-popup.js');
    await import('./popup/chart-popup.js');
    await import('./popup/scraped-product.js');

    popupModulesLoaded = true;

    console.log("[RENDERER] Tous les modules chargés avec succès");

    // vérification
    if (typeof window.showEditPopup !== 'function') {
      throw new Error("showEditPopup non défini après chargement");
    }

    if (typeof window.showHistoryPopup !== 'function') {
      throw new Error("showHistoryPopup non défini après chargement");
    }

  }

  catch (error) {

    console.error("[RENDERER] Erreur critique lors du chargement:", error);

    alert(`Erreur fatale: ${error.message}. Voir console pour détails.`);

    throw error;

  }

}

// ===============================
// INITIALISATION PRINCIPALE
// ===============================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Chargement des modules (blocant)
    await loadPopupModules();

    // 2. Initialisation des variables
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
    // RENDU DU TABLEAU AVEC GESTION D'ERREURS
    // ===============================
    function renderProducts(products) {
      if (!tableBody) {
        console.error("[RENDERER] tableBody introuvable");
        return;
      }

      tableBody.innerHTML = '';
      const brands = {};
      let brandIndex = 0;

      // Regroupement sécurisé
      try {
        products.forEach(p => {
          if (!p.brand) p.brand = 'Inconnu';
          if (!brands[p.brand]) brands[p.brand] = {};
          const canonicalKey = p.canonicalName || p.name || 'Inconnu';
          if (!brands[p.brand][canonicalKey]) brands[p.brand][canonicalKey] = [];
          brands[p.brand][canonicalKey].push(p);
        });
      } catch (error) {
        console.error("[RENDERER] Erreur regroupement:", error);
        return;
      }

      // Génération du HTML
      try {
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
              const priceDisplay = p.regular_price ?
                window.utils.formatPrice(p.regular_price) : 'N/A';

              tr.innerHTML = `
                <td><input type="checkbox" class="product-checkbox"></td>
                <td class="name">
                  <a href="#" class="product-link" data-url="${p.product_url}">${p.name}</a>
                </td>
                <td class="site ${p.site_name}">${p.site_name}</td>
                <td>${priceDisplay}</td>
                <td>${p.promotions?.realPercent ? `-${p.promotions.realPercent}%` : ''}</td>
                <td>${p.weight_raw || ''}</td>
                <td class="${bestClass}">${p.price_per_kg ? window.utils.formatPrice(p.price_per_kg) : 'N/A'}</td>
                <td class="brand ${p.brand}">
                  <a href="#" class="brand-link" data-brand="${p.brand}" data-site="${p.site_name}">${p.brand}</a>
                </td>
                <td class="update ${getUpdateColor(p.updated_days || 0)}">${p.updated_days || 0}j</td>
                <td>
                  <button class="edit-btn">✎</button>
                  <button class="history-btn">📊</button>
                </td>
              `;

              // ===============================
              // ÉCOUTEURS ROBUSTES
              // ===============================

              // 1. Sélection ligne
              tr.onclick = (e) => {
                if (!['BUTTON', 'INPUT', 'A'].includes(e.target.tagName)) {
                  const checkbox = tr.querySelector('.product-checkbox');
                  if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    const isChecked = checkbox.checked;
                    if (isChecked && !selectedProducts.includes(p)) {
                      selectedProducts.push(p);
                      tr.classList.add('selected');
                    } else if (!isChecked) {
                      selectedProducts = selectedProducts.filter(x => x !== p);
                      tr.classList.remove('selected');
                    }
                    updateSelection();
                  }
                }
              };

              // 2. Checkbox
              const checkbox = tr.querySelector('.product-checkbox');
              if (checkbox) {
                checkbox.addEventListener('change', (e) => {
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
              }

              // 3. Bouton Édition (corrigé)
              const editBtn = tr.querySelector('.edit-btn');
              if (editBtn) {
                editBtn.onclick = (e) => {
                  e.stopPropagation();
                  console.log("[RENDERER] Clic sur bouton Éditer pour:", p.name);
                  if (typeof window.showEditPopup === 'function') {
                    try {
                      window.showEditPopup(p);
                    } catch (error) {
                      console.error("[RENDERER] Erreur showEditPopup:", error);
                      alert(`Erreur ouverture popup: ${error.message}`);
                    }
                  } else {
                    console.error("[RENDERER] showEditPopup non défini");
                    alert("Fonction d'édition non disponible. Veuillez recharger la page.");
                  }
                };
              }

              // 4. Bouton Historique
              const historyBtn = tr.querySelector('.history-btn');
              if (historyBtn) {
                historyBtn.onclick = (e) => {
                  e.stopPropagation();
                  if (typeof window.showHistoryPopup === 'function') {
                    window.showHistoryPopup(p);
                  } else {
                    console.error("[RENDERER] showHistoryPopup non défini");
                  }
                };
              }

              tableBody.appendChild(tr);
            });
          });
        });
      } catch (error) {
        console.error("[RENDERER] Erreur rendu tableau:", error);
        tableBody.innerHTML = '<tr><td colspan="11">Erreur d\'affichage. Voir console.</td></tr>';
      }
    }

    // ===============================
    // CHARGEMENT DES PRODUITS AVEC GESTION D'ERREURS
    // ===============================
    async function loadProducts() {
      try {
        if (!popupModulesLoaded) {
          console.log("[RENDERER] Attente des modules...");
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (typeof window.api?.getProducts !== 'function') {
          throw new Error("API getProducts non disponible");
        }

        const products = await window.api.getProducts();
        renderProducts(products);
      } catch (error) {
        console.error("[RENDERER] Erreur chargement produits:", error);
        tableBody.innerHTML = '<tr><td colspan="11">Erreur de chargement. Voir console.</td></tr>';
      }
    }

    // ===============================
    // ÉCOUTEURS GLOBAUX SÉCURISÉS
    // ===============================
    document.addEventListener('click', async (e) => {
      // Lien produit
      if (e.target.classList.contains('product-link')) {
        e.preventDefault();
        const url = e.target.dataset.url;
        if (url && typeof window.api?.openInWindow === 'function') {
          try {
            await window.api.openInWindow(url);
          } catch (error) {
            console.error("[RENDERER] Erreur ouverture URL:", error);
          }
        }
      }

      // Lien marque
      if (e.target.classList.contains('brand-link')) {
        e.preventDefault();
        const brand = e.target.dataset.brand;
        const site = e.target.dataset.site;
        if (brand && site && typeof window.api?.getBrandUrl === 'function') {
          try {
            const url = await window.api.getBrandUrl(brand, site);
            if (url && typeof window.api.openInWindow === 'function') {
              await window.api.openInWindow(url);
            }
          } catch (error) {
            console.error("[RENDERER] Erreur lien marque:", error);
          }
        }
      }
    });

    // ===============================
    // ÉCOUTEURS SIDEBAR AVEC VÉRIFICATIONS
    // ===============================
    const setupSidebarButtons = () => {
      const scrapeBtn = document.getElementById('scrape-url');
      const graphBtn = document.getElementById('show-graph-all');
      const updateBtn = document.getElementById('update-selected');
      const deleteBtn = document.getElementById('delete-selected');

      if (scrapeBtn) {
        scrapeBtn.addEventListener('click', async () => {
          const urlInput = document.getElementById('product-url');
          if (!urlInput) return;

          const url = urlInput.value.trim();
          if (!url) return alert('URL requise');

          if (typeof window.api?.scrapeProduct !== 'function') {
            return alert("Fonction de scraping non disponible");
          }

          try {
            const result = await window.api.scrapeProduct(url);
            if (!result.success) throw new Error(result.error);

            if (typeof window.showProductPopup !== 'function') {
              throw new Error("Popup produit non disponible");
            }

            const suggestions = await window.api.getCanonicalSuggestions(result.data.name);
            window.showProductPopup(result.data, suggestions);
          } catch (error) {
            console.error("[RENDERER] Erreur scraping:", error);
            alert(`Scraping échoué: ${error.message}`);
          }
        });
      }

      if (graphBtn) {
        graphBtn.addEventListener('click', () => {
          if (selectedProducts.length === 0) {
            return alert('Aucun produit sélectionné');
          }
          if (typeof window.showChartPopup !== 'function') {
            return alert("Fonction graphique non disponible");
          }
          window.showChartPopup(selectedProducts);
        });
      }

      if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
          if (selectedProducts.length === 0) {
            return alert('Aucun produit sélectionné');
          }
          if (typeof window.api?.upsertProduct !== 'function') {
            return alert("Fonction de mise à jour non disponible");
          }

          try {
            for (const product of selectedProducts) {
              await window.api.upsertProduct(product);
            }
            await loadProducts();
          } catch (error) {
            console.error("[RENDERER] Erreur mise à jour:", error);
            alert(`Mise à jour échouée: ${error.message}`);
          }
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          if (selectedProducts.length === 0) {
            return alert('Aucun produit sélectionné');
          }
          if (typeof window.api?.deleteProducts !== 'function') {
            return alert("Fonction de suppression non disponible");
          }

          try {
            const urls = selectedProducts.map(p => p.product_url);
            await window.api.deleteProducts(urls);
            selectedProducts = [];
            await loadProducts();
          } catch (error) {
            console.error("[RENDERER] Erreur suppression:", error);
            alert(`Suppression échouée: ${error.message}`);
          }
        });
      }
    };

    // Initialisation des boutons après un délai (pour laisser le temps au DOM)
    setTimeout(setupSidebarButtons, 300);

    // ===============================
    // CHARGEMENT INITIAL
    // ===============================




    // 👇 AJOUT ICI
    await loadPopupModules();
    
    await loadProducts();
    window.rendererLoadProducts = loadProducts;

  } catch (error) {
    console.error("[RENDERER] Erreur initiale fatale:", error);
    document.body.innerHTML = `
      <div style="color: red; padding: 20px; text-align: center;">
        <h2>Erreur critique</h2>
        <p>${error.message}</p>
        <p>Veuillez recharger la page.</p>
      </div>
    `;
  }
});
