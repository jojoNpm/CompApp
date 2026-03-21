const { BrowserWindow } = require('electron');

async function testChronodrive() {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('https://www.chronodrive.com/happyvore--chipolatas-vegetales-aux-herbes-de-provence-P468298');

  return new Promise((resolve) => {
    win.webContents.once('did-finish-load', async () => {
      try {
        const imageUrl = await win.webContents.executeJavaScript(`
          (() => {
            const imgEl = document.querySelector("img") ||
                          document.querySelector(".overlay-zoom-picture") ||
                          document.querySelector("button img");
            return imgEl ? imgEl.src : null;
          })()
        `);

        console.log("URL de l'image Chronodrive :", imageUrl);
        win.close();
        resolve(imageUrl);
      } catch (err) {
        console.error("Erreur lors du test Chronodrive :", err);
        win.close();
        resolve(null);
      }
    });
  });
}

module.exports = { testChronodrive };
