const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

// ===============================
// IMPORTS DES SERVICES (avant tout le reste)
// ===============================
const database = require('./db/database');
const { scrapeProduct } = require('./services/scrapingService');
const { upsertProduct } = require('./services/productService');
const { getCanonicalSuggestions } = require('./services/canonicalService');

// ===============================
// VARIABLES GLOBALES
// ===============================
let mainWindow;

// ===============================
// FONCTIONS UTILITAIRES
// ===============================
function normalizeText(str) {
  if (!str) return "";
  return str.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s\-_]/g, "")
    .replace(/[^\w]/g, "");
}

// ===============================
// ENREGISTREMENT DES HANDLERS IPC
// ===============================
function registerIpcHandlers() {
  console.log("Enregistrement des handlers IPC...");

  // Produits
  ipcMain.handle('scrape-product', async (event, url) => {
    try {
      console.log("Handler 'scrape-product' appelé avec URL:", url);
      return await scrapeProduct(url);
    } catch (err) {
      console.error("Erreur dans 'scrape-product':", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-products', async () => {
    try {
      return await database.getAllProducts();
    } catch (err) {
      console.error("Erreur dans 'get-products':", err);
      return [];
    }
  });

  ipcMain.handle('upsert-product', async (event, productData) => {
    console.log("Handler 'upsert-product' appelé avec:", productData);
    try {
      return await upsertProduct(productData);
    } catch (err) {
      console.error("Erreur dans 'upsert-product':", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-products', async (event, urls) => {
    try {
      return await database.deleteProducts(urls);
    } catch (err) {
      console.error("Erreur dans 'delete-products':", err);
      return { success: false, error: err.message };
    }
  });

  // Marques et suggestions
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
    try {
      return await getCanonicalSuggestions(name);
    } catch (err) {
      console.error("Erreur dans 'get-canonical-suggestions':", err);
      return [];
    }
  });

  ipcMain.handle('get-brand-url', async (event, brand, site) => {
    const db = await database.openDb();
    const normalizedBrand = normalizeText(brand);
    const normalizedSite = normalizeText(site);
    return new Promise((resolve, reject) => {
      db.all('SELECT brand_url FROM brands', [], (err, rows) => {
        if (err) reject(err);
        else {
          const match = rows.find(row =>
            normalizeText(row.brand_name) === normalizedBrand &&
            normalizeText(row.site_name) === normalizedSite
          );
          resolve(match ? match.brand_url : null);
        }
      });
    });
  });

  // Historique et graphiques
  ipcMain.handle('get-product-history', async (event, productId) => {
    const db = await database.openDb();
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT date, price FROM price_history WHERE product_id = ? ORDER BY date ASC`,
        [productId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  });

  ipcMain.handle('open-in-window', async (event, url) => {
    try {
      const childWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false
        }
      });
      await childWindow.loadURL(url);
      return { success: true };
    } catch (err) {
      console.error("Erreur dans 'open-in-window':", err);
      return { success: false, error: err.message };
    }
  });

  console.log("Tous les handlers IPC enregistrés avec succès !");
}

// ===============================
// SERVEUR EXPRESS
// ===============================
const server = express();
server.use(bodyParser.json());
server.use(express.static(path.join(__dirname, 'renderer')));
server.get("/", (req, res) => res.sendFile(path.join(__dirname, "renderer", "index.html")));
server.listen(3210, () => console.log("Serveur local démarré sur http://localhost:3210"));

// ===============================
// CRÉATION DE LA FENÊTRE ELECTRON
// ===============================
function createWindow() {
  // Enregistre les handlers IPC avant de créer la fenêtre
  registerIpcHandlers();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.loadURL('http://localhost:3210');
  console.log("Fenêtre Electron créée avec succès !");
}

// ===============================
// INITIALISATION DE L'APPLICATION
// ===============================
app.whenReady().then(async () => {
  try {
    await database.init();
    console.log("Base de données initialisée avec succès !");
    createWindow();
  } catch (err) {
    console.error("Erreur d'initialisation de la base de données:", err);
    app.quit();
  }
});

// Gestion de la fermeture de l'application
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
