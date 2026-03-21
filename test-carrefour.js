const { BrowserWindow } = require('electron');

async function testCarrefour() {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('https://www.carrefour.fr/p/steak-vegetal-et-gourmand-hapyvore-2-x-110-g-3770016162098');

  return new Promise((resolve) => {
    win.webContents.once('did-finish-load', async () => {
      try {
        const imageUrl = await win.webContents.executeJavaScript(`
          (() => {
            const imgEl = document.querySelector(".pdp-hero__image img") ||
                          document.querySelector(".zoomable-image img") ||
                          document.querySelector("img[src*='media.carrefour']");
            return imgEl ? imgEl.src : null;
          })()
        `);

        console.log("URL de l'image Carrefour :", imageUrl);
        win.close();
        resolve(imageUrl);
      } catch (err) {
        console.error("Erreur lors du test Carrefour :", err);
        win.close();
        resolve(null);
      }
    });
  });
}

module.exports = { testCarrefour };
