const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.db');

if (fs.existsSync(dbPath)) {
  console.log("[DB REAL PATH]", fs.realpathSync(dbPath));
} else {
  console.log("[DB REAL PATH] fichier inexistant (sera créé)");
}

console.log("[DB] Path:", dbPath);

let db;

/* ======================
   OUVERTURE DB
====================== */
function openDb() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("[DB] Erreur ouverture:", err);
        reject(err);
      } else {
        db.run("PRAGMA foreign_keys = ON");
        console.log("[DB] Base ouverte");
        resolve(db);
      }
    });
  });
}

/* ======================
   INITIALISATION (ajout colonne image BLOB et image_url)
====================== */
async function init() {
  const database = await openDb();
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // Table brands
      database.run(`
        CREATE TABLE IF NOT EXISTS brands(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          brand_name TEXT NOT NULL,
          site_name TEXT NOT NULL,
          brand_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(brand_name, site_name)
        )
      `);

      // Table canonical_products
      database.run(`
        CREATE TABLE IF NOT EXISTS canonical_products(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          canonical_name TEXT NOT NULL,
          brand_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(canonical_name, brand_name)
        )
      `);

      // Ajouter la colonne image_url si elle n'existe pas
      database.run(`ALTER TABLE products ADD COLUMN image_url TEXT`, (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          console.error("Erreur lors de l'ajout de la colonne image_url :", err);
          reject(err);
        } else {
          console.log("Colonne image_url ajoutée ou déjà existante.");
        }
      });


      // Table products (avec image BLOB et image_url)
      database.run(`
        CREATE TABLE IF NOT EXISTS products(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          canonical_id INTEGER,
          brand_id INTEGER,
          name TEXT,
          site_name TEXT,
          product_url TEXT UNIQUE,
          product_reference TEXT UNIQUE,
          regular_price REAL,
          promo_price REAL,
          promo_percent REAL,
          price_per_kg REAL,
          weight_raw TEXT,
          availability TEXT,
          image BLOB,
          image_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen TEXT,
          FOREIGN KEY(brand_id) REFERENCES brands(id),
          FOREIGN KEY(canonical_id) REFERENCES canonical_products(id)
        )
      `);

      // Table price_history
      database.run(`
        CREATE TABLE IF NOT EXISTS price_history(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER,
          price REAL,
          promo_price REAL,
          date DATETIME,
          FOREIGN KEY(product_id) REFERENCES products(id),
          UNIQUE(product_id, date)
        )
      `);

      // Index
      database.run(`CREATE INDEX IF NOT EXISTS idx_products_canonical ON products(canonical_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_products_url ON products(product_url)`);

      resolve();
    });
  });
}

/* ======================
   UTILITAIRES
====================== */
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

function generateCanonicalName(name = '') {
  if (!name) return "";
  const ignoredWords = [
    'végétal', 'végétales', 'végétarien', 'végétariennes',
    'veggie', 'vegan', 'vegetaux', 'vegetal'
  ];
  let cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  ignoredWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  cleaned = cleaned.replace(/\d+(\.\d+)?\s?(g|kg|ml|cl|l)\\b/gi, '');
  cleaned = cleaned
    .replace(/(\.?[^()]*\(\s*[^()]*\s*\))/g, '')
    .replace(/[-\–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

function generateProductReference(product) {
  const canonical = generateCanonicalName(product.name);
  const canonicalSlug = slugify(canonical);
  const brandSlug = slugify(product.brand);
  const siteSlug = slugify(product.site_name || product.site);
  return `${canonicalSlug}-${brandSlug}-${siteSlug}`;
}

/* ======================
   CANONICAL
====================== */
async function insertCanonicalProduct(canonicalName, brandName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO canonical_products(canonical_name, brand_name) VALUES(?, ?)`,
      [canonicalName, brandName],
      function(err) {
        if (err) return reject(err);
        if (this.lastID) return resolve(this.lastID);
        db.get(
          `SELECT id FROM canonical_products WHERE canonical_name=? AND brand_name=?`,
          [canonicalName, brandName],
          (err, row) => {
            if (err) reject(err);
            else resolve(row?.id || null);
          }
        );
      }
    );
  });
}

/* ======================
   MARQUES
====================== */
async function getOrCreateBrand(brandName, siteName, brandUrl = '') {
  const db = await openDb();
  let brand = await new Promise((resolve, reject) => {
    db.get(
      `SELECT id FROM brands WHERE brand_name=? AND site_name=?`,
      [brandName, siteName],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
  if (brand) return brand.id;
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO brands(brand_name, site_name, brand_url) VALUES(?, ?, ?)`,
      [brandName, siteName, brandUrl],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

/* ======================
   INSERT PRODUIT (image BLOB et image_url)
====================== */
async function insertProduct(product) {
  const db = await openDb();
  const siteName = product.site_name || product.site;
  const brandId = await getOrCreateBrand(product.brand, siteName, product.brand_url);
  const canonicalName = generateCanonicalName(product.name);
  const canonicalId = await insertCanonicalProduct(canonicalName, product.brand);
  const reference = generateProductReference(product);
  const today = new Date().toISOString();

  let existing = await new Promise((resolve, reject) => {
    db.get(`SELECT id FROM products WHERE product_reference=?`, [reference], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (existing) {
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE products SET
          canonical_id=?, brand_id=?, name=?, product_url=?, regular_price=?, promo_price=?,
          promo_percent=?, price_per_kg=?, weight_raw=?, availability=?, image=?, image_url=?, last_seen=?, site_name=?
        WHERE id=?`,
        [
          canonicalId, brandId, product.name, product.product_url, product.regular_price,
          product.promo_price, product.promo_percent, product.price_per_kg, product.weight_raw,
          product.availability, product.image || null, product.image_url || null, today, product.site_name, existing.id
        ],
        err => err ? reject(err) : resolve()
      );
    });
    return { success: true, id: existing.id };
  }

  const productId = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO products(
        canonical_id, brand_id, name, site_name, product_url, product_reference,
        regular_price, promo_price, promo_percent, price_per_kg, weight_raw,
        availability, image, image_url, last_seen
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        canonicalId, brandId, product.name, product.site_name, product.product_url, reference,
        product.regular_price, product.promo_price, product.promo_percent, product.price_per_kg,
        product.weight_raw, product.availability, product.image || null, product.image_url || null, today
      ],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });

  await addPriceHistoryEntry(productId, product.regular_price, product.promo_price, today);
  return { success: true, id: productId };
}

/* ======================
   UPSERT PRODUIT (image BLOB et image_url)
====================== */
async function upsertProduct(productData) {
  const db = await openDb();

  if (productData.regular_price < 0) throw new Error("Le prix régulier ne peut pas être négatif.");
  if (productData.promo_price !== undefined && productData.promo_price < 0)
    throw new Error("Le prix promo ne peut pas être négatif.");

  let brandId = productData.brand_id;
  if (!brandId && productData.brand && productData.site_name) {
    brandId = await getOrCreateBrand(productData.brand, productData.site_name, productData.brand_url);
  }

  let canonicalId = productData.canonical_id || productData.canonicalId;
  if (!canonicalId && productData.canonical_name) {
    canonicalId = await insertCanonicalProduct(productData.canonical_name, productData.brand);
  }

  let productId = productData.id;
  if (!productId) {
    const existing = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM products WHERE product_reference=? OR product_url=?`,
        [productData.product_reference, productData.product_url],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    if (existing) productId = existing.id;
  }

  const today = new Date().toISOString();
  if (productId) {
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE products SET
          name=?, canonical_id=?, brand_id=?, site_name=?, product_url=?,
          regular_price=?, promo_price=?, promo_percent=?, price_per_kg=?,
          weight_raw=?, availability=?, image=?, image_url=?, last_seen=?, site_name=?
        WHERE id=?`,
        [
          productData.name, canonicalId, brandId, productData.site_name, productData.product_url,
          productData.regular_price || 0, productData.promo_price, productData.promo_percent || 0, productData.price_per_kg,
          productData.weight_raw, productData.availability, productData.image || null, productData.image_url || null, today, productData.site_name, productId
        ],
        err => err ? reject(err) : resolve()
      );
    });
  } else {
    productId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO products(
          canonical_id, brand_id, name, site_name, product_url, product_reference,
          regular_price, promo_price, promo_percent, price_per_kg, weight_raw,
          availability, image, image_url, last_seen
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          canonicalId, brandId, productData.name, productData.site_name, productData.product_url,
          productData.product_reference, productData.regular_price || 0, productData.promo_price,
          productData.promo_percent || 0, productData.price_per_kg, productData.weight_raw,
          productData.availability, productData.image || null, productData.image_url || null, today
        ],
        function(err) { if (err) reject(err); else resolve(this.lastID); }
      );
    });
  }

  if (productId && productData.regular_price !== undefined) {
    await addPriceHistoryEntry(productId, productData.regular_price, productData.promo_price, today);
  } else throw new Error("Impossible d'ajouter à l'historique : productId non défini.");

  return { success: true, productId };
}

/* ======================
   HISTORIQUE
====================== */
async function addPriceHistoryEntry(productId, price, promoPrice, date) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO price_history(product_id, price, promo_price, date)
       VALUES(?, ?, ?, ?)`,
      [productId, price, promoPrice, date],
      err => err ? reject(err) : resolve()
    );
  });
}

async function getPriceHistory(productId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT price, promo_price, date FROM price_history WHERE product_id=? ORDER BY date ASC`,
      [productId],
      (err, rows) => err ? reject(err) : resolve(rows)
    );
  });
}

/* ======================
   PRODUITS
====================== */
async function getAllProducts() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT p.*, b.brand_name AS brand, c.canonical_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN canonical_products c ON p.canonical_id = c.id
      ORDER BY p.last_seen DESC
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(row => ({ ...row, brand: row.brand || 'Inconnu', canonical_name: row.canonical_name || '' })));
    });
  });
}

async function getProductById(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT p.*, b.brand_name AS brand, c.canonical_name AS canonical_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN canonical_products c ON p.canonical_id = c.id
      WHERE p.id=?
    `, [id], (err, row) => {
      if (err) {
        console.error("Erreur lors de la récupération du produit par ID:", err);
        reject(err);
      } else {
        console.log("Product fetched from DB:", row); // Log pour vérifier le produit récupéré
        resolve(row || null);
      }
    });
  });
}


/* ======================
   DELETE
====================== */
async function deleteProducts(urls) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.exec("BEGIN");
      let deletedCount = 0;
      urls.forEach(url => {
        db.run(`DELETE FROM price_history WHERE product_id IN (SELECT id FROM products WHERE product_url=?)`, [url], err => { if(err) reject(err); });
        db.run(`DELETE FROM products WHERE product_url=?`, [url], err => { if(err) reject(err); else deletedCount++; });
      });
      db.exec("COMMIT", err => err ? reject(err) : resolve({ success: true, deletedCount }));
    });
  });
}

/* ======================
   EXPORT
====================== */
module.exports = {
  openDb,
  init,
  insertProduct,
  upsertProduct,
  getAllProducts,
  getProductById,
  getPriceHistory,
  deleteProducts,
  generateCanonicalName,
  getOrCreateBrand,
  insertCanonicalProduct
};