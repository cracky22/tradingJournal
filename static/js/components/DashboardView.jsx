const { useState, useEffect, useRef } = React;

function DashboardView({
  t, // trades: Object containing trades for the current profile
  gc, // getCData: Function to get chart data for cumulative profit
  gp, // getProfit: Function to calculate profit for a day
  gf, // getFTrades: Function to get filtered trades
  gtp // getTimePerfData: Function to get performance by trade duration
}) {
  const [stats, setStats] = useState({
    totalProfitLoss: 0,
    profitFactor: 0,
    totalTrades: 0,
    avgProfitPerTrade: 0,
    avgWin: 0,
    maxWinTrade: 0,
    avgLoss: 0,
    maxLossTrade: 0,
    maxDrawdown: 0,
    longWinRate: 0,
    shortWinRate: 0
  });
  const profitChartRef = useRef(null);
  const timePerfChartRef = useRef(null);
  const profitChartInstance = useRef(null);
  const timePerfChartInstance = useRef(null);

  // Calculate statistics
  useEffect(() => {
    const trades = gf() || [];
    const totalTrades = trades.length;

    // Total Profit/Loss
    const totalProfitLoss = trades.reduce((sum, trade) => sum + (trade.profitLossDollar || 0), 0);

    // Profit Factor: Sum of profits / Sum of losses
    const totalWins = trades
      .filter(trade => (trade.profitLossDollar || 0) > 0)
      .reduce((sum, trade) => sum + trade.profitLossDollar, 0);
    const totalLosses = Math.abs(
      trades
        .filter(trade => (trade.profitLossDollar || 0) < 0)
        .reduce((sum, trade) => sum + trade.profitLossDollar, 0)
    );
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Average Profit/Trade
    const avgProfitPerTrade = totalTrades > 0 ? totalProfitLoss / totalTrades : 0;

    // Average Win
    const winningTrades = trades.filter(trade => (trade.profitLossDollar || 0) > 0);
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, trade) => sum + trade.profitLossDollar, 0) / winningTrades.length
      : 0;

    // Max Win Trade
    const maxWinTrade = trades.length > 0
      ? Math.max(...trades.map(trade => trade.profitLossDollar || 0), 0)
      : 0;

    // Average Loss
    const losingTrades = trades.filter(trade => (trade.profitLossDollar || 0) < 0);
    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, trade) => sum + trade.profitLossDollar, 0) / losingTrades.length
      : 0;

    // Max Loss Trade
    const maxLossTrade = trades.length > 0
      ? Math.min(...trades.map(trade => trade.profitLossDollar || 0), 0)
      : 0;

    // Max Drawdown (simplified: max peak-to-trough decline in cumulative profit)
    let cumulative = 0;
    let peak = 0;
    let maxDrawdown = 0;
    trades.forEach(trade => {
      cumulative += trade.profitLossDollar || 0;
      peak = Math.max(peak, cumulative);
      maxDrawdown = Math.min(maxDrawdown, cumulative - peak);
    });

    // Long Win Rate (with fallback if direction is missing)
    const longTrades = trades.filter(trade => trade.direction === 'Long' || !trade.direction);
    const longWins = longTrades.filter(trade => (trade.profitLossDollar || 0) > 0);
    const longWinRate = longTrades.length > 0 ? (longWins.length / longTrades.length) * 100 : 0;

    // Short Win Rate
    const shortTrades = trades.filter(trade => trade.direction === 'Short');
    const shortWins = shortTrades.filter(trade => (trade.profitLossDollar || 0) > 0);
    const shortWinRate = shortTrades.length > 0 ? (shortWins.length / shortTrades.length) * 100 : 0;

    setStats({
      totalProfitLoss,
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
      totalTrades,
      avgProfitPerTrade,
      avgWin,
      maxWinTrade,
      avgLoss,
      maxLossTrade,
      maxDrawdown,
      longWinRate,
      shortWinRate
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
        data: gc(gf() || []),
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
        data: gtp(gf() || []),
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Total Profit/Loss</h3>
          <p className="text-2xl" style={{ color: stats.totalProfitLoss >= 0 ? '#22c55e' : '#ef4444' }}>
            ${stats.totalProfitLoss.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Profit Factor</h3>
          <p className="text-2xl text-white">{stats.profitFactor.toFixed(2)}</p>
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
          <h3 className="text-lg font-semibold text-gray-300">Average Win</h3>
          <p className="text-2xl text-white">${stats.avgWin.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Max Win Trade</h3>
          <p className="text-2xl text-white">${stats.maxWinTrade.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Average Loss</h3>
          <p className="text-2xl text-white">${Math.abs(stats.avgLoss).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Max Loss Trade</h3>
          <p className="text-2xl text-white">${Math.abs(stats.maxLossTrade).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Max Drawdown</h3>
          <p className="text-2xl text-white">${Math.abs(stats.maxDrawdown).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Long Win Rate</h3>
          <p className="text-2xl text-white">{stats.longWinRate.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-300">Short Win Rate</h3>
          <p className="text-2xl text-white">{stats.shortWinRate.toFixed(1)}%</p>
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