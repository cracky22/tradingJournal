const { useState, useEffect, useRef } = React;

function DashboardView({
  t, // trades: Object containing trades for the current profile
  gc, // getCData: Function to get chart data for cumulative profit
  gp, // getProfit: Function to calculate profit for a day
  gf, // getFTrades: Function to get filtered trades
  gtp // getTimePerfData: Function to get performance by trade duration
}) {
  const [stats, setStats] = useState({
    totalProfit: 0,
    totalTrades: 0,
    avgProfitPerTrade: 0,
    winRate: 0
  });
  const profitChartRef = useRef(null);
  const timePerfChartRef = useRef(null);
  const profitChartInstance = useRef(null);
  const timePerfChartInstance = useRef(null);

  // Calculate statistics
  useEffect(() => {
    const trades = gf();
    const totalProfit = trades.reduce((sum, trade) => sum + (trade.profitLossDollar || 0), 0);
    const totalTrades = trades.length;
    const avgProfitPerTrade = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const winningTrades = trades.filter(trade => (trade.profitLossDollar || 0) > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    setStats({
      totalProfit,
      totalTrades,
      avgProfitPerTrade,
      winRate
    });
  }, [t, gf]);

  // Initialize Cumulative Profit Chart
  useEffect(() => {
    if (profitChartRef.current) {
      if (profitChartInstance.current) {
        profitChartInstance.current.destroy();
      }
      const ctx = profitChartRef.current.getContext('2d');
      profitChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: gc(gf()),
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: 'Date', color: '#e5e7eb' }, ticks: { color: '#e5e7eb' } },
            y: { title: { display: true, text: 'Cumulative Profit ($)', color: '#e5e7eb' }, ticks: { color: '#e5e7eb' } }
          },
          plugins: {
            legend: { labels: { color: '#e5e7eb' } },
            tooltip: {
              callbacks: {
                label: (context) => `Profit: $${context.raw.y.toFixed(2)}, Date: ${context.raw.x}`
              }
            }
          }
        }
      });
    }

    return () => {
      if (profitChartInstance.current) {
        profitChartInstance.current.destroy();
      }
    };
  }, [t, gc, gf]);

  // Initialize Time Performance Chart
  useEffect(() => {
    if (timePerfChartRef.current) {
      if (timePerfChartInstance.current) {
        timePerfChartInstance.current.destroy();
      }
      const ctx = timePerfChartRef.current.getContext('2d');
      timePerfChartInstance.current = new Chart(ctx, {
        type: 'scatter',
        data: gtp(gf()),
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: 'Trade Duration (min)', color: '#e5e7eb' }, ticks: { color: '#e5e7eb' } },
            y: { title: { display: true, text: 'Profit/Loss ($)', color: '#e5e7eb' }, ticks: { color: '#e5e7eb' } }
          },
          plugins: {
            legend: { labels: { color: '#e5e7eb' } },
            tooltip: {
              callbacks: {
                label: (context) => `Duration: ${context.raw.x} min, Profit: $${context.raw.y.toFixed(2)}`
              }
            }
          }
        }
      });
    }

    return () => {
      if (timePerfChartInstance.current) {
        timePerfChartInstance.current.destroy();
      }
    };
  }, [t, gtp, gf]);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold text-white mb-4">Dashboard</h2>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Total Profit</h3>
          <p className="text-2xl" style={{ color: stats.totalProfit >= 0 ? '#22c55e' : '#ef4444' }}>
            ${stats.totalProfit.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Total Trades</h3>
          <p className="text-2xl text-white">{stats.totalTrades}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Average Profit/Trade</h3>
          <p className="text-2xl" style={{ color: stats.avgProfitPerTrade >= 0 ? '#22c55e' : '#ef4444' }}>
            ${stats.avgProfitPerTrade.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Win Rate</h3>
          <p className="text-2xl text-white">{stats.winRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Profit Chart */}
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Cumulative Profit Over Time</h3>
          <canvas ref={profitChartRef} className="w-full h-64"></canvas>
        </div>

        {/* Time Performance Chart */}
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Performance by Trade Duration</h3>
          <canvas ref={timePerfChartRef} className="w-full h-64"></canvas>
        </div>
      </div>
    </div>
  );
}