const { contextBridge, ipcRenderer } = require('electron');

// Exposition des fonctions API
contextBridge.exposeInMainWorld('api', {
  // Fonctions existantes
  scrapeProduct: (url) => ipcRenderer.invoke('scrape-product', url),
  getProducts: () => ipcRenderer.invoke('get-products'),
  upsertProduct: (rawData) => ipcRenderer.invoke('upsert-product', rawData),
  deleteProducts: (urls) => ipcRenderer.invoke('delete-products', urls),
  getBrands: () => ipcRenderer.invoke('get-brands'),
  getCanonicalSuggestions: (name) => ipcRenderer.invoke('get-canonical-suggestions', name),
  getBrandUrl: (brand, site) => ipcRenderer.invoke('get-brand-url', brand, site),
  getProductHistory: (productId) => ipcRenderer.invoke('get-product-history', productId),
  openInWindow: (url) => ipcRenderer.invoke('open-in-window', url),

  // Fonction de test
  test: () => {
    console.log("Fonction de test appelée depuis le preload!");
    return 'Preload fonctionnel!';
  }
});

// Exposition des utilitaires
contextBridge.exposeInMainWorld('utils', {
  extractBrandFromName: (name, brand) => {
    if (!name || !brand) return name;
    const normalizedName = name.toLowerCase();
    const normalizedBrand = brand.toLowerCase();
    return normalizedName.includes(normalizedBrand)
      ? name.replace(new RegExp(brand, 'gi'), '').trim()
      : name;
  },

  normalizeBrand: (brand) => {
    const BRAND_MAPPINGS = {
      "Planted Foods": "Planted",
      "Garden Gourmet": "Garden Gourmet",
      "Beyond Meat": "Beyond Meat"
    };
    return BRAND_MAPPINGS[brand] || brand;
  },

  generateCanonicalName: (name) => {
    if (!name) return "";
    const ignoredWords = ['végétal', 'végétales', 'végétarien', 'végétariennes', 'veggie', 'vegan', 'vegetaux', 'vegetal', 'gr', 'kg', ' g '];
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
  }
});

// Log de vérification
console.log("Preload script chargé avec succès!");
