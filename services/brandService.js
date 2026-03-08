const database = require('../db/database');
const utils = require('./utils');

/**
 * Détecte la meilleure marque en utilisant utils.normalize
 */
async function detectBrand(scrapedBrand, productName) {
  const db = await database.openDb();
  const brands = await new Promise((resolve, reject) => {
    db.all(`SELECT brand_name FROM brands`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.brand_name));
    });
  });

  const normalizedScraped = utils.normalize(scrapedBrand);
  const normalizedName = utils.normalize(productName);

  let bestMatch = null;
  let bestScore = 0;

  for (const brand of brands) {
    const normalizedBrand = utils.normalize(brand);
    const scoreBrand = similarity(normalizedScraped, normalizedBrand);
    const scoreName = similarity(normalizedName, normalizedBrand);
    const score = Math.max(scoreBrand, scoreName);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = brand;
    }
  }

  return bestScore >= 0.8 ? { detected: bestMatch, score: bestScore } : { detected: null, score: bestScore };
}

// ... (le reste du fichier reste inchangé, y compris levenshtein/similarity)
