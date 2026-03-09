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
server.get("/", (req, res) => res.sendFile(path.join(__dirname, "renderer", "index.html")));
server.listen(3210, () => console.log("Serveur local démarré sur http://localhost:3210"));

// =========================
// FENÊTRE ELECTRON
// =========================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL('http://localhost:3210');
}

app.whenReady().then(async () => {
  await database.init();
  createWindow();
});

// =========================
// IPC HANDLERS
// =========================
ipcMain.handle('scrape-product', async (event, url) => {
  try { return await scrapeProduct(url); } 
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('get-products', async () => await database.getAllProducts());
ipcMain.handle('upsert-product', async (event, productData) => await upsertProduct(productData));
ipcMain.handle('delete-products', async (event, productUrls) => await database.deleteProducts(productUrls));
ipcMain.handle('get-brands', async () => {
  const db = await database.openDb();
  return new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT brand_name FROM brands ORDER BY brand_name ASC', [], (err, rows) => {
      if (err) reject(err); else resolve(rows.map(r => r.brand_name));
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
      (err, rows) => err ? reject(err) : resolve(rows.map(r => r.canonical_name))
    );
  });
});

ipcMain.handle('get-brand-url', async (event, brand, site) => {
  const db = await database.openDb();
  const normalizedBrand = normalizeText(brand);
  const normalizedSite = normalizeText(site);
  return new Promise((resolve, reject) => {
    db.all('SELECT brand_url, brand_name, site_name FROM brands', [], (err, rows) => {
      if (err) reject(err);
      const match = rows.find(r => normalizeText(r.brand_name) === normalizedBrand && normalizeText(r.site_name) === normalizedSite);
      resolve(match ? match.brand_url : null);
    });
  });
});

ipcMain.handle('get-product-history', async (event, productId) => {
  const db = await database.openDb();
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT date, price FROM price_history WHERE product_id = ? ORDER BY date ASC`,
      [productId],
      (err, rows) => err ? reject(err) : resolve(rows)
    );
  });
});

ipcMain.handle('open-in-window', async (event, url) => {
  try {
    const childWindow = new BrowserWindow({ width:1000, height:800, webPreferences:{ contextIsolation:true, nodeIntegration:false }});
    await childWindow.loadURL(url);
    return { success:true };
  } catch (err) { return { success:false, error:err.message }; }
});

// =========================
// NOUVEAU HANDLER : addOrUpdateHistory
// =========================
ipcMain.handle('add-or-update-history', async (event, productId, date, price) => {
  const db = await database.openDb();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO price_history(product_id, date, price)
       VALUES (?, ?, ?)
       ON CONFLICT(product_id, date) DO UPDATE SET price=excluded.price`,
      [productId, date, price],
      function(err) { if(err) reject(err); else resolve({ success:true }); }
    );
  });
});

// =========================
// NOUVEAU HANDLER : scrapeAndComparePrice
// =========================
ipcMain.handle('scrape-and-compare-price', async (event, productUrl) => {
  try {
    const scraped = await scrapeProduct(productUrl);
    if(!scraped.success) return { success:false, message: scraped.error };

    const productId = scraped.data.id;
    const lastEntry = await database.getLastPrice(productId);

    const today = new Date().toISOString().split('T')[0];
    const newPrice = scraped.data.regular_price;

    if(!lastEntry || lastEntry.price !== newPrice) {
      await database.addOrUpdateHistory(productId, today, newPrice);
      return { success:true, message:"Nouveau prix", newPrice };
    } else {
      await database.addOrUpdateHistory(productId, today, newPrice);
      return { success:true, message:"Pas de changement de prix", newPrice };
    }
  } catch(err) {
    return { success:false, message:err.message };
  }
});

// =========================
// UTILITAIRE
// =========================
function normalizeText(str) {
  if (!str) return "";
  return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s\-_]/g,"").replace(/[^\w]/g,"");
}