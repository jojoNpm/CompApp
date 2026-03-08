// ===============================
// POPUP GRAPHIQUE
// ===============================
let chartInstance = null;

function showChartPopup(selectedProducts) {
  const popup = document.getElementById('chartPopup');
  const canvas = document.getElementById('priceChart');

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (selectedProducts.length > 0) {
    const product = selectedProducts[0];
    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: product.history?.map((_, i) => `J-${product.history.length - 1 - i}`) || [],
        datasets: [{
          label: 'Prix (€)',
          data: product.history?.map(h => h.price) || [],
          borderColor: 'rgb(54, 162, 235)',
          tension: 0.1,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${product.name} (${product.site_name})`
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: 'Prix (€)' }
          }
        }
      }
    });
  }

  popup.classList.remove('hidden');
  document.getElementById('closeChart').onclick = () => {
    popup.classList.add('hidden');
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  };
}

// Export
window.showChartPopup = showChartPopup;
