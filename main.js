const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

/* ===============================
   IMPORTS SERVICES
=============================== */
const database = require('./db/database');
const { scrapeProduct } = require('./services/scrapingService');
const { upsertProduct, getAllProducts } = require('./services/productService');
const { getCanonicalSuggestions } = require('./services/canonicalService');

/* ===============================
   VARIABLES
=============================== */
let mainWindow;

/* ===============================
   IPC HANDLERS
=============================== */
function registerIpcHandlers() {
  console.log("[MAIN] Enregistrement IPC");

  // -----------------------------
  // Scraping produit
  // -----------------------------
  ipcMain.handle('scrape-product', async (event, url) => {
  try {
    console.log("[MAIN] scrape-product:", url);

    // 1️⃣ Scraping
    const result = await scrapeProduct(url);

    if (!result.success) {
      console.error("[MAIN] Scraping failed:", result.error);
      return result;
    }

    console.log("[MAIN] Produit scrapé:", result.data.name);

    // 🔹 NE PAS SAUVEGARDER ICI !
    // const saveResult = await upsertProduct(result.data);

    // 2️⃣ On renvoie les données pour le popup
    return {
      success: true,
      data: result.data
    };

  } catch (err) {
    console.error("[MAIN] erreur scrape-product:", err);
    return { success: false, error: err.message };
  }
});

  // -----------------------------
  // Récupérer tous les produits
  // -----------------------------
  ipcMain.handle('get-products', async () => {
    try {
      const products = await getAllProducts();
      console.log("[MAIN] Produits récupérés:", products.length);
      return products;
    } catch (err) {
      console.error("[MAIN] Erreur get-products:", err);
      return [];
    }
  });

  // -----------------------------
  // Upsert produit
  // -----------------------------
  ipcMain.handle('upsert-product', async (event, productData) => {
    try {
      console.log("[MAIN] upsert-product:", productData);
      return await upsertProduct(productData);
    } catch (err) {
      console.error("[MAIN] erreur upsert-product:", err);
      return { success: false, error: err.message };
    }
  });

  // -----------------------------
  // Supprimer produits
  // -----------------------------
  ipcMain.handle('delete-products', async (event, urls) => {
    try {
      console.log("[MAIN] delete-products:", urls);
      return await database.deleteProducts(urls);
    } catch (err) {
      console.error("[MAIN] erreur delete-products:", err);
      return { success: false, error: err.message };
    }
  });

// -----------------------------
// Vérification doublons produit
// -----------------------------
ipcMain.handle('check-duplicate-product', async (event, { name, brand, site }) => {

  try {

    const safeName = name || "";
    const safeBrand = brand || "";
    const safeSite = site || "";

    console.log("[MAIN] check-duplicate-product:", {
      name: safeName,
      brand: safeBrand,
      site: safeSite
    });

    const db = await database.openDb();

    return new Promise((resolve) => {

      db.get(
`SELECT p.id, p.name, p.site_name, p.regular_price,
       b.brand_name AS brand,
       c.canonical_name
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN canonical_products c ON p.canonical_id = c.id
WHERE LOWER(p.name) = LOWER(?)
AND LOWER(COALESCE(b.brand_name,'')) = LOWER(?)
AND LOWER(COALESCE(p.site_name,'')) = LOWER(?)`,
[safeName, safeBrand, safeSite],

        (err, row) => {

          if (err) {

            console.error("[MAIN] erreur duplicate:", err);

            resolve({
              duplicate: false,
              product: null
            });

          } else {

            resolve({
              duplicate: !!row,
              product: row || null
            });

          }

        }
      );

    });

  } catch (err) {

    console.error("[MAIN] erreur check-duplicate-product:", err);

    return {
      duplicate: false,
      product: null
    };

  }

});

// -----------------------------
// Récupérer un produit par ID (NOUVEAU)
// -----------------------------
ipcMain.handle('get-product-by-id', async (event, id) => {
  try {
    console.log("[MAIN] get-product-by-id:", id);
    const product = await database.getProductById(id);
    console.log("[MAIN] Product fetched:", product);
    return product;
  } catch (err) {
    console.error("Erreur lors de la récupération du produit par ID :", err);
    throw err;
  }
});


  // -----------------------------
  // Récupérer image d’un canonical existant
  // -----------------------------
  ipcMain.handle('get-canonical-image', async (event, canonical_name) => {
    try {
      console.log("[MAIN] get-canonical-image:", canonical_name);
      if (!canonical_name) return null;

      const db = await database.openDb();
      return new Promise((resolve) => {
        db.get(
          `SELECT p.image
          FROM products p
          LEFT JOIN canonical_products c ON p.canonical_id = c.id
          WHERE c.canonical_name = ?
          AND p.image IS NOT NULL
          LIMIT 1`,
          [canonical_name],
          (err, row) => {
            if (err) {
              console.error("[MAIN] erreur canonical image:", err);
              resolve(null);
            } else {
              resolve(row ? row.image : null);
            }
          }
        );
      });
    } catch (err) {
      console.error("[MAIN] erreur get-canonical-image:", err);
      return null;
    }
  });

  // -----------------------------
  // Suggestions canonical
  // -----------------------------
  ipcMain.handle('get-canonical-suggestions', async (event, text) => {
    try {
      const suggestions = (await getCanonicalSuggestions(text)) || [];
      return { success: true, suggestions: suggestions.slice(0,5) };
    } catch (err) {
      console.error("[MAIN] erreur canonical suggestions:", err);
      return { success: false, suggestions: [] };
    }
  });

  // -----------------------------
  // Brand / URL
  // -----------------------------
  ipcMain.handle('get-brands', async () => {
    try {
      const db = await database.openDb();
      return new Promise((resolve, reject) => {
        db.all(`SELECT DISTINCT brand_name FROM brands ORDER BY brand_name`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => r.brand_name));
        });
      });
    } catch (err) {
      console.error("[MAIN] erreur get-brands:", err);
      return [];
    }
  });

  ipcMain.handle('get-brand-url', async (event, brand, site) => {
    try {
      const db = await database.openDb();
      return new Promise((resolve) => {
        db.get(
          `SELECT brand_url 
          FROM brands 
          WHERE LOWER(brand_name)=LOWER(?) 
          AND LOWER(site_name)=LOWER(?)`,
          [brand, site],
          (err, row) => {
            resolve(row ? row.brand_url : null);
          }
        );
      });
    } catch (err) {
      console.error("[MAIN] erreur get-brand-url:", err);
      return null;
    }
  });

  ipcMain.handle('verify-brand-exists', async (event, brand, site) => {
    try {
      const db = await database.openDb();
      return new Promise((resolve) => {
        db.get(
          `SELECT 1 
          FROM brands 
          WHERE LOWER(brand_name)=LOWER(?) 
          AND LOWER(site_name)=LOWER(?)`,
          [brand, site],
          (err, row) => resolve(!!row)
        );
      });
    } catch (err) {
      console.error("[MAIN] erreur verify-brand-exists:", err);
      return false;
    }
  });

  ipcMain.handle('get-all-brands-with-sites', async () => {
    try {
      const db = await database.openDb();
      return new Promise((resolve) => {
        db.all(
          `SELECT brand_name, site_name, brand_url FROM brands ORDER BY brand_name, site_name`,
          (err, rows) => resolve(rows || [])
        );
      });
    } catch (err) {
      console.error("[MAIN] erreur get-all-brands-with-sites:", err);
      return [];
    }
  });

  ipcMain.handle('upsert-brand', async (event, brandData) => {
    try {
      const db = await database.openDb();
      return new Promise((resolve) => {
        db.run(
          `INSERT OR REPLACE INTO brands (brand_name, site_name, brand_url) VALUES (?, ?, ?)`,
          [brandData.brand_name, brandData.site_name, brandData.brand_url],
          function (err) {
            if (err) resolve({ success: false, error: err.message });
            else resolve({ success: true, id: this.lastID });
          }
        );
      });
    } catch (err) {
      console.error("[MAIN] erreur upsert-brand:", err);
      return { success: false, error: err.message };
    }
  });

  // -----------------------------
  // Historique produit
  // -----------------------------
  ipcMain.handle('get-product-history', async (event, productId) => {
    try {
      return await database.getProductHistory(productId);
    } catch (err) {
      console.error("[MAIN] erreur get-product-history:", err);
      return [];
    }
  });

  // -----------------------------
  // Open URL externe
  // -----------------------------
  ipcMain.handle('open-in-window', async (event, url) => {
  try {

    const win = new BrowserWindow({
      width: 1300,
      height: 1000,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    await win.loadURL(url);

    return { success: true };

  } catch (err) {
    console.error("[MAIN] erreur open-in-window:", err);
    return { success: false, error: err.message };
  }
});

  console.log("[MAIN] IPC prêts ✅");
}

/* ===============================
   SERVEUR EXPRESS
=============================== */
function createServer() {

  const server = express();

  server.use(bodyParser.json());

  // Frontend principal
  server.use(express.static(path.join(__dirname, 'renderer')));

  // Utils du frontend
  server.use('/utils', express.static(path.join(__dirname, 'renderer', 'utils')));

  // Services accessibles au renderer (ex: utils.js)
  server.use('/services', express.static(path.join(__dirname, 'services')));

  server.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'renderer', 'index.html'));
  });

  server.listen(3210, () => {
    console.log("[MAIN] serveur http://localhost:3210");
  });

}

/* ===============================
   FENÊTRE ELECTRON
=============================== */
function createElectronWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadURL('http://localhost:3210');
  console.log("[MAIN] fenêtre créée");
}

/* ===============================
   INITIALISATION
=============================== */
async function initializeApp() {
  try {
    console.log("[MAIN] Initialisation...");
    await database.init();
    registerIpcHandlers();
    createServer();
    createElectronWindow();
  } catch (err) {
    console.error("[MAIN] Erreur init:", err);
  }
}

/* ===============================
   LANCEMENT
=============================== */
app.whenReady().then(initializeApp);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
process.on('uncaughtException', err => console.error("[MAIN] uncaught:", err));
process.on('unhandledRejection', reason => console.error("[MAIN] rejection:", reason));