const { BrowserWindow } = require('electron');

async function testOVS() {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('https://www.officialveganshop.com/chipos-vegetales-herbes-provence-les-nouveaux-fermiers-x4-10816.html');

  return new Promise((resolve) => {
    win.webContents.once('did-finish-load', async () => {
      try {
        const imageUrl = await win.webContents.executeJavaScript(`
          (() => {
            const imgEl = document.querySelector(".js-modal-product-cover") ||
                          document.querySelector(".slide img");
            return imgEl ? imgEl.src : null;
          })()
        `);

        console.log("URL de l'image OVS :", imageUrl);
        win.close();
        resolve(imageUrl);
      } catch (err) {
        console.error("Erreur lors du test OVS :", err);
        win.close();
        resolve(null);
      }
    });
  });
}

module.exports = { testOVS };
