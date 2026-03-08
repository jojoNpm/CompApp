// services/sites/chronodrive.js
const axios = require('axios');
const cheerio = require('cheerio');
const { cleanPrice, extractWeight, detectAvailability } = require('../utils');

async function scrapeChronodrive(url) {
  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Nom du produit
    const name = $('span.card-label-name').text().trim();
    if (!name) throw new Error("Nom du produit introuvable.");

    // Prix
    let price = $('.product-actions-value').first().text().trim();
    const promoPrice = $('ins.product-actions-value').first().text().trim();
    if (promoPrice) price = promoPrice;

    if (!price) throw new Error("Prix introuvable.");

    // Poids
    const weightRaw = $('span.info-price').text().trim();

    // Disponibilité
    const unavailableElement = $('div.card-unavailable-text p');
    const availability = unavailableElement.length ? 'unavailable' : 'available';

    return {
      name,
      price: cleanPrice(price),
      weightRaw,
      availability,
      url,
      site: 'Chronodrive',
    };
  } catch (error) {
    return { error: `Scraping échoué : ${error.message}`, url };
  }
}

module.exports = { scrapeChronodrive };