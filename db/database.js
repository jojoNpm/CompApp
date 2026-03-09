const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'products.db');
let db;

function openDb() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

async function init() {
  const database = await openDb();
  return new Promise((resolve, reject) => {
    database.serialize(() => {

      database.run(`
        CREATE TABLE IF NOT EXISTS brands (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          brand_name TEXT NOT NULL,
          site_name TEXT NOT NULL,
          brand_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(brand_name, site_name)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS canonical_products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          canonical_name TEXT NOT NULL,
          brand_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(canonical_name, brand_name)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          canonical_id INTEGER,
          brand_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          site_name TEXT NOT NULL,
          product_url TEXT UNIQUE NOT NULL,
          product_reference TEXT UNIQUE,
          regular_price REAL,
          promo_price REAL,
          promo_percent REAL,
          price_per_kg REAL,
          weight_raw TEXT,
          availability TEXT,
          availability_status TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen TEXT,
          FOREIGN KEY (brand_id) REFERENCES brands(id),
          FOREIGN KEY (canonical_id) REFERENCES canonical_products(id)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS price_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          price REAL NOT NULL,
          date TEXT NOT NULL,
          FOREIGN KEY (product_id) REFERENCES products(id),
          UNIQUE(product_id, date)
        )
      `);

      // Index pour accélérer les recherches
      database.run(`CREATE INDEX IF NOT EXISTS idx_brands_name_site ON brands(brand_name, site_name)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_products_canonical_id ON products(canonical_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_products_reference ON products(product_reference)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(date)`);

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
  const ignoredWords = ['végétal', 'végétales', 'végétaux', 'végétarien', 'végétariennes', 'veggie', 'vegan', 'bio','gr','kg',' g '];
  let cleaned = name;

  ignoredWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });

  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  cleaned = cleaned.replace(/[-–—]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  const articles = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou'];
  articles.forEach(article => {
    const regex = new RegExp(`\\b${article}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  cleaned = cleaned.toLowerCase();

  return cleaned;
}

function generateProductReference(productData) {
  const canonical = generateCanonicalName(productData.name);
  const canonicalSlug = slugify(canonical);
  const brandSlug = slugify(productData.brand);
  const siteSlug = slugify(productData.site_name || productData.site);

  return `${canonicalSlug}-${brandSlug}-${siteSlug}`;
}

/* ======================
   CANONICAL
====================== */
async function insertCanonicalProduct(canonicalName, brandName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO canonical_products (canonical_name, brand_name) VALUES (?, ?)`,
      [canonicalName, brandName],
      function(err) {
        if (err) reject(err);
        else {
          if (this.lastID) resolve(this.lastID);
          else {
            db.get(
              `SELECT id FROM canonical_products WHERE canonical_name = ? AND brand_name = ?`,
              [canonicalName, brandName],
              (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.id : null);
              }
            );
          }
        }
      }
    );
  });
}

async function getCanonicalSuggestions(name) {
  const db = await openDb();
  const canonicalName = generateCanonicalName(name);

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT canonical_name
       FROM canonical_products
       WHERE canonical_name LIKE ?
       ORDER BY canonical_name
       LIMIT 10`,
      [`%${canonicalName}%`],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.canonical_name));
      }
    );
  });
}


async function updateProductCanonicalId(productId, canonicalId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.run(`UPDATE products SET canonical_id = ? WHERE id = ?`, [canonicalId, productId], function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}



/* ======================
   PRODUITS
====================== */
async function insertProduct(productData) {
  const db = await openDb();

  // Vérifie ou insère la marque
  let brandId = await new Promise((resolve, reject) => {
    db.get(
      `SELECT id FROM brands WHERE brand_name = ? AND site_name = ?`,
      [productData.brand, productData.site_name || productData.site],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.id : null);
      }
    );
  });

  if (!brandId) {
    brandId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO brands (brand_name, site_name, brand_url) VALUES (?, ?, ?)`,
        [productData.brand, productData.site_name || productData.site, ''],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  const canonicalName = generateCanonicalName(productData.name);
  const canonicalId = await insertCanonicalProduct(canonicalName, productData.brand);

  const productReference = generateProductReference(productData);

  // Vérifie si le produit existe déjà
  let productId = await new Promise((resolve, reject) => {
    db.get(
      `SELECT id FROM products WHERE product_reference = ?`,
      [productReference],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.id : null);
      }
    );
  });

  const today = new Date().toISOString().split('T')[0];

  if (productId) {
    // Update existant
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE products SET 
          canonical_id = ?, brand_id = ?, name = ?, regular_price = ?, promo_price = ?, promo_percent = ?, 
          price_per_kg = ?, weight_raw = ?, availability = ?, availability_status = ?, last_seen = ?
         WHERE id = ?`,
        [
          canonicalId,
          brandId,
          productData.name,
          productData.regular_price || 0,
          productData.promo_price,
          productData.promo_percent,
          productData.price_per_kg,
          productData.weight_raw,
          productData.availability,
          productData.availability === "Disponible" ? "available" : "unavailable",
          today,
          productId
        ],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  } else {
    // Insert nouveau
    productId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO products
          (canonical_id, brand_id, name, site_name, product_url, product_reference, 
           regular_price, promo_price, promo_percent, price_per_kg, weight_raw, availability, availability_status, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          canonicalId,
          brandId,
          productData.name,
          productData.site_name || productData.site,
          productData.product_url,
          productReference,
          productData.regular_price || 0,
          productData.promo_price,
          productData.promo_percent,
          productData.price_per_kg,
          productData.weight_raw,
          productData.availability,
          productData.availability === "Disponible" ? "available" : "unavailable",
          today
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Price history (INSERT OR REPLACE pour un seul jour)
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO price_history (product_id, price, promo_price, date) VALUES (?, ?, ?, ?)`,
      [
        productId,
        productData.regular_price || 0,
        productData.promo_price,
        today
      ],
      function(err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  return { success: true, productReference };
}

async function updateProduct(productData) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE products SET
        name = ?,
        regular_price = ?,
        price_per_kg = ?,
        weight_raw = ?,
        canonical_id = ?,
        last_seen = ?
      WHERE id = ?`,
      [
        productData.name,
        productData.regular_price,
        productData.price_per_kg,
        productData.weight_raw,
        productData.canonicalId,
        new Date().toISOString(),
        productData.id
      ],
      async function(err) {
        if (err) reject(err);
        else {
          // 2. Met à jour l'historique des prix
          await updatePriceHistory(productData.id, productData.history);
          resolve();
        }
      }
    );
  });
}

// 3. Fonction pour mettre à jour l'historique
async function updatePriceHistory(productId, history) {
  const db = await openDb();

  // Supprime l'historique existant
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM price_history WHERE product_id = ?', [productId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Ajoute les nouvelles entrées
  for (const entry of history) {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO price_history (product_id, price, date)
         VALUES (?, ?, ?)`,
        [productId, entry.price, entry.date],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}


/* ======================
   GETTERS & DELETE
====================== */
async function getProductByUrl(productUrl) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT p.*, b.brand_name AS brand
       FROM products p
       LEFT JOIN brands b ON p.brand_id = b.id
       WHERE p.product_url = ?`,
      [productUrl],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

async function getAllProducts() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT p.*, b.brand_name AS brand
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function deleteProducts(productUrls) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.exec('BEGIN TRANSACTION;', (err) => {
        if (err) return reject(err);

        productUrls.forEach(url => {
          db.run(`DELETE FROM price_history WHERE product_id IN (SELECT id FROM products WHERE product_url = ?)`, [url]);
          db.run(`DELETE FROM products WHERE product_url = ?`, [url]);
        });

        db.exec('COMMIT;', (err) => {
          if (err) reject(err);
          else resolve({ success: true });
        });
      });
    });
  });
}

async function getBrandUrl(brandName, siteName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT brand_url FROM brands WHERE brand_name = ? AND site_name = ?`,
      [brandName, siteName],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.brand_url : null);
      }
    );
  });
}

// Méthode pour exécuter des requêtes SQL directes
async function run(sql, params = []) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Méthode pour supprimer l'historique de prix d'un produit
async function deletePriceHistory(productId) {
  return run('DELETE FROM price_history WHERE product_id = ?', [productId]);
}

// Méthode pour ajouter une entrée d'historique de prix
async function addPriceHistoryEntry(productId, price, date) {
  return run(
    'INSERT INTO price_history (product_id, price, date) VALUES (?, ?, ?)',
    [productId, price, date]
  );
}

// Export des méthodes
module.exports = {
  openDb,
  init,
  insertProduct,
  updateProduct,
  getAllProducts,
  getProductByUrl,
  deleteProducts,
  generateCanonicalName,
  getBrandUrl,
  insertCanonicalProduct,
  updateProductCanonicalId,
  run,                     // Méthode unique
  deletePriceHistory,      // Méthode ajoutée
  addPriceHistoryEntry     // Méthode ajoutée
};
