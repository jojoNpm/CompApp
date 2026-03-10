// =======================================
// PRODUCT-SERVICE.JS
// =======================================

const database = require('../db/database');

async function upsertProduct(product) {

  try {

    console.log("[SERVICE] Mise à jour produit :", product.id);

    const db = await database.openDb();

    await db.run(
      `UPDATE products
       SET name = ?
       WHERE id = ?`,
      [product.name, product.id]
    );

    console.log("[SERVICE] Produit mis à jour");

    return {
      success: true,
      productId: product.id
    };

  } catch (error) {

    console.error("[SERVICE] Erreur :", error);

    return {
      success: false,
      error: error.message
    };

  }

}

module.exports = {
  upsertProduct
};