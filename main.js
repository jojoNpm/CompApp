const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const database = require('./db/database');
const { scrapeProduct } = require('./services/scrapingService');
const { upsertProduct } = require('./services/productService');

let mainWindow;

// =========================
// SERVEUR EXPRESS
// =========================
const server = express();
server.use(bodyParser.json());
server.use(express.static(path.join(__dirname, 'renderer')));

server.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "renderer", "index.html"));
});

server.listen(3210, () => {
  console.log("Serveur local démarré sur http://localhost:3210");
});

// =========================
// FENÊTRE ELECTRON (UNE SEULE DÉCLARATION)
// =========================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),  // Utilise le fichier principal
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Active les logs pour le preload
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Échec du chargement du preload: ${errorDescription}`);
  });

  mainWindow.loadURL('http://localhost:3210');
}

app.whenReady().then(async () => {
  try {
    await database.init();
    console.log("Database ready");
    createWindow();
  } catch (err) {
    console.error("Erreur init database :", err);
  }
});

// =========================
// FONCTION DE NORMALISATION (inchangée)
// =========================
function normalizeText(str) {
  if (!str) return "";
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s\-_]/g, "")
    .replace(/[^\w]/g, "");
}

// =========================
// IPC HANDLERS
// =========================
ipcMain.handle('scrape-product', async (event, url) => {
  try {
    return await scrapeProduct(url);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-products', async () => {
  try {
    return await database.getAllProducts();
  } catch (err) {
    console.error("Erreur get-products :", err);
    return [];
  }
});

ipcMain.handle('upsert-product', async (event, productData) => {
  try {
    // Met à jour le produit et son historique
    const result = await upsertProduct(productData);
    return result;
  } catch (err) {
    console.error("Erreur upsert-product :", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-products', async (event, productUrls) => {
  try {
    return await database.deleteProducts(productUrls);
  } catch (err) {
    console.error("Erreur delete-products :", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-brands', async () => {
  const db = await database.openDb();
  return new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT brand_name FROM brands ORDER BY brand_name ASC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.brand_name));
    });
  });
});

ipcMain.handle('get-canonical-suggestions', async (event, name) => {
  const db = await database.openDb();
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT canonical_name
       FROM canonical_products
       WHERE canonical_name LIKE ?
       ORDER BY canonical_name
       LIMIT 10`,
      [`%${name}%`],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.canonical_name));
      }
    );
  });
});

ipcMain.handle('get-brand-url', async (event, brand, site) => {
  const db = await database.openDb();
  const normalizedBrand = normalizeText(brand);
  const normalizedSite = normalizeText(site);

  return new Promise((resolve, reject) => {
    db.all('SELECT brand_url FROM brands', [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const match = rows.find(row =>
        normalizeText(row.brand_name) === normalizedBrand &&
        normalizeText(row.site_name) === normalizedSite
      );

      resolve(match ? match.brand_url : null);
    });
  });
});

// NOUVEAU: Handler pour récupérer l'historique complet d'un produit
ipcMain.handle('get-product-history', async (event, productId) => {
  const db = await database.openDb();
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT date, price FROM price_history
       WHERE product_id = ?
       ORDER BY date ASC`,
      [productId],
      (err, rows) => {
        if (err) {
          console.error("Erreur get-product-history:", err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
});

ipcMain.handle('open-in-window', async (event, url) => {
  try {
    const childWindow = new BrowserWindow({
      width: 1000,
      height: 800,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    await childWindow.loadURL(url);
    return { success: true };
  } catch (err) {
    console.error("Erreur open-in-window :", err);
    return { success: false, error: err.message };
  }
});
