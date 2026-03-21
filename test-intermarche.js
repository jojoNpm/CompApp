const { BrowserWindow } = require('electron');

async function testIntermarche() {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('https://www.intermarche.com/produit/chipolatas-vegetales-et-gourmandes/3770016162098');

  return new Promise((resolve) => {
    win.webContents.once('did-finish-load', async () => {
      try {
        const imageUrl = await win.webContents.executeJavaScript(`
          (() => {
            const imgEl = document.querySelector("img") ||
                          document.querySelector(".absolute") ||
                          document.querySelector(".mx-auto");
            return imgEl ? imgEl.src : null;
          })()
        `);

        console.log("URL de l'image Intermarché :", imageUrl);
        win.close();
        resolve(imageUrl);
      } catch (err) {
        console.error("Erreur lors du test Intermarché :", err);
        win.close();
        resolve(null);
      }
    });
  });
}

module.exports = { testIntermarche };
