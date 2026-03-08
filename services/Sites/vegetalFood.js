const puppeteer = require('puppeteer');
const { cleanPrice, generateCanonicalName } = require('../utils');

async function scrapeVegetalFood(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    console.log(`Scraping en cours pour : ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    const data = {};

    // Nom du produit
    data.name = await page.$eval('h1.tt-producttitle', el => el.textContent.trim())
      .catch(() => "Non trouvé");

    // Marque
    try {
      data.brand = await page.$eval('#product_manufacturer a img', el => el.alt);
    } catch {
      try {
        data.brand = await page.$eval('#product_manufacturer a', el => el.textContent.trim());
      } catch {
        data.brand = "Non trouvée";
      }
    }

    // Prix régulier (prix barré)
    try {
      data.regularPrice = await page.$eval('.regular-price', el =>
        el.textContent.trim().replace(/[^\d.,]/g, ''));
      data.regularPrice = cleanPrice(data.regularPrice);
    } catch {
      // Si pas de prix barré, utiliser le prix actuel comme prix régulier
      try {
        const currentPrice = await page.$eval('.current-price-value', el =>
          el.textContent.trim().replace(/[^\d.,]/g, ''));
        data.regularPrice = cleanPrice(currentPrice);
      } catch {
        data.regularPrice = null;
      }
    }

    // Prix actuel
    try {
      data.currentPrice = await page.$eval('.current-price-value', el =>
        el.textContent.trim().replace(/[^\d.,]/g, ''));
      data.currentPrice = cleanPrice(data.currentPrice);
    } catch {
      try {
        data.currentPrice = await page.$eval('.current-price span', el =>
          el.textContent.trim().replace(/[^\d.,]/g, ''));
        data.currentPrice = cleanPrice(data.currentPrice);
      } catch {
        data.currentPrice = null;
      }
    }

    // Pourcentage de promotion
    try {
      data.discountPercentage = await page.$eval('.discount-percentage', el =>
        parseInt(el.textContent.trim().replace(/[^\d]/g, '')));
    } catch {
      data.discountPercentage = null;
    }

    // Prix au kilo
    try {
      const price = await page.$eval('.product-unit-price.sub', el => el.textContent.trim());
      data.pricePerKg = cleanPrice(price);
    } catch {
      try {
        const price = await page.$eval('.product-unit-price', el => el.textContent.trim());
        data.pricePerKg = cleanPrice(price);
      } catch {
        data.pricePerKg = null;
      }
    }

    // Poids
    try {
      const weightText = await page.$eval('[id^="product-description-short-"] p',
        el => el.textContent.trim());
      const weightMatch = weightText.match(/(\d+\s?[gk][rg]?)/i);
      data.weightRaw = weightMatch ? weightMatch[0] : null;
    } catch {
      data.weightRaw = null;
    }

    // Disponibilité
    try {
      const isDisabled = await page.$eval('.add-to-cart', el => el.disabled);
      data.availability = isDisabled ? "Indisponible" : "Disponible";
    } catch {
      data.availability = "Disponible";
    }

    await browser.close();

    // Calcul du prix régulier si nécessaire
    if (!data.regularPrice && data.pricePerKg && data.weightRaw) {
      const weight = parseFloat(data.weightRaw);
      data.regularPrice = (data.pricePerKg * weight) / 1000;
    }

    return {
      name: data.name,
      brand: data.brand,
      site: 'VegetalFood',  // Nom du site explicitement défini
      site_name: 'Vegetal Food',  // Nom complet du site
      product_url: url,
      regular_price: data.regularPrice,
      promo_price: data.discountPercentage ? data.currentPrice : null,
      promo_percent: data.discountPercentage,
      price_per_kg: data.pricePerKg,
      weight_raw: data.weightRaw,
      availability: data.availability,
      canonical_name: data.name ? generateCanonicalName(data.name) : null,
      product_reference: data.name ?
        `${generateCanonicalName(data.name).replace(/[^a-z0-9-]/g, '-')}-${data.brand.replace(/[^a-z0-9-]/g, '-')}-vegetalfood` :
        null
    };

  } catch (error) {
    await browser.close();
    console.error("Erreur scraping VegetalFood:", error);
    throw new Error(`Scraping échoué : ${error.message}`);
  }
}

module.exports = { scrapeVegetalFood };
