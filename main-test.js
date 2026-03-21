const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Charger un fichier HTML simple pour afficher les résultats
  mainWindow.loadFile(path.join(__dirname, 'popup-test.html'));
});

// Exporter les fonctions de test pour les utiliser dans le renderer
global.testCarrefour = require('./test-carrefour').testCarrefour;
global.testOVS = require('./test-ovs').testOVS;
global.testChronodrive = require('./test-chronodrive').testChronodrive;
global.testVegetalFood = require('./test-vegetalfood').testVegetalFood;
global.testIntermarche = require('./test-intermarche').testIntermarche;
