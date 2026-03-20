// =======================================
// PRODUCT-SERVICE.JS
// Gestion des produits (insert / update / historique)
// =======================================

const database = require('../db/database');
const brandService = require('./brandService');
const utils = require('./utils');

/**
 * Ajoute ou met à jour un produit
 */
async function upsertProduct(rawData) {
  try {
    if (!rawData) {
      throw new Error("Données produit manquantes");
    }

    // 1️⃣ Standardisation des données
    const product = utils.standardizeProductData(rawData) || {};

    product.id = product.id || null;
    product.name = product.name || "";
    product.canonical_name = product.canonical_name || utils.generateCanonicalName(product.name) || "";
    product.brand = product.brand || "Inconnue";
    product.site_name = product.site_name || product.site || "";
    product.product_url = product.product_url || "";
    product.weight_raw = product.weight_raw || "";
    product.availability = product.availability || null;

    // prix sécurisés
    product.regular_price = Number(product.regular_price) || 0;
    product.promo_price = product.promo_price !== undefined ? Number(product.promo_price) : null;
    product.promo_percent = product.promo_percent !== undefined ? Number(product.promo_percent) : 0;
    product.price_per_kg = product.price_per_kg !== undefined ? Number(product.price_per_kg) : null;

    // 2️⃣ Détection de marque si absente
    if (!product.brand || product.brand === "Inconnue") {
      try {
        const detected = await brandService.detectBrand("", product.name);
        if (detected && detected.detected) {
          product.brand = detected.detected;
        }
      } catch (err) {
        console.warn("[PRODUCT SERVICE] Impossible de détecter la marque:", err.message);
      }
    }

    // 3️⃣ Préparation données DB
    const productData = {
      id: product.id,

      name: product.name,
      canonical_name: product.canonical_name,

      brand: product.brand,
      site_name: product.site_name, // ✅ harmonisé

      product_url: product.product_url,
      product_reference: product.product_reference || null,

      regular_price: product.regular_price,
      promo_price: product.promo_price,
      promo_percent: product.promo_percent,

      price_per_kg: product.price_per_kg,
      weight_raw: product.weight_raw,

      availability: product.availability,

      brand_url: product.brand_url || null,

      image: product.image || null
    };

    // 4️⃣ Appel database
    const result = await database.upsertProduct(productData);

    if (!result || !result.success) {
      throw new Error(result?.error || "Échec de l'opération");
    }

    return {
      success: true,
      productId: result.productId,
      message: product.id ? "Produit mis à jour" : "Produit ajouté"
    };

  } catch (error) {
    console.error("[PRODUCT SERVICE ERROR]", error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function getProductById(id) {
  try {
    if (!id) return null;
    return await database.getProductById(id);
  } catch (error) {
    console.error("[PRODUCT SERVICE] Erreur getProductById:", error);
    return null;
  }
}

async function getAllProducts() {
  try {
    return await database.getAllProducts();
  } catch (error) {
    console.error("[PRODUCT SERVICE] Erreur getAllProducts:", error);
    return [];
  }
}

async function deleteProducts(urls) {
  try {
    if (!Array.isArray(urls) || urls.length === 0) {
      return { success:false, error:"Liste URLs vide" };
    }
    return await database.deleteProducts(urls);
  } catch (error) {
    console.error("[PRODUCT SERVICE] Erreur deleteProducts:", error);
    return {
      success:false,
      error:error.message
    };
  }
}

async function getProductHistory(productId) {
  try {
    if (!productId) return [];
    return await database.getPriceHistory(productId);
  } catch (error) {
    console.error("[PRODUCT SERVICE] Erreur getProductHistory:", error);
    return [];
  }
}

module.exports = {
  upsertProduct,
  getProductById,
  getAllProducts,
  deleteProducts,
  getProductHistory
};