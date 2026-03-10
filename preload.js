const { contextBridge, ipcRenderer } = require('electron');

// ===============================
// EXPOSITION DES FONCTIONS API (IPC)
// ===============================
contextBridge.exposeInMainWorld('api', {
  // Produits
  scrapeProduct: (url) => ipcRenderer.invoke('scrape-product', url),
  getProducts: () => ipcRenderer.invoke('get-products'),
  upsertProduct: (productData) => ipcRenderer.invoke('upsert-product', productData),
  deleteProducts: (urls) => ipcRenderer.invoke('delete-products', urls),

  // Marques et suggestions
  getBrands: () => ipcRenderer.invoke('get-brands'),
  getCanonicalSuggestions: (name) => ipcRenderer.invoke('get-canonical-suggestions', name),
  getBrandUrl: (brand, site) => ipcRenderer.invoke('get-brand-url', brand, site),

  // Historique et graphiques
  getProductHistory: (productId) => ipcRenderer.invoke('get-product-history', productId),
  openInWindow: (url) => ipcRenderer.invoke('open-in-window', url),
});

// ===============================
// UTILITAIRES
// ===============================
const BRAND_MAPPINGS = {
  "Planted Foods": "Planted",
  "Garden Gourmet": "Garden Gourmet",
  "Beyond Meat": "Beyond Meat"
};

contextBridge.exposeInMainWorld('utils', {
  normalizeBrand: (brand) => BRAND_MAPPINGS[brand] || brand,

  extractBrandFromName: (name, brand) => {
    if (!name || !brand) return name;
    const normalizedName = name.toLowerCase();
    const normalizedBrand = brand.toLowerCase();
    return normalizedName.includes(normalizedBrand)
      ? name.replace(new RegExp(brand, 'gi'), '').trim()
      : name;
  },

  generateCanonicalName: (name = '') => {
    if (!name) return "";
    const ignoredWords = [
      'végétal', 'végétales', 'végétarien', 'végétariennes',
      'veggie', 'vegan', 'vegetaux', 'vegetal', 'gr', 'kg', ' g '
    ];
    let cleaned = name.toLowerCase();
    ignoredWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });
    return cleaned
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  },

  formatPrice: (price) => {
    if (price == null) return 'N/A';
    return parseFloat(price).toFixed(2) + ' €';
  },
});

console.log("Preload chargé avec succès !");
