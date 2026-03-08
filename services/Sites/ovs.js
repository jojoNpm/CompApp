// services/Sites/ovs.js
const puppeteer = require('puppeteer');
const { cleanPrice, generateCanonicalName } = require('../utils');

async function scrapeOVS(url) {
  console.log("🚀 Scraping OVS URL :", url);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Scroll pour charger les éléments lazy-load
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));

    const result = await page.evaluate(() => {
      const result = {
        name: null,
        brand: null,
        price: null,
        promoPrice: null,
        promoPercent: null,
        pricePerKg: null,
        weight: null,
        availability: "available",
      };

      // Nom du produit
      const nameElement =
        document.querySelector("h1.product_name") ||
        document.querySelector("h1[itemprop='name']") ||
        document.querySelector("h1");

      if (nameElement) {
        result.name = nameElement.textContent.trim();
      }

      // Marque
      const metaBrand = document.querySelector('.product-manufacturer meta[itemprop="name"]');
      const brandText = document.querySelector('.product-manufacturer');
      if (metaBrand) result.brand = metaBrand.getAttribute('content').trim();
      else if (brandText) result.brand = brandText.innerText.trim();

      // Prix et promo
      const currentPriceEl = document.querySelector('.product-prices .current-price span[itemprop="price"]');
      const regularPriceEl = document.querySelector('.product-prices .regular-price');
      const promoPercentEl = document.querySelector('.discount-percentage');

      if (currentPriceEl) result.price = currentPriceEl.getAttribute('content') || currentPriceEl.innerText.trim();
      if (regularPriceEl) result.promoPrice = result.price;
      if (promoPercentEl) result.promoPercent = promoPercentEl.innerText.trim();

      // Prix au kilo
      const priceKgEl = document.querySelector('.product-prices .prix-unitaire, .product-prices .product-unit-price');
      if (priceKgEl) {
        const match = priceKgEl.innerText.match(/([\d,.]+)\s?€/);
        if (match) result.pricePerKg = match[1];
      }

      // Poids depuis .extra-product p
      const formatNode = [...document.querySelectorAll('.extra-product p')]
        .find(p => p.innerText.includes('Format :'));
      if (formatNode) {
        const text = formatNode.innerText;
        const match = text.match(/Format\s*:\s*([\d]+)\s*(g|kg|ml)/i);
        if (match) result.weight = match[1] + match[2];
      }

      // Disponibilité
      const mailAlert = document.querySelector('.js-mailalert');
      if (mailAlert) result.availability = "unavailable";

      return result;
    });

    console.log("✅ RAW DATA OVS :", result);

    await browser.close();

    // Standardisation et nettoyage
    return {
      ...result,
      price: cleanPrice(result.price),
      promoPrice: cleanPrice(result.promoPrice),
      pricePerKg: result.pricePerKg ? cleanPrice(result.pricePerKg) : null,
      weight: result.weight || null,
      url,
      site: 'OVS',
      canonical_name: result.name ? generateCanonicalName(result.name) : null
    };

  } catch (err) {
    await browser.close();
    console.error("❌ Erreur scraping OVS :", err);
    return { error: `Scraping échoué : ${err.message}`, url };
  }
}

module.exports = { scrapeOVS };