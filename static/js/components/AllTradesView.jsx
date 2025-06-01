const { useState, useEffect } = React;

function AllTradesView({
  t, // trades
  gf, // getFTrades
  fs, // filterStars
  sfs, // setFilterStars
  fm, // filterMarket
  sfm, // setFilterMarket
  ft, // filterTag
  sft, // setFilterTag
  fp, // filterPeriod
  sfp, // setFilterPeriod
  fst, // filterStartDate
  sfst, // setFilterStartDate
  fe, // filterEndDate
  sfe, // setFilterEndDate
  dt, // delTrade
  tg, // tags
  st, // strategies
  fi, // fetchImage
  cp, // currentProfile
}) {
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [images, setImages] = useState({});

  // Update filtered trades when filters or trades change
  useEffect(() => {
    console.log("[AllTradesView] Running filter with current filters:", {
      filterMarket: fm,
      filterPeriod: fp,
      filterTag: ft,
      filterStars: fs,
      filterStartDate: fst,
      filterEndDate: fe,
    });
    const trades = gf();
    console.log("[AllTradesView] Filtered trades count:", trades.length);
    setFilteredTrades(trades);
  }, [t, fm, fp, ft, fs, fst, fe, gf]);

  // Fetch images for visible trades
  useEffect(() => {
    const loadImages = async () => {
      console.log("[AllTradesView] Starting image load for filtered trades");
      const newImages = {};
      for (const trade of filteredTrades) {
        if (trade.imageRef) {
          const index = filteredTrades.indexOf(trade);
          const key = `${trade.date}-${index}`;
          if (!images[key]) {
            console.log(`[AllTradesView] Fetching image for trade key: ${key}`);
            try {
              const image = await fi(cp, trade.date, index);
              newImages[key] = image;
              console.log(`[AllTradesView] Image fetched for key: ${key}`);
            } catch (error) {
              console.error(`[AllTradesView] Error fetching image for key: ${key}`, error);
            }
          } else {
            console.log(`[AllTradesView] Image already loaded for key: ${key}`);
          }
        }
      }
      if (Object.keys(newImages).length > 0) {
        console.log("[AllTradesView] Updating images state with new images:", Object.keys(newImages));
        setImages((prev) => ({ ...prev, ...newImages }));
      } else {
        console.log("[AllTradesView] No new images to load");
      }
    };
    loadImages();
  }, [filteredTrades, cp, fi, images]);

  const handleDeleteTrade = (date, index) => {
    console.log(`[AllTradesView] Delete requested for trade at date: ${date}, index: ${index}`);
    if (window.confirm("Are you sure you want to delete this trade?")) {
      console.log(`[AllTradesView] Confirmed delete for trade at date: ${date}, index: ${index}`);
      dt(date, index);
    } else {
      console.log("[AllTradesView] Delete cancelled by user");
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
            onChange={(e) => {
              console.log("[AllTradesView] Market filter changed to:", e.target.value);
              sfm(e.target.value);
            }}
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
            onChange={(e) => {
              console.log("[AllTradesView] Period filter changed to:", e.target.value);
              sfp(e.target.value);
            }}
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
            onChange={(e) => {
              console.log("[AllTradesView] Tag filter changed to:", e.target.value);
              sft(e.target.value);
            }}
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
            onChange={(e) => {
              const val = e.target.value === "All" ? null : Number(e.target.value);
              console.log("[AllTradesView] Stars filter changed to:", val);
              sfs(val);
            }}
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
            onChange={(e) => {
              console.log("[AllTradesView] Start date filter changed to:", e.target.value);
              sfst(e.target.value);
            }}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
          />
        </div>
        <div>
          <label className="block text-gray-400 mb-1">End Date</label>
          <input
            type="date"
            value={fe}
            onChange={(e) => {
              console.log("[AllTradesView] End date filter changed to:", e.target.value);
              sfe(e.target.value);
            }}
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
                        onClick={() => {
                          console.log(`[AllTradesView] Delete button clicked for trade key: ${imageKey}`);
                          handleDeleteTrade(trade.date, index);
                        }}
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
