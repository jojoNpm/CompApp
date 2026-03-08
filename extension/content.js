// extension/content.js

function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const interval = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        resolve(el);
      }
      elapsed += interval;
      if (elapsed >= timeout) {
        clearInterval(timer);
        reject();
      }
    }, interval);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    waitForElement("h1").then(() => {
      const result = {
        site: "Intermarché",
        name: null,
        brand: null,
        price: null,
        promoPrice: null,
        promoPercent: null,
        weight: null,
        pricePerKg: null
      };

      // NOM + MARQUE
      const h1 = document.querySelector("h1");
      if (h1) {
        const span = h1.querySelector("span");
        if (span) {
          result.brand = span.textContent.trim();
          span.remove();
        }
        result.name = h1.textContent.trim();
      }

      // POIDS + PRIX KILO
      const priceInfo = Array.from(document.querySelectorAll("p"))
        .find(el => el.textContent.includes("€/Kg"));
      if (priceInfo) {
        const text = priceInfo.textContent;
        const weightMatch = text.match(/(\d+)\s?g/);
        if (weightMatch) result.weight = weightMatch[1] + "g";
        const priceMatch = text.match(/([\d,]+)\s?€\/Kg/);
        if (priceMatch) result.pricePerKg = parseFloat(priceMatch[1].replace(",", "."));
      }

      // PRIX NORMAL
      const normalPrice = document.querySelector('[data-testid="default"] p');
      if (normalPrice) result.price = parseFloat(normalPrice.textContent.replace(",", "."));

      // PRIX BARRÉ
      const crossed = document.querySelector(".product--price__crossedOutPrice");
      if (crossed) {
        result.price = parseFloat(crossed.textContent.replace(",", "."));
        const instead = document.querySelector(".product--price__insteadOf");
        if (instead) {
          const match = instead.textContent.match(/([\d,]+)/);
          if (match) result.promoPrice = parseFloat(match[1].replace(",", "."));
        }
      }

      // % PROMO
      const badge = document.querySelector("div.badge");
      if (badge) {
        const match = badge.textContent.match(/(\d+)%/);
        if (match) result.promoPercent = parseInt(match[1]);
      }

      sendResponse(result);
    }).catch(() => {
      sendResponse({ error: "Produit non détecté" });
    });

    return true;
  }
});