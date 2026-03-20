// ==========================================
// BRAND SERVICE
// Gestion canonique des marques
// ==========================================

const database = require('../db/database');

// Cache des marques (conservé pour les performances)
let brandsCache = [];
let brandsNormalizedMap = new Map();

/**
 * Normalise un nom de marque (utilise la même logique que database.js)
 */
function normalizeBrand(name) {
  if (!name) return null;
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Charge toutes les marques en mémoire (inclut brand_url pour cohérence avec database.js)
 */
async function loadBrands() {
  const db = await database.openDb();
  const brands = await db.all(`
    SELECT id, brand_name, site_name, brand_url
    FROM brands
  `);

  brandsCache = brands;
  brandsNormalizedMap.clear();

  for (const brand of brands) {
    const normalized = normalizeBrand(brand.brand_name);
    brandsNormalizedMap.set(normalized, brand.brand_name);
  }

  console.log("[BrandService] Marques chargées :", brandsCache.length);
}

/**
 * Retourne la version canonique d'une marque
 */
function getCanonicalBrand(name) {
  const normalized = normalizeBrand(name);
  return brandsNormalizedMap.get(normalized) || null;
}

/**
 * Détection de marque (priorité : sélecteur site → nom produit)
 */
async function detectBrand(scrapedBrand, productName) {
  // 1. Marque venant du site
  if (scrapedBrand) {
    const canonical = getCanonicalBrand(scrapedBrand);
    if (canonical) {
      return { detected: canonical, source: "site_selector" };
    }
  }

  // 2. Analyse du nom produit
  if (productName) {
    const detected = scanBrandInProductName(productName);
    if (detected) {
      return { detected, source: "product_name" };
    }
  }

  return { detected: "Inconnue", source: "none" };
}

/**
 * Recherche une marque dans le nom du produit
 */
function scanBrandInProductName(productName) {
  const normalizedProduct = normalizeBrand(productName);
  for (const brand of brandsCache) {
    const normalizedBrand = normalizeBrand(brand.brand_name);
    if (normalizedProduct.includes(normalizedBrand)) {
      return brand.brand_name;
    }
  }
  return null;
}

/**
 * Suggestions de marques (autocomplétion)
 */
function getBrandSuggestions(input) {
  const normalized = normalizeBrand(input);
  if (!normalized) return [];

  const suggestions = [];
  for (const brand of brandsCache) {
    const normalizedBrand = normalizeBrand(brand.brand_name);
    if (normalizedBrand.startsWith(normalized)) {
      suggestions.push(brand.brand_name);
      if (suggestions.length >= 5) break;
    }
  }
  return suggestions;
}

/**
 * Création d'une nouvelle marque (utilise getOrCreateBrand de database.js pour cohérence)
 */
async function createBrand(brandName, siteName = "Inconnu", brandUrl = "") {
  const db = await database.openDb();
  const brandId = await database.getOrCreateBrand(brandName, siteName, brandUrl);
  await loadBrands(); // Recharge le cache
  return brandId;
}

/**
 * Ajoute l'URL d'une marque pour un site (corrigé : utilise la table brands directement)
 */
async function addBrandSite(brandName, siteName, brandUrl) {
  const db = await database.openDb();
  // Utilise getOrCreateBrand pour s'assurer que la marque existe
  const brandId = await database.getOrCreateBrand(brandName, siteName, brandUrl);
  return brandId;
}

/**
 * Récupère l'URL d'une marque pour un site (corrigé : utilise la table brands directement)
 */
async function getBrandSiteUrl(brandName, siteName) {
  const db = await database.openDb();
  const result = await db.get(`
    SELECT brand_url
    FROM brands
    WHERE brand_name = ?
    AND site_name = ?
  `, [brandName, siteName]);

  return result ? result.brand_url : null;
}

/**
 * Récupère toutes les marques (pour le cache ou l'UI)
 */
async function getAllBrands() {
  const db = await database.openDb();
  return db.all(`
    SELECT DISTINCT brand_name
    FROM brands
    ORDER BY brand_name
  `);
}

/**
 * Récupère tous les sites pour une marque donnée
 */
async function getSitesForBrand(brandName) {
  const db = await database.openDb();
  return db.all(`
    SELECT site_name, brand_url
    FROM brands
    WHERE brand_name = ?
    ORDER BY site_name
  `, [brandName]);
}

module.exports = {
  loadBrands,
  detectBrand,
  getCanonicalBrand,
  getBrandSuggestions,
  createBrand,
  addBrandSite,
  getBrandSiteUrl,
  getAllBrands,          // Nouvelle fonction exportée
  getSitesForBrand,      // Nouvelle fonction exportée
  normalizeBrand         // Exporté pour cohérence avec utils.js
};
