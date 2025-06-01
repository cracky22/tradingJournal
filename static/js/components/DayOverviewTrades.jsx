const { useState, useEffect } = React;

function DayOverview({ t, d, sd, gp, gc, dt, fi, cp }) {
  const [chartInstance, setChartInstance] = useState(null);
  const date = d; // d ist jetzt nur das Datum (String)
  const trades = t[date] || []; // Trades direkt aus t holen

  useEffect(() => {
    if (!date || !trades.length) return;

    // Calculate cumulative profit
    const dates = [];
    const profits = [];
    let cumulativeProfit = 0;

    trades.forEach(trade => {
      const tradeDate = trade.date || date;
      const dailyProfit = trade.profitLossDollar || 0;
      cumulativeProfit += dailyProfit;
      dates.push(tradeDate);
      profits.push(cumulativeProfit);
    });

    const ctx = document.getElementById('cumulativeProfitChart')?.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart instance if it exists
    if (chartInstance) {
      chartInstance.destroy();
    }

    const newChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Cumulative Profit ($)',
          data: profits,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.1,
        }],
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: 'Date', color: '#d1d5db' }, ticks: { color: '#d1d5db' } },
          y: { title: { display: true, text: 'Profit ($)', color: '#d1d5db' }, ticks: { color: '#d1d5db' } },
        },
        plugins: {
          legend: { labels: { color: '#d1d5db' } },
        },
      },
    });

    setChartInstance(newChartInstance);

    return () => {
      if (newChartInstance) {
        newChartInstance.destroy();
      }
    };
  }, [date, trades]);

  const totalProfit = gp(date) || 0;

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <button
        onClick={() => sd(null)}
        className="mb-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
      >
        Back
      </button>
      <h2 className="text-2xl font-bold text-white mb-4">Day Overview: {date}</h2>
      <div className="mb-6">
        <p className="text-lg font-semibold text-green-400 mb-2">Total Profit: ${totalProfit.toFixed(2)}</p>
        <canvas id="cumulativeProfitChart" className="w-full h-64"></canvas>
      </div>
      <DayOverviewTrades
        trades={trades}
        date={date}
        dt={dt}
        fi={fi}
        cp={cp}
      />
    </div>
  );
}