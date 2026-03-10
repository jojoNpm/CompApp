const db = require('../db/database');
const canonicalService = require('./canonicalService');
const utils = require('./utils');

/**
 * Ajoute ou met à jour un produit avec gestion des promos et historique
 */
async function upsertProduct(rawData) {
  try {
    console.log("upsertProduct - Données reçues:", rawData);

    // 1. Standardisation des données
    const productData = utils.standardizeProductData(rawData);
    console.log("upsertProduct - Données standardisées:", productData);

    // 2. Détection de la marque si absente
    if (!productData.brand || productData.brand === 'Inconnue') {
      const detectedBrand = await canonicalService.detectBrandFromName(productData.name);
      if (detectedBrand) productData.brand = detectedBrand;
    }

    // 3. Vérifier si le produit existe déjà
    let existing = await db.getProductByUrl(productData.product_url);
    let productId;

    // 4. Préparer les données pour la base
    const dbData = {
      ...productData,
      promotions: JSON.stringify(productData.promotions)
    };

    if (existing) {
      await db.updateProduct(dbData);
      productId = existing.id;
    } else {
      const result = await db.insertProduct(dbData);
      productId = result.productId || result.lastID;
    }

    // 5. Gestion du bloc canonique
    const canonicalId = await canonicalService.getOrCreateCanonicalBlock(productData.name, productData.brand);
    await canonicalService.associateProductToBlock(productId, canonicalId);

    // 6. Gestion de l'historique des prix
    let historyUpdated = false;
    if (productData.history && productData.history.length > 0 && productId) {
      console.log("upsertProduct - Mise à jour de l'historique:", productData.history);
      try {
        await db.run('DELETE FROM price_history WHERE product_id = ?', [productId]);
        for (const entry of productData.history) {
          if (entry.price && entry.date) {
            console.log(`upsertProduct - Ajout de ${entry.price}€ le ${entry.date}`);
            await db.run(
              `INSERT INTO price_history (product_id, price, date) VALUES (?, ?, ?)`,
              [productId, entry.price, entry.date]
            );
          }
        }
        historyUpdated = true;
      } catch (dbError) {
        console.error("upsertProduct - Erreur historique:", dbError.message);
      }
    }

    // 7. Retour complet avec statut
    return {
      success: true,
      productId: productId,
      canonicalId: canonicalId,
      brand: productData.brand,
      historyUpdated: historyUpdated,
      message: "Produit mis à jour avec succès"
    };

  } catch (error) {
    console.error("upsertProduct - Erreur:", error);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

module.exports = {
  upsertProduct,
};
