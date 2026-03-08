// services/Sites/carrefour.js
const { BrowserWindow } = require('electron');

// Nettoie le texte pour console / logs
function cleanText(text) {
  if (!text) return text;
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // supprime accents
}

// Nettoie le poids (g, kg)
function cleanWeight(text) {
  if (!text) return null;
  const match = text.match(/(\d+\s?g|\d+\s?kg)/i);
  if (!match) return text;
  return match[1].replace(/\s/g, "");
}

// Calcul promotion "Le 2ème à -XX%" pour Carrefour
function computePromo(price, pricePerKg, weight, promoLabel) {
  if (!promoLabel || !price || !weight) return null;
  const percentMatch = promoLabel.match(/-(\d+)%/);
  if (!percentMatch) return null;

  const discount = parseInt(percentMatch[1]);

  // On ne traite que les promos 2ème à -XX%
  if (!promoLabel.toLowerCase().includes("2")) return null;

  const secondPrice = price * (1 - discount / 100);
  const avgPrice = (price + secondPrice) / 2;

  const weightMatch = weight.match(/(\d+)/);
  if (!weightMatch) return null;

  const grams = parseInt(weightMatch[1]);
  const kg = grams / 1000;

  const promoPriceKg = avgPrice / kg;
  const realPercent = Math.round((1 - (avgPrice / price)) * 100);

  return {
    promoPriceKg: parseFloat(promoPriceKg.toFixed(2)),
    realPercent
  };
}

// Fonction principale de scraping
async function scrapeCarrefour(url) {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    console.log("========== CARREFOUR SCRAPER START ==========");
    console.log("URL:", url);

    win.loadURL(url);

    win.webContents.once('did-finish-load', async () => {
      try {
        console.log("Page fully loaded, executing script...");

        const data = await win.webContents.executeJavaScript(`
          new Promise((res) => {
            setTimeout(() => {
              if (!window.__INITIAL_STATE__ || !window.__INITIAL_STATE__.vuex) {
                return res({ error: "Échec chargement Carrefour: __INITIAL_STATE__ absent" });
              }

              const products = window.__INITIAL_STATE__.vuex.analytics.indexedEntities.product;
              const productKey = Object.keys(products)[0];
              const prod = products[productKey];
              if (!prod) return res({ error: "Produit introuvable dans __INITIAL_STATE__" });

              const attr = prod.attributes;
              let promoLabel = null;

              if (attr.offers && attr.offers[productKey]) {
                const offerIds = Object.keys(attr.offers[productKey]);
                const offer = attr.offers[productKey][offerIds[0]];
                if (offer.attributes && offer.attributes.promotion) {
                  promoLabel = offer.attributes.promotion.label;
                }
              }

              let availability = false;
              if (attr.offers && attr.offers[productKey]) {
                const offerIds = Object.keys(attr.offers[productKey]);
                const offer = attr.offers[productKey][offerIds[0]];
                availability = offer.attributes?.availability?.purchasable || false;
              }

              let packaging = attr.packaging || (document.querySelector(".product-title__tags button")?.textContent.trim() || null);
              const price = attr.offers?.[productKey]?.[Object.keys(attr.offers[productKey])[0]]?.attributes?.price?.price || null;
              const pricePerKg = attr.offers?.[productKey]?.[Object.keys(attr.offers[productKey])[0]]?.attributes?.price?.perUnit || null;

              res({
                name: attr.title || null,
                brand: attr.brand || null,
                price,
                pricePerKg,
                weight: packaging,
                availability,
                promoLabel
              });

            }, 200);
          });
        `);

        win.close();

        if (data.error) return reject(new Error(data.error));

        // nettoyage texte et poids
        data.name = cleanText(data.name);
        data.promoLabel = cleanText(data.promoLabel);
        data.weight = cleanWeight(data.weight);

        // calcul promo réel
        const promo = computePromo(
          data.price,
          data.pricePerKg,
          data.weight,
          data.promoLabel
        );

        if (promo) {
          data.promotions = {
            label: data.promoLabel,
            realPercent: promo.realPercent,
            promoPricePerKg: promo.promoPriceKg
          };
        } else {
          data.promotions = null;
        }

        // Renommage pour renderer
        data.regular_price = data.price;
        data.price_per_kg = data.pricePerKg;
        data.weight_raw = data.weight;
        data.product_url = url;
        data.site_name = 'Carrefour';

        console.log("========== EXTRACTION RESULT ==========", data);

        resolve(data);

      } catch (err) {
        win.close();
        reject(err);
      }
    });

    win.webContents.once('did-fail-load', (e, code, desc) => {
      win.close();
      reject(new Error("Échec chargement Carrefour: " + desc));
    });

  });
}

module.exports = { scrapeCarrefour };