// =============================================
// UTILS.JS - FONCTIONS UTILITAIRES
// =============================================

/**
 * Nettoie un prix (supprime les caractères non numériques, remplace les virgules)
 */
function cleanPrice(price) {
  if (price === null || price === undefined) return null;
  return parseFloat(price.toString().replace(',', '.').replace(/[^\d.-]/g, ''));
}

/**
 * Formate un prix pour l'affichage (ex: 3.5 -> "3,50 €")
 */
function formatPrice(price) {
  if (price === null || price === undefined || isNaN(price)) return 'N/A';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
}

/**
 * Extrait le nom du produit sans la marque
 */
function extractBrandFromName(name, brand) {
  if (!name || !brand) return name;
  const normalizedName = name.toLowerCase();
  const normalizedBrand = brand.toLowerCase();
  return normalizedName.includes(normalizedBrand)
    ? name.replace(new RegExp(brand, 'gi'), '').trim()
    : name;
}

/**
 * Mappings des noms de marques (harmonisé avec database.js)
 */
const BRAND_MAPPINGS = {
  "Planted Foods": "Planted",
};

/**
 * Normalise un nom de marque (utilise BRAND_MAPPINGS)
 */
function normalizeBrand(brand) {
  if (!brand) return "Inconnue";
  return BRAND_MAPPINGS[brand] || brand.trim();
}

/**
 * Génère un nom canonique pour un produit (harmonisé avec database.js)
 */
function generateCanonicalName(name = '') {
  if (!name) return "";
  const ignoredWords = [
    'végétal', 'végétales', 'végétarien', 'végétariennes',
    'veggie', 'vegan', 'vegetaux', 'vegetal', ' et ', 'gr', 'kg', ' g '
  ];
  let cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  ignoredWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  cleaned = cleaned.replace(/\d+(\.\d+)?\s?(g|kg|ml|cl|l)\b/gi, '');
  cleaned = cleaned
    .replace(/\([^)]*\)/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Parse une promotion (ex: "3 pour 2" ou "-20%")
 */
function parsePromotion(rawData) {
  if (!rawData) return {};
  const label = rawData.promotion_label || rawData.promoLabel || rawData.label || rawData.promotions?.label || null;
  if (!label) return {};
  const text = label.toLowerCase();
  let quantity = null, percent = null, multiPrice = null;
  let match = text.match(/(\d+)[eè]?\s*.*-(\d+)%/i);
  if (match) { quantity = parseInt(match[1]); percent = parseInt(match[2]); }
  else if ((match = text.match(/-(\d+)%/i))) { percent = parseInt(match[1]); }
  else if ((match = text.match(/(\d+)\s*pour\s*([\d,.]+)/i))) {
    quantity = parseInt(match[1]);
    multiPrice = cleanPrice(match[2]);
  }
  return {
    promotion_label: label,
    promotion_quantity: quantity,
    promo_percent: percent,
    promotion_multi_price: multiPrice
  };
}

/**
 * Standardise les données d'un produit (harmonisé avec database.js)
 */
function standardizeProductData(rawData) {
  const cleanedName = rawData.brand ? extractBrandFromName(rawData.name, rawData.brand) : rawData.name;
  const normalizedBrand = normalizeBrand(rawData.brand || "Inconnue");
  const canonicalName = cleanedName ? generateCanonicalName(cleanedName) : null;
  const brandSlug = normalizedBrand.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const siteSlug = (rawData.site_name || rawData.site || "Inconnu").toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const regularPrice = cleanPrice(rawData.regular_price || rawData.price);
  const promoPrice = cleanPrice(rawData.promo_price || rawData.promoPrice);
  const pricePerKg = cleanPrice(rawData.price_per_kg || rawData.pricePerKg);
  const promoParsed = parsePromotion(rawData);
  const promoPercent = parseFloat(rawData.promo_percent || promoParsed.promo_percent || 0);
  const realPercent = promoParsed.promotion_quantity ? Math.round(promoPercent / 2) : promoPercent;
  const promoPricePerKg = pricePerKg && realPercent ? pricePerKg * (1 - realPercent / 100) : null;

  return {
    name: cleanedName || "Inconnu",
    brand: normalizedBrand,
    site_name: rawData.site_name || rawData.site || "Inconnu",
    product_url: rawData.url || rawData.product_url,
    image_url: rawData.image_url || null,
    regular_price: regularPrice,
    promo_price: promoPrice,
    promo_percent: promoPercent,
    promotion_label: promoParsed.promotion_label || null,
    promotion_quantity: promoParsed.promotion_quantity || null,
    promotion_multi_price: promoParsed.promotion_multi_price || null,
    price_per_kg: pricePerKg,
    promo_price_per_kg: promoPricePerKg,
    weight_raw: rawData.weight_raw || rawData.weight || null,
    availability: rawData.availability || "Inconnu",
    canonical_name: canonicalName,
    product_reference: rawData.product_reference || `${canonicalName}-${brandSlug}-${siteSlug}`,
    brand_url: rawData.brand_url,
    promotions: {
      label: promoParsed.promotion_label,
      realPercent: realPercent,
      promoPricePerKg: promoPricePerKg
    }
  };
}

/**
 * Détecte la disponibilité d'un produit (pour le scraping)
 */
function detectAvailability($) {
  return ($('.out-of-stock').length > 0 || $('.add-to-cart:disabled').length > 0) ? 'unavailable' : 'available';
}

/**
 * Génère un slug (utilisé pour les références produits)
 */
function slugify(text = '') {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .trim();
}


// =============================================
// EXPORTS
// =============================================

// Node / CommonJS (services, scrapers)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cleanPrice,
    formatPrice,
    extractBrandFromName,
    normalizeBrand,
    generateCanonicalName,
    parsePromotion,
    standardizeProductData,
    detectAvailability,
    slugify
  };
}

// Browser / Renderer
if (typeof window !== "undefined") {
  window.utils = {
    cleanPrice,
    formatPrice,
    extractBrandFromName,
    normalizeBrand,
    generateCanonicalName,
    parsePromotion,
    standardizeProductData,
    detectAvailability,
    slugify
  };
}