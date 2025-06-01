const { useState, useEffect, useRef } = React;

function DayOverview({
  t, // trades: Object containing trades for the current profile
  d, // date: Selected date (string, e.g., "2025-06-01")
  sd, // setDate: Function to set selected date
  gp, // getProfit: Function to calculate profit for a day
  gc, // getCData: Function to get chart data for cumulative profit
  dt, // delTrade: Function to delete a trade
  fi, // fetchImage: Function to fetch trade image
  cp, // currentProfile: Current profile name
}) {
  const [trades, setTrades] = useState([]);
  const [images, setImages] = useState({});
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Load trades for the selected date
  useEffect(() => {
    const dayTrades = t[d] || [];
    setTrades(dayTrades);
  }, [t, d]);

  // Fetch images for trades
  useEffect(() => {
    const loadImages = async () => {
      const newImages = {};
      for (let i = 0; i < trades.length; i++) {
        const trade = trades[i];
        if (trade.imageRef) {
          const key = `${d}-${i}`;
          if (!images[key]) {
            const image = await fi(cp, d, i);
            newImages[key] = image;
          }
        }
      }
      if (Object.keys(newImages).length > 0) {
        setImages((prev) => ({ ...prev, ...newImages }));
      }
    };
    loadImages();
  }, [trades, cp, fi, d, images]);

  // Initialize Cumulative Profit Chart
  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      const ctx = chartRef.current.getContext("2d");
      chartInstance.current = new Chart(ctx, {
        type: "line",
        data: gc(trades),
        options: {
          responsive: true,
          scales: {
            x: {
              title: { display: true, text: "Trade", color: "#e5e7eb" },
              ticks: { color: "#e5e7eb" },
            },
            y: {
              title: { display: true, text: "Profit ($)", color: "#e5e7eb" },
              ticks: { color: "#e5e7eb" },
            },
          },
          plugins: {
            legend: { labels: { color: "#e5e7eb" } },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const trade = context.raw.tradeData;
                  return trade
                    ? `Profit: $${context.raw.y.toFixed(2)}, Market: ${
                        trade.market || "N/A"
                      }`
                    : `Profit: $${context.raw.y.toFixed(2)}`;
                },
              },
            },
          },
        },
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [trades, gc]);

  const handleDeleteTrade = (index) => {
    if (window.confirm("Are you sure you want to delete this trade?")) {
      dt(d, index);
    }
  };

  const handleBack = () => {
    sd(d);
    // Clear the overview date to return to the previous view
    // Assuming setOvDate(null) is passed via sd to reset the view
    sd(null);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Day Overview: {d}</h2>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 smooth-transition"
        >
          Back
        </button>
      </div>

      {/* Total Profit */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-300">Total Profit</h3>
        <p
          className="text-2xl"
          style={{ color: gp(d) >= 0 ? "#22c55e" : "#ef4444" }}
        >
          ${gp(d).toFixed(2)}
        </p>
      </div>

      {/* Cumulative Profit Chart */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">
          Cumulative Profit
        </h3>
        <canvas ref={chartRef} className="w-full h-64"></canvas>
      </div>

      {/* Trades List */}
      {trades.length === 0 ? (
        <p className="text-gray-400">No trades for this day.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-gray-200">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-3">Market</th>
                <th className="p-3">Profit/Loss ($)</th>
                <th className="p-3">Tags</th>
                <th className="p-3">Stars</th>
                <th className="p-3">Strategy</th>
                <th className="p-3">Image</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, index) => {
                const imageKey = `${d}-${index}`;
                return (
                  <tr
                    key={imageKey}
                    className="border-t border-gray-600 hover:bg-gray-700"
                  >
                    <td className="p-3">{trade.market || "N/A"}</td>
                    <td
                      className="p-3"
                      style={{
                        color:
                          trade.profitLossDollar >= 0 ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {trade.profitLossDollar?.toFixed(2) || "0.00"}
                    </td>
                    <td className="p-3">{trade.tags?.join(", ") || "None"}</td>
                    <td className="p-3">{trade.stars || 0} ⭐</td>
                    <td className="p-3">{trade.strategy || "N/A"}</td>
                    <td className="p-3">
                      {trade.imageRef ? (
                        images[imageKey] ? (
                          <img
                            src={`data:image/png;base64,${images[imageKey]}`}
                            alt="Trade screenshot"
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <span className="text-gray-400">Loading...</span>
                        )
                      ) : (
                        "No Image"
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteTrade(index)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 smooth-transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
