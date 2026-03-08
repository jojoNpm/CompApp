const db = require('../db/database');
const canonicalService = require('./canonicalService');
const utils = require('./utils');

/**
 * Ajoute ou met à jour un produit avec gestion des promos et historique
 */
async function upsertProduct(rawData) {
  // 1. Standardisation des données (inclut calcul des promos)
  const productData = utils.standardizeProductData(rawData);

  // 2. Détection de la marque si absente
  if (!productData.brand || productData.brand === 'Inconnue') {
    const detectedBrand = await canonicalService.detectBrandFromName(productData.name);
    if (detectedBrand) productData.brand = detectedBrand;
  }

  // 3. Vérifier si le produit existe déjà
  let existing = await db.getProductByUrl(productData.product_url);
  let productId;

  // 4. Préparer les données pour la base (inclut promotions et historique)
  const dbData = {
    ...productData,
    promotions: JSON.stringify(productData.promotions), // Stockage en JSON
    history: JSON.stringify(productData.history || []) // Historique des prix
  };

  if (existing) {
    // Mise à jour du produit existant
    await db.updateProduct(dbData);
    productId = existing.id;
  } else {
    // Insertion d'un nouveau produit
    const result = await db.insertProduct(dbData);
    productId = result.productId || result.lastID;
  }

  // 5. Gestion du bloc canonique
  const canonicalId = await canonicalService.getOrCreateCanonicalBlock(productData.name, productData.brand);
  await canonicalService.associateProductToBlock(productId, canonicalId);

  return { success: true, productId, canonicalId, brand: productData.brand };
}

/**
 * Met à jour l'historique des prix d'un produit
 */
async function updateProductHistory(productId, newPriceData) {
  const product = await db.getProductById(productId);
  const history = JSON.parse(product.history || '[]');
  history.push({
    date: new Date().toISOString().split('T')[0],
    ...newPriceData
  });
  await db.updateProductHistory(productId, JSON.stringify(history));
}

module.exports = {
  upsertProduct,
  updateProductHistory
};
