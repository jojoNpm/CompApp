const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

const database = require('./db/database');
const { scrapeProduct } = require('./services/scrapingService');
const { upsertProduct } = require('./services/productService');
const { getCanonicalSuggestions } = require('./services/canonicalService');

let mainWindow;

/* ===============================
IPC HANDLERS
=============================== */

function registerIpcHandlers() {

  console.log("[MAIN] Enregistrement des handlers IPC...");


  /* SCRAPE PRODUIT */

  ipcMain.handle('scrape-product', async (event, url) => {

    try {

      console.log("[MAIN] scrape-product:", url);

      return await scrapeProduct(url);

    } catch (err) {

      console.error(err);

      return { success:false, error:err.message };

    }

  });


  /* RECUP PRODUITS */

  ipcMain.handle('get-products', async () => {

    try {

      return await database.getAllProducts();

    } catch (err) {

      console.error(err);

      return [];

    }

  });


  /* UPDATE PRODUIT */

  ipcMain.handle('upsert-product', async (event, productData) => {

    try {

      console.log("[MAIN] upsert-product:", productData);

      return await upsertProduct(productData);

    }

    catch (error) {

      console.error(error);

      return { success:false, error:error.message };

    }

  });


  /* DELETE PRODUITS */

  ipcMain.handle('delete-products', async (event, urls) => {

    try {

      return await database.deleteProducts(urls);

    }

    catch (err) {

      console.error(err);

      return { success:false, error:err.message };

    }

  });


  /* OUVRIR URL PRODUIT */

  ipcMain.handle('open-in-window', async (event, url) => {

    try {

      await shell.openExternal(url);

      return { success:true };

    }

    catch (err) {

      console.error(err);

      return { success:false, error:err.message };

    }

  });


  /* URL MARQUE */

  ipcMain.handle('get-brand-url', async (event, brand) => {

    try {

      const url = await database.getBrandUrl(brand);

      return { success:true, url };

    }

    catch (err) {

      console.error(err);

      return { success:false, error:err.message };

    }

  });


  /* SUGGESTIONS CANONIQUES */

  ipcMain.handle('get-canonical-suggestions', async (event, text) => {

    try {

      const suggestions = await getCanonicalSuggestions(text);

      return { success:true, suggestions };

    }

    catch (err) {

      console.error(err);

      return { success:false, error:err.message };

    }

  });


  console.log("[MAIN] Handlers IPC enregistrés");

}



/* ===============================
SERVEUR EXPRESS
=============================== */

function createServer() {

  const server = express();

  server.use(bodyParser.json());

  server.use(express.static(path.join(__dirname,'renderer')));

  server.get("/", (req,res)=>{

    res.sendFile(path.join(__dirname,"renderer","index.html"));

  });

  return server.listen(3210,()=>{

    console.log("[MAIN] http://localhost:3210");

  });

}



/* ===============================
FENETRE ELECTRON
=============================== */

function createElectronWindow(){

  mainWindow = new BrowserWindow({

    width:1200,
    height:800,

    webPreferences:{

      preload:path.join(__dirname,'preload.js'),
      contextIsolation:true,
      nodeIntegration:false

    }

  });

  mainWindow.loadURL('http://localhost:3210');

}



/* ===============================
INITIALISATION
=============================== */

async function initializeApp(){

  try{

    console.log("[MAIN] Init DB");

    await database.init();

    registerIpcHandlers();

    createServer();

    createElectronWindow();

  }

  catch(err){

    console.error(err);

    app.quit();

  }

}



app.whenReady().then(initializeApp);


app.on('window-all-closed',()=>{

  if(process.platform !== 'darwin') app.quit();

});