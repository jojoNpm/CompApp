/**
 * Utilitaires pour les graphiques
 */
const Chart = require('chart.js/auto');

/**
 * Affiche un graphique pour un produit
 * @param {string} canvasId - ID du canvas HTML
 * @param {Array} productData - Données du produit (inclut history)
 * @param {string} title - Titre du graphique
 */
function renderPriceChart(canvasId, productData, title = '') {
  const ctx = document.getElementById(canvasId).getContext('2d');

  // Préparation des données
  const labels = productData.history?.map((_, i) => `J-${productData.history.length - 1 - i}`) || [];
  const prices = productData.history?.map(h => h.price) || [];
  const promoPrices = productData.history?.map(h => h.promo_price).filter(p => p !== null) || [];

  // Création du graphique
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Prix Régulier',
          data: prices,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1,
          fill: true
        },
        {
          label: 'Prix Promo',
          data: promoPrices,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: !!title,
          text: title
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Prix (€)'
          }
        }
      }
    }
  });
}

/**
 * Met à jour un graphique existant
 */
function updateChart(chart, productData) {
  const labels = productData.history?.map((_, i) => `J-${productData.history.length - 1 - i}`) || [];
  const prices = productData.history?.map(h => h.price) || [];
  const promoPrices = productData.history?.map(h => h.promo_price).filter(p => p !== null) || [];

  chart.data.labels = labels;
  chart.data.datasets[0].data = prices;
  chart.data.datasets[1].data = promoPrices;
  chart.update();
}

module.exports = {
  renderPriceChart,
  updateChart
};
