// services/Sites/intermarche.js

const { BrowserWindow } = require('electron');
const { standardizeProductData } = require('../utils');

function scrapeIntermarche(url) {
  return new Promise((resolve, reject) => {

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    win.loadURL(url);

    win.webContents.once('did-finish-load', async () => {

      try {

        const result = await win.webContents.executeJavaScript(`
          new Promise((resolve) => {

            function waitForSelector(selector, timeout = 15000) {
              return new Promise((res, rej) => {
                const interval = 200;
                let elapsed = 0;

                const timer = setInterval(() => {
                  const el = document.querySelector(selector);
                  if (el) {
                    clearInterval(timer);
                    res(el);
                  }
                  elapsed += interval;
                  if (elapsed >= timeout) {
                    clearInterval(timer);
                    rej();
                  }
                }, interval);
              });
            }

            waitForSelector('[data-testid="default"] p')
              .then(() => {

                const data = {
                  site: "Intermarche",
                  name: null,
                  brand: null,
                  regular_price: null,
                  promo_price: null,
                  promo_percent: null,
                  weight_raw: null,
                  price_per_kg: null,
                  availability: "Disponible"
                };

                // NOM + MARQUE
                const h1 = document.querySelector("h1");
                if (h1) {
                  const span = h1.querySelector("span");
                  if (span) {
                    data.brand = span.textContent.trim();
                    span.remove();
                  }
                  data.name = h1.textContent.trim();
                }

                // DISPONIBILITE
                const unavailable = document.querySelector(
                  '[class*="indisponible"], [class*="rupture"]'
                );
                if (unavailable) {
                  data.availability = "Indisponible";
                }

                // PRIX NORMAL
                const priceEl = document.querySelector('[data-testid="default"] p');
                if (priceEl) {
                  data.regular_price = parseFloat(
                    priceEl.textContent
                      .replace(/[^\d,]/g, "")
                      .replace(",", ".")
                  );
                }

                // PRIX PROMO
                const crossed = document.querySelector(".product--price__crossedOutPrice");
                if (crossed) {
                  data.regular_price = parseFloat(
                    crossed.textContent
                      .replace(/[^\d,]/g, "")
                      .replace(",", ".")
                  );

                  const instead = document.querySelector(".product--price__insteadOf");
                  if (instead) {
                    const match = instead.textContent.match(/([\\d,]+)/);
                    if (match) {
                      data.promo_price = parseFloat(match[1].replace(",", "."));
                    }
                  }
                }

                // POURCENTAGE
                const badge = document.querySelector("div.badge");
                if (badge) {
                  const match = badge.textContent.match(/(\\d+)%/);
                  if (match) {
                    data.promo_percent = parseInt(match[1]);
                  }
                }

                // POIDS + PRIX KG
                const priceInfo = Array.from(document.querySelectorAll("p"))
                  .find(el => el.textContent.includes("€/Kg"));

                if (priceInfo) {
                  const text = priceInfo.textContent;

                  const weightMatch = text.match(/(\\d+[.,]?\\d*)\\s?(g|kg|ml|cl|l)/i);
                  if (weightMatch) {
                    data.weight_raw = weightMatch[0];
                  }

                  const priceMatch = text.match(/([\\d,]+)\\s?€\\/Kg/i);
                  if (priceMatch) {
                    data.price_per_kg = parseFloat(priceMatch[1].replace(",", "."));
                  }
                }

                resolve(data);

              })
              .catch(() => {
                resolve({ error: "Price selector not found" });
              });

          });
        `);

        win.close();

        if (result.error) {
          return resolve({
            success: false,
            error: result.error
          });
        }

        resolve({
          success: true,
          data: standardizeProductData({
            ...result,
            site_name: "Intermarche",
            product_url: url
          })
        });

      } catch (err) {
        win.close();
        reject(err);
      }

    });

  });
}

module.exports = { scrapeIntermarche };