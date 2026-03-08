// services/Sites/intermarche.js

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { cleanPrice, generateCanonicalName } = require('../utils');

puppeteer.use(StealthPlugin());

async function scrapeIntermarche(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080'
    ]
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Vérification blocage
    const blocked = await page.evaluate(() => {
      return !!document.querySelector(
        'div[class*="captcha"], div[class*="block"], div[class*="error"]'
      );
    });

    if (blocked) {
      throw new Error("Page bloquée par protection anti-bot");
    }

    const data = await page.evaluate(() => {

      const result = {
        name: null,
        brand: null,
        regular_price: null,
        promo_price: null,
        promo_percent: null,
        price_per_kg: null,
        weight_raw: null,
        availability: "Disponible"
      };

      // NOM + MARQUE
      const h1 = document.querySelector("h1");
      if (h1) {
        const brandSpan = h1.querySelector("span");
        if (brandSpan) {
          result.brand = brandSpan.textContent.trim();
          brandSpan.remove();
        }
        result.name = h1.textContent.trim();
      }

      // DISPONIBILITÉ
      const unavailable = document.querySelector(
        '[class*="indisponible"], [class*="rupture"], [class*="unavailable"]'
      );
      if (unavailable) {
        result.availability = "Indisponible";
      }

      // PRIX
      const priceElement = document.querySelector(
        '[data-testid="default"] p, .product--price__current, .price'
      );

      if (priceElement) {
        result.regular_price = parseFloat(
          priceElement.textContent
            .replace(/[^\d.,]/g, '')
            .replace(',', '.')
        );
      }

      // PROMO
      const crossed = document.querySelector(
        '.product--price__crossedOutPrice, .old-price'
      );

      if (crossed) {
        result.regular_price = parseFloat(
          crossed.textContent
            .replace(/[^\d.,]/g, '')
            .replace(',', '.')
        );

        const instead = document.querySelector(
          '.product--price__insteadOf, .current-price'
        );

        if (instead) {
          result.promo_price = parseFloat(
            instead.textContent
              .replace(/[^\d.,]/g, '')
              .replace(',', '.')
          );
        }
      }

      // BADGE %
      const badge = document.querySelector(
        'div.badge, .promo-percentage, .discount'
      );

      if (badge) {
        const match = badge.textContent.match(/(-?\d+[\.,]?\d*)%/);
        if (match) {
          result.promo_percent = parseFloat(match[1].replace(',', '.'));
        }
      }

      // POIDS + €/Kg
      const weightPrice = Array.from(document.querySelectorAll("p, span, div"))
        .find(el =>
          el.textContent.includes("€/Kg") ||
          el.textContent.includes("€/kg")
        );

      if (weightPrice) {
        const text = weightPrice.textContent;

        const weightMatch = text.match(/(\d+[\.,]?\d*)\s?(g|kg|ml|cl|l)/i);
        if (weightMatch) result.weight_raw = weightMatch[0];

        const kgMatch = text.match(/([\d,]+[\.,]?\d*)\s?€\/(Kg|kg)/i);
        if (kgMatch) {
          result.price_per_kg = parseFloat(
            kgMatch[1].replace(',', '.')
          );
        }
      }

      return result;
    });

    await browser.close();

    return {
      ...data,
      site: "Intermarché",
      site_name: "Intermarché",
      product_url: url,
      canonical_name: data.name
        ? generateCanonicalName(data.name)
        : null
    };

  } catch (error) {
    await browser.close();
    throw new Error(`Scraping Intermarché échoué : ${error.message}`);
  }
}

module.exports = { scrapeIntermarche };