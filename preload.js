const { contextBridge, ipcRenderer } = require('electron');

// ===============================
// API IPC
// ===============================
contextBridge.exposeInMainWorld('api', {

  // ===============================
  // Produits
  // ===============================
  scrapeProduct: (url) => ipcRenderer.invoke('scrape-product', url),
  getProducts: () => ipcRenderer.invoke('get-products'),
  getProductById: (id) => {
    console.log("getProductById called with ID:", id); // Log pour vérifier l'appel
    return ipcRenderer.invoke('get-product-by-id', id);
  },
  upsertProduct: (productData) => ipcRenderer.invoke('upsert-product', productData),
  deleteProducts: (urls) => ipcRenderer.invoke('delete-products', urls),

  // 🔹 Vérification doublon produit
  checkDuplicateProduct: (productData) =>
  ipcRenderer.invoke('check-duplicate-product', productData),

getCanonicalImage: (canonical) =>
  ipcRenderer.invoke('get-canonical-image', canonical),

  // ===============================
  // Marques
  // ===============================
  getBrands: () => ipcRenderer.invoke('get-brands'),
  getCanonicalSuggestions: (name) =>
    ipcRenderer.invoke('get-canonical-suggestions', name),

  getBrandUrl: (brand, site) =>
    ipcRenderer.invoke('get-brand-url', brand, site),

  getAllBrandsWithSites: () =>
    ipcRenderer.invoke('get-all-brands-with-sites'),

  verifyBrandExists: (brand, site) =>
    ipcRenderer.invoke('verify-brand-exists', brand, site),

  detectBrand: (scrapedBrand) =>
    ipcRenderer.invoke('detect-brand', scrapedBrand),

  // ===============================
  // Historique
  // ===============================
  getProductHistory: (productId) =>
    ipcRenderer.invoke('get-product-history', productId),

  // ===============================
  // Navigation
  // ===============================
  openInWindow: (url) =>
    ipcRenderer.invoke('open-in-window', url)

});

console.log("[PRELOAD] Chargé avec succès");