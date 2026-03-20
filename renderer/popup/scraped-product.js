// =============================================
// SCRAPED-PRODUCT.JS
// =============================================

let currentScrapedProduct = null;

/**
 * Fuzzy match pour trouver la meilleure marque depuis la base
 */
async function fuzzyMatchBrand(scrapedBrand) {
  try {
    const allBrands = await window.api.getBrands();
    const cleanedTarget = (scrapedBrand || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    let best = null;
    let bestScore = 0;

    if (window.stringSimilarity) {
      const { bestMatch } = window.stringSimilarity.findBestMatch(scrapedBrand, allBrands);
      best = bestMatch.target;
      bestScore = bestMatch.rating;
    } else {
      allBrands.forEach(b => {
        const candidate = (b || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        let score = 0;
        for (let char of cleanedTarget) if (candidate.includes(char)) score++;
        score = score / Math.max(cleanedTarget.length, candidate.length);
        if (score > bestScore) {
          bestScore = score;
          best = b;
        }
      });
    }

    return { detectedBrand: best || "", score: bestScore };
  } catch (err) {
    console.error("Erreur fuzzyMatchBrand:", err);
    return { detectedBrand: "", score: 0 };
  }
}

async function showScrapedProductPopup(product) {
  try {
    console.log("🔍 START | showScrapedProductPopup", product);

    const normalized = {
      ...product,
      name: window.utils.extractBrandFromName(product.name, product.brand),
      brand: product.brand || "",
      canonical_name: (product.canonical_name || window.utils.generateCanonicalName(product.name))
        .replace(/-/g, " "),
    };

    currentScrapedProduct = normalized;

    // =========================
    // FUZZY MATCH
    // =========================
    const { detectedBrand, score } = await fuzzyMatchBrand(normalized.brand);
    currentScrapedProduct.brand_scraped = normalized.brand;

    const FUZZY_THRESHOLD = 0.6;
    currentScrapedProduct.isNewBrand = score < FUZZY_THRESHOLD;
    currentScrapedProduct.brand = score >= FUZZY_THRESHOLD ? detectedBrand : normalized.brand;

    // 👉 IMPORTANT : flag contexte scraped
    currentScrapedProduct.__fromScraped = true;

    console.log("🧠 Fuzzy match:", normalized.brand, "→", detectedBrand, "(score:", score, ")");
    console.log("⚠ Nouvelle marque ? :", currentScrapedProduct.isNewBrand);

    // =========================
    // CANONICAL SUGGESTIONS
    // =========================
    let canonicalSuggestions = [];
    try {
      const result = await window.api.getCanonicalSuggestions(normalized.canonical_name);
      canonicalSuggestions = Array.isArray(result) ? result : result?.suggestions || [];
    } catch {}

    // =========================
    // PRIX / PROMO
    // =========================
    const hasPromo = !!normalized.promo_price || !!normalized.promotion_label;
    const priceBlock = normalized.promo_price
      ? `
        <span style="text-decoration:line-through;color:red;">
          ${window.utils.formatPrice(normalized.regular_price)}
        </span>
        <span style="color:green;font-weight:bold;margin-left:8px;">
          ${window.utils.formatPrice(normalized.promo_price)}
        </span>
      `
      : `<span>${window.utils.formatPrice(normalized.regular_price)}</span>`;

    // =========================
    // HTML POPUP
    // =========================
    const html = `
      ${window.popupCore.buildHeader(normalized)}

      <div class="popup-body">

        <div class="popup-field">
          <label>Nom produit</label>
          <div id="scrapedProductName" class="editable-field">${normalized.name}</div>
        </div>

        <div class="popup-field">
          <label>Nom canonique</label>
          <div class="canonical-suggestions">
            ${canonicalSuggestions.map(s => `<div class="suggestion-btn">${s}</div>`).join("")}
          </div>
          <div id="customCanonical" class="editable-field">${normalized.canonical_name}</div>
        </div>

        <div class="form-group">
          <label>Marque scrapée → Marque détectée</label>

          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div class="brand-raw">${currentScrapedProduct.brand_scraped}</div>
            <span>→</span>

            <div id="brand-display" class="brand-display">${currentScrapedProduct.brand}</div>

            ${currentScrapedProduct.isNewBrand 
              ? `<span id="newBrandWarning" style="color:orange;font-weight:bold;cursor:pointer;">⚠ Nouvelle marque ?</span>` 
              : ""}
          </div>

          <div id="brand-selector-container" style="margin-top:6px;"></div>
        </div>

        <div class="popup-field">
          <label>Poids</label>
          <div id="scrapedWeight" class="editable-field">${normalized.weight_raw || ""}</div>
        </div>

        <div style="display:flex;gap:40px;justify-content:space-between;">
          <div class="popup-field" style="flex:1;">
            <label>Prix</label>
            <div class="static-field">${priceBlock}</div>
          </div>
          <div class="popup-field" style="flex:1;">
            <label>Prix / kg</label>
            <div class="static-field">
              ${normalized.price_per_kg ? window.utils.formatPrice(normalized.price_per_kg) : "N/A"}
            </div>
          </div>
        </div>

        ${hasPromo ? `
        <div style="display:flex;gap:40px;justify-content:space-between;">
          <div class="popup-field" style="flex:1;">
            <label>Promo</label>
            <div class="static-field">${normalized.promotion_label || "—"}</div>
          </div>
          <div class="popup-field" style="flex:1;">
            <label>Promo réelle</label>
            <div class="static-field">
              ${normalized.promotions?.realPercent ? normalized.promotions.realPercent + "%" : "—"}
            </div>
          </div>
        </div>` : ""}

        <div class="popup-field">
          <label>URL produit</label>
          <div id="scrapedProductUrl" class="editable-field">${normalized.product_url || ""}</div>
        </div>

        <div class="popup-field">
          <label>URL marque</label>
          <input id="scrapedBrandUrl" class="editable-field" type="text"/>
        </div>

      </div>

      <div class="popup-footer">
        <button id="scrapedCancelBtn" class="btn-secondary">Annuler</button>
        <button id="scrapedAddBtn" class="btn-primary">Ajouter</button>
      </div>
    `;

    // =========================
    // OPEN POPUP
    // =========================
    window.popupCore.openPopup(html);

    // =========================
    // Remplir URL marque
    // =========================
    await window.popupCore.updateBrandUrlField(currentScrapedProduct);

    // =========================
    // ENABLE EDITING & BRAND SELECTOR
    // =========================
    window.popupCore.enableFieldEditing("scrapedProductName", currentScrapedProduct, "name");
    window.popupCore.enableFieldEditing("scrapedWeight", currentScrapedProduct, "weight_raw");
    window.popupCore.enableFieldEditing("scrapedProductUrl", currentScrapedProduct, "product_url");

    window.popupCore.enableFieldEditing("customCanonical", currentScrapedProduct, "canonical_name");
    window.popupCore.setupCanonicalSuggestions(".suggestion-btn", "customCanonical", currentScrapedProduct);

    window.popupCore.setupBrandSelector(
      "brand-display",
      "brand-selector-container",
      currentScrapedProduct,
    );

    // =========================
    // ⚠ NOUVELLE MARQUE (scraped ONLY)
    // =========================
    const newBrandWarning = document.getElementById("newBrandWarning");

    if (newBrandWarning) {
  newBrandWarning.onclick = (e) => {
    e.stopPropagation();

    window.popupCore.openNewBrandPopup(
      currentScrapedProduct.brand,
      currentScrapedProduct.site_name,
      async (name, url) => {
        currentScrapedProduct.brand = name;
        currentScrapedProduct.brand_url = url;

        const display = document.getElementById("brand-display");
        if (display) display.innerText = name;

        currentScrapedProduct.isNewBrand = false;
        await window.popupCore.updateBrandUrlField(currentScrapedProduct);
      }
    );
  };
}

    // =========================
    // ADD PRODUCT
    // =========================
    document.getElementById("scrapedAddBtn").onclick = async () => {
      try {
        const productUrlEl = document.getElementById("scrapedProductUrl");
        const brandUrlEl = document.getElementById("scrapedBrandUrl");

        currentScrapedProduct.product_url =
          productUrlEl ? productUrlEl.innerText.trim() : "";

        currentScrapedProduct.brand_url =
          brandUrlEl ? brandUrlEl.value.trim() : "";

        if (currentScrapedProduct.isNewBrand) {
          return window.popupCore.showToast(
            "⚠ Cette marque n’existe pas encore. Confirmez ou choisissez une marque.",
            "error"
          );
        }

        if (!currentScrapedProduct.brand) {
          return window.popupCore.showToast("Marque non reconnue dans la DB", "error");
        }

        if (!currentScrapedProduct.product_reference) {
          currentScrapedProduct.product_reference =
            currentScrapedProduct.canonical_name + " " +
            currentScrapedProduct.brand + " " +
            (currentScrapedProduct.site_name || "");
        }

        console.log("4️⃣ Ajout produit:", currentScrapedProduct);

        const result = await window.api.upsertProduct(currentScrapedProduct);
        if (!result.success) throw new Error(result.error);

        window.popupCore.showToast("Produit ajouté", "success");
        window.popupCore.closePopup();
        window.rendererLoadProducts?.();
      } catch (err) {
        console.error(err);
        window.popupCore.showToast("Erreur ajout produit", "error");
      }
    };

    document.getElementById("scrapedCancelBtn").onclick = window.popupCore.closePopup;

  } catch (err) {
    console.error("⚠ Erreur popup produit scrapé:", err);
  }
}

window.showScrapedProductPopup = showScrapedProductPopup;
window.fuzzyMatchBrand = fuzzyMatchBrand;

console.log("[SCRAPED POPUP] CLEANED - CORE CENTRALISÉ");