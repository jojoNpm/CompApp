const { BrowserWindow } = require('electron');

async function testVegetalFood() {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('https://www.vegetalfood.fr/saucisses/3752-chipolatas-vegetales-200-gr-happyvore-3770016162098.html');

  return new Promise((resolve) => {
    win.webContents.once('did-finish-load', async () => {
      try {
        const imageUrl = await win.webContents.executeJavaScript(`
          (() => {
            const imgEl = document.querySelector(".js-qv-product-cover") ||
                          document.querySelector("img.zoomImg") ||
                          document.querySelector("img[zoom]") ||
                          document.querySelector('img[src*="vegetalfood.fr"]');
            return imgEl ? imgEl.src : null;
          })()
        `);

        console.log("URL de l'image Vegetal Food :", imageUrl);
        win.close();
        resolve(imageUrl);
      } catch (err) {
        console.error("Erreur lors du test Vegetal Food :", err);
        win.close();
        resolve(null);
      }
    });
  });
}

module.exports = { testVegetalFood };
