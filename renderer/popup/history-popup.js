// ===============================
// POPUP HISTORIQUE AVEC ONGLETS
// ===============================
let historyChartInstance = null;

async function showHistoryPopup(product) {
  const popup = document.getElementById('historyPopup');
  popup.innerHTML = `
    <div class="popupContent" style="width: 900px;">
      <h2>Historique des prix - ${product.name}</h2>

      <div class="history-tabs">
        <button class="tab-button active" data-tab="table">Tableau</button>
        <button class="tab-button" data-tab="chart">Graphique</button>
      </div>

      <div class="tab-content active" data-tab="table">
        <table class="history-table">
          <thead><tr><th>Date</th><th>Prix (€)</th></tr></thead>
          <tbody id="historyTableBody"></tbody>
        </table>
      </div>

      <div class="tab-content" data-tab="chart">
        <canvas id="historyChart" width="800" height="400"></canvas>
      </div>

      <button id="closeHistoryPopup" class="btn delete">Fermer</button>
    </div>
  `;

  try {
    const fullHistory = await window.api.getProductHistory(product.id);

    // Tableau
    const tableBody = document.getElementById('historyTableBody');
    tableBody.innerHTML = fullHistory.length > 0 ?
      fullHistory.map(h => `
        <tr>
          <td>${h.date.split('T')[0]}</td>
          <td>${window.utils.formatPrice(h.price)}</td>
        </tr>
      `).join('') :
      '<tr><td colspan="2">Aucun historique disponible</td></tr>';

    // Graphique
    if (fullHistory.length > 0) {
      const ctx = document.getElementById('historyChart');
      if (historyChartInstance) historyChartInstance.destroy();

      historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: fullHistory.map(h => h.date.split('T')[0]),
          datasets: [{
            label: 'Prix (€)',
            data: fullHistory.map(h => h.price),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        }
      });
    }

    // Gestion des onglets
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button, .tab-content').forEach(el => {
          el.classList.remove('active');
        });
        button.classList.add('active');
        document.querySelector(`.tab-content[data-tab="${button.dataset.tab}"]`).classList.add('active');
      });
    });

    document.getElementById('closeHistoryPopup').onclick = () => {
      popup.classList.add('hidden');
      if (historyChartInstance) {
        historyChartInstance.destroy();
        historyChartInstance = null;
      }
    };

    popup.classList.remove('hidden');

  } catch (error) {
    console.error("Erreur:", error);
    popup.innerHTML = `<div class="popupContent"><h2>Erreur</h2><p>${error.message}</p></div>`;
    document.getElementById('closeHistoryPopup').onclick = () => popup.classList.add('hidden');
  }
}

// Export
window.showHistoryPopup = showHistoryPopup;
