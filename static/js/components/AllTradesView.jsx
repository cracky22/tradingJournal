const { useState, useEffect } = React;

function AllTradesView({
  t, // trades: Object containing trades for the current profile
  gf, // getFTrades: Function to get filtered trades
  fs, // filterStars: Current star filter (null or number)
  sfs, // setFilterStars: Function to set star filter
  fm, // filterMarket: Current market filter ('All' or market name)
  sfm, // setFilterMarket: Function to set market filter
  ft, // filterTag: Current tag filter ('All' or tag name)
  sft, // setFilterTag: Function to set tag filter
  fp, // filterPeriod: Current period filter ('All', 'Week', 'Month', 'Quarter')
  sfp, // setFilterPeriod: Function to set period filter
  fst, // filterStartDate: Start date for date range filter
  sfst, // setFilterStartDate: Function to set start date
  fe, // filterEndDate: End date for date range filter
  sfe, // setFilterEndDate: Function to set end date
  dt, // delTrade: Function to delete a trade
  tg, // tags: Array of available tags
  st, // strategies: Array of available strategies
  fi, // fetchImage: Function to fetch trade image
  cp, // currentProfile: Current profile name
}) {
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [images, setImages] = useState({});

  // Update filtered trades when filters or trades change
  useEffect(() => {
    const trades = gf();
    setFilteredTrades(trades);
  }, [t, fm, fp, ft, fs, fst, fe, gf]);

  // Fetch images for visible trades
  useEffect(() => {
    const loadImages = async () => {
      const newImages = {};
      for (const trade of filteredTrades) {
        if (trade.imageRef) {
          const key = `${trade.date}-${filteredTrades.indexOf(trade)}`;
          if (!images[key]) {
            const image = await fi(
              cp,
              trade.date,
              filteredTrades.indexOf(trade)
            );
            newImages[key] = image;
          }
        }
      }
      if (Object.keys(newImages).length > 0) {
        setImages((prev) => ({ ...prev, ...newImages }));
      }
    };
    loadImages();
  }, [filteredTrades, cp, fi, images]);

  const handleDeleteTrade = (date, index) => {
    if (window.confirm("Are you sure you want to delete this trade?")) {
      dt(date, index);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">All Trades</h2>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-gray-400 mb-1">Market</label>
          <select
            value={fm}
            onChange={(e) => sfm(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
          >
            <option value="All">All Markets</option>
            {window.markets.map((market) => (
              <option key={market} value={market}>
                {market}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Period</label>
          <select
            value={fp}
            onChange={(e) => sfp(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
          >
            <option value="All">All Time</option>
            <option value="Week">This Week</option>
            <option value="Month">This Month</option>
            <option value="Quarter">This Quarter</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Tag</label>
          <select
            value={ft}
            onChange={(e) => sft(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
          >
            <option value="All">All Tags</option>
            {tg.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Stars</label>
          <select
            value={fs === null ? "All" : fs}
            onChange={(e) =>
              sfs(e.target.value === "All" ? null : Number(e.target.value))
            }
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
          >
            <option value="All">All Stars</option>
            {[0, 1, 2, 3, 4, 5].map((star) => (
              <option key={star} value={star}>
                {star} Star{star !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Start Date</label>
          <input
            type="date"
            value={fst}
            onChange={(e) => sfst(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
          />
        </div>
        <div>
          <label className="block text-gray-400 mb-1">End Date</label>
          <input
            type="date"
            value={fe}
            onChange={(e) => sfe(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
          />
        </div>
      </div>

      {/* Trades Table */}
      {filteredTrades.length === 0 ? (
        <p className="text-gray-400">No trades match the current filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-gray-200">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-3">Date</th>
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
              {filteredTrades.map((trade, index) => {
                const imageKey = `${trade.date}-${index}`;
                return (
                  <tr
                    key={imageKey}
                    className="border-t border-gray-600 hover:bg-gray-700"
                  >
                    <td className="p-3">{trade.date}</td>
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
                        onClick={() => handleDeleteTrade(trade.date, index)}
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
