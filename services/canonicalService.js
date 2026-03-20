const db = require('../db/database');
const utils = require('./utils');
const brandService = require('./brandService');

/**
 * Crée ou récupère un bloc canonique
 */
async function getOrCreateCanonicalBlock(productName, brandName) {
  const canonical_name = utils.generateCanonicalName(productName);
  const dbInstance = await db.openDb();

  // Vérifier si le bloc existe déjà
  const existing = await new Promise((resolve, reject) => {
    dbInstance.get(
      `SELECT id FROM canonical_products WHERE canonical_name = ? AND brand_name = ?`,
      [canonical_name, brandName],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.id : null);
      }
    );
  });

  if (existing) return existing;

  // Sinon, créer un nouveau bloc
  return await new Promise((resolve, reject) => {
    dbInstance.run(
      `INSERT INTO canonical_products (canonical_name, brand_name) VALUES (?, ?)`,
      [canonical_name, brandName],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

/**
 * Récupère les suggestions de noms canoniques
 */
async function getCanonicalSuggestions(productName) {
  const canonical_name = utils.generateCanonicalName(productName);
  const dbInstance = await db.openDb();

  return await new Promise((resolve, reject) => {
    dbInstance.all(
      `SELECT DISTINCT canonical_name
       FROM canonical_products
       WHERE canonical_name LIKE ?
       ORDER BY canonical_name
       LIMIT 10`,
      [`%${canonical_name}%`],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.canonical_name));
      }
    );
  });
}

/**
 * Détecte la marque avec brandService
 */
async function detectBrandFromName(productName) {
  const result = await brandService.detectBrand("", productName);
  return result.detected || null;
}

module.exports = {
  getOrCreateCanonicalBlock,
  getCanonicalSuggestions,
  associateProductToBlock: async (productId, canonicalId) => {
    const dbInstance = await db.openDb();
    await new Promise((resolve, reject) => {
      dbInstance.run(
        `UPDATE products SET canonical_id = ? WHERE id = ?`,
        [canonicalId, productId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  },
  detectBrandFromName
};