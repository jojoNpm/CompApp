// services/scrapingService.js

const { scrapeVegetalFood } = require('./Sites/vegetalfood');
const { scrapeOVS } = require('./Sites/ovs'); 
const { scrapeCarrefour } = require('./Sites/carrefour');
const { scrapeChronodrive } = require('./Sites/chronodrive');
const { standardizeProductData } = require('./utils');
const { BrowserWindow } = require('electron');
const fetch = require('node-fetch'); // pour récupérer les images en BLOB

const SCRAPERS = [
  { match: 'vegetalfood', scraper: scrapeVegetalFood },
  { match: 'officialveganshop', scraper: scrapeOVS },
  { match: 'carrefour', scraper: scrapeCarrefour },
  { match: 'chronodrive', scraper: scrapeChronodrive }
];

/* =========================
   UTILS FETCH IMAGE
========================= */
async function fetchImageAsBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn("Erreur récupération image:", url, err.message);
    return null;
  }
}

/* =========================
   SCRAPER PRINCIPAL
========================= */
async function scrapeProduct(url) {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    console.log("DOMAIN DETECTED:", domain);

    // =========================
    // INTERMARCHÉ HYBRIDE
    // =========================
    if (domain.includes("intermarche.com")) {
      return await scrapeIntermarcheWithBrowser(url);
    }

    // =========================
    // AUTRES SITES
    // =========================
    const scraperEntry = SCRAPERS.find(site =>
      domain.includes(site.match)
    );

    if (!scraperEntry || !scraperEntry.scraper) {
      throw new Error("Site non supporté");
    }

    const rawData = await scraperEntry.scraper(url);

    // Ajout image
    let imageBuffer = null;
    if (rawData.image_url) {
      imageBuffer = await fetchImageAsBuffer(rawData.image_url);
    }

    return {
      success: true,
      data: standardizeProductData({
        ...rawData,
        site_name: getSiteNameForDomain(domain),
        product_url: url,
        image: imageBuffer
      })
    };

  } catch (error) {
    console.error("Scraping error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

function getSiteNameForDomain(domain) {
  if (domain.includes('vegetalfood')) return 'Vegetal Food';
  if (domain.includes('officialveganshop')) return 'OVS';
  if (domain.includes('carrefour')) return 'Carrefour';
  if (domain.includes('chronodrive')) return 'Chronodrive';
  if (domain.includes('intermarche')) return 'Intermarché';
  return "Site inconnu";
}

/* =========================
   INTERMARCHÉ HYBRIDE
========================= */
async function scrapeIntermarcheWithBrowser(url) {
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
            function waitForElement(selector, timeout = 10000) {
              return new Promise((res, rej) => {
                const interval = 100;
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

            waitForElement("h1").then(() => {
              const data = {
                site: "Intermarché",
                name: null,
                brand: null,
                price: null,
                promoPrice: null,
                promoPercent: null,
                weight: null,
                pricePerKg: null,
                image_url: null
              };

              // Nom et marque
              const h1 = document.querySelector("h1");
              if (h1) {
                const span = h1.querySelector("span");
                if (span) {
                  data.brand = span.textContent.trim();
                  span.remove();
                }
                data.name = h1.textContent.trim();
              }

              // Prix et kg
              const priceInfo = Array.from(document.querySelectorAll("p"))
                .find(el => el.textContent.includes("€/Kg"));
              if (priceInfo) {
                const text = priceInfo.textContent;
                const weightMatch = text.match(/(\\d+)\\s?g/);
                if (weightMatch) data.weight = weightMatch[1] + "g";
                const priceMatch = text.match(/([\\d,]+)\\s?€\\/Kg/);
                if (priceMatch) data.pricePerKg = parseFloat(priceMatch[1].replace(",", "."));
              }

              // Prix normal et promo
              const normalPrice = document.querySelector('[data-testid="default"] p');
              if (normalPrice) data.price = parseFloat(normalPrice.textContent.replace(",", "."));
              const crossed = document.querySelector(".product--price__crossedOutPrice");
              if (crossed) {
                data.price = parseFloat(crossed.textContent.replace(",", "."));
                const instead = document.querySelector(".product--price__insteadOf");
                if (instead) {
                  const match = instead.textContent.match(/([\\d,]+)/);
                  if (match) data.promoPrice = parseFloat(match[1].replace(",", "."));
                }
              }

              // Badge %
              const badge = document.querySelector("div.badge");
              if (badge) {
                const match = badge.textContent.match(/(\\d+)%/);
                if (match) data.promoPercent = parseInt(match[1]);
              }

              // Image principale
              const imgEl = document.querySelector("img");
              if (imgEl) data.image_url = imgEl.src;

              resolve(data);
            }).catch(() => resolve({ error: "Produit non détecté" }));
          });
        `);

        win.close();

        // Convertir image URL en buffer
        let imageBuffer = null;
        if (result.image_url) {
          imageBuffer = await fetchImageAsBuffer(result.image_url);
        }

        resolve({
          success: true,
          data: standardizeProductData({
            ...result,
            site_name: "Intermarché",
            product_url: url,
            image: imageBuffer
          })
        });

      } catch (err) {
        win.close();
        reject(err);
      }
    });

    win.webContents.once('did-fail-load', (e, code, desc) => {
      win.close();
      reject(new Error(`Échec chargement Intermarché: ${desc}`));
    });
  });
}

module.exports = { scrapeProduct };