// =======================================
// POPUP-UTILS.JS - Fonctions utilitaires
// =======================================

/**
 * Configure un sélecteur de marque interactif
 */
function setupBrandSelector(product, containerId, brandElementId) {
  const container = document.getElementById(containerId);
  const brandDisplay = document.getElementById(brandElementId);

  if (!container || !brandDisplay) {
    console.error("[UTILS] Éléments du sélecteur introuvables");
    return;
  }

  const changeBtn = document.createElement('button');
  changeBtn.className = 'brand-select-button';
  changeBtn.textContent = 'Changer la marque';
  changeBtn.style.cssText = `
    background: linear-gradient(45deg, #ff9800, #ffb74d);
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    margin-left: 10px;
  `;

  changeBtn.onclick = async () => {
    try {
      const brands = await window.api.getBrands();
      if (!brands || brands.length === 0) {
        alert("Aucune marque disponible");
        return;
      }

      const dropdown = document.createElement('div');
      dropdown.className = 'brand-select-dropdown';
      dropdown.style.cssText = `
        position: absolute;
        left: 0;
        top: 100%;
        width: 100%;
        opacity: 0;
        max-height: 0;
        overflow: hidden;
        transition: all 0.3s ease;
        background: #3a3a3a;
        border-radius: 5px;
        z-index: 10;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        padding: 10px;
        margin-top: 5px;
      `;

      const select = document.createElement('select');
      select.id = 'brand-select';
      select.style.cssText = `
        width: 100%;
        padding: 8px;
        border-radius: 4px;
        border: 1px solid #555;
        background: #444;
        color: white;
        margin-bottom: 10px;
      `;

      select.innerHTML = brands.map(brand =>
        `<option value="${brand}" ${brand === product.brand ? 'selected' : ''}>${brand}</option>`
      ).join('');

      const actions = document.createElement('div');
      actions.className = 'dropdown-actions';
      actions.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      `;

      actions.innerHTML = `
        <button class="btn update" id="confirm-brand" style="
          padding: 5px 10px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">OK</button>
        <button class="btn delete" id="cancel-brand" style="
          padding: 5px 10px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Annuler</button>
      `;

      dropdown.append(select, actions);
      container.appendChild(dropdown);
      setTimeout(() => dropdown.classList.add('active'), 10);
      dropdown.style.opacity = '1';
      dropdown.style.maxHeight = '300px';

      // Gestion des actions
      document.getElementById('confirm-brand').onclick = () => {
        const newBrand = select.value;
        brandDisplay.textContent = newBrand;
        product.brand = newBrand;
        dropdown.style.opacity = '0';
        dropdown.style.maxHeight = '0';
        setTimeout(() => dropdown.remove(), 300);
      };

      document.getElementById('cancel-brand').onclick = () => {
        dropdown.style.opacity = '0';
        dropdown.style.maxHeight = '0';
        setTimeout(() => dropdown.remove(), 300);
      };

    } catch (error) {
      console.error("[UTILS] Erreur sélecteur:", error);
      alert("Erreur lors du chargement des marques");
    }
  };

  container.appendChild(changeBtn);
}

// Ajout des styles CSS directement (temporaire)
const style = document.createElement('style');
style.textContent = `
  .brand-select-dropdown.active {
    opacity: 1 !important;
    max-height: 300px !important;
  }
`;
document.head.appendChild(style);

export { setupBrandSelector };
