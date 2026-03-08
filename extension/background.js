// extension/background.js

// ⚡ Fonction pour envoyer les données scrape à Electron
async function sendToElectron(productData) {
  try {
    const response = await fetch("http://localhost:3210/extension", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      throw new Error(`Erreur serveur Electron : ${response.status}`);
    }

    return response.json();
  } catch (err) {
    console.error("Erreur lors de l'envoi à Electron :", err);
    throw err;
  }
}

// ⚡ Listener pour le bouton de la popup ou autre message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    // Récupère l'onglet actif
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];

      try {
        // Envoi d'un message au content script pour scrapper la page
        const result = await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tab.id, { action: "scrape" }, (response) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(response);
          });
        });

        // Vérifie qu'on a bien récupéré les infos
        if (!result || !result.name) {
          sendResponse({ success: false, error: "Impossible de récupérer les données du produit" });
          return;
        }

        // Ajoute l'URL du produit
        result.url = tab.url;

        // Envoi à Electron
        const electronResp = await sendToElectron(result);

        // Réponse au popup ou à l'appel
        sendResponse({ success: true, electronResp });

      } catch (err) {
        console.error("Erreur dans background.js :", err);
        sendResponse({ success: false, error: err.message });
      }
    });

    // Indique à Chrome que la réponse sera asynchrone
    return true;
  }
});

// ⚡ Optionnel : WebRequest pour changer le User-Agent
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    for (let i = 0; i < details.requestHeaders.length; i++) {
      if (details.requestHeaders[i].name === "User-Agent") {
        details.requestHeaders[i].value = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0";
        break;
      }
    }
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["*://www.intermarche.com/*"] },
  ["blocking", "requestHeaders"]
);