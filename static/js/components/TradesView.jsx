const { useState, useEffect } = React;

function TradesView({
  t, // trades: Object containing trades for the current profile
  at, // addTrade: Function to add a trade
  ut, // updTrade: Function to update a trade
  dt, // delTrade: Function to delete a trade
  d, // date: Selected date (string, e.g., "2025-06-01")
  sd, // setDate: Function to set selected date
  tg, // tags: Array of available tags
  ag, // addTag: Function to add a tag
  dg, // delTag: Function to delete a tag
  st, // strategies: Array of available strategies
  edit, // edit: Index of trade being edited (null or number)
  setEdit, // setEdit: Function to set edit index
  fi, // fetchImage: Function to fetch trade image
  cp, // currentProfile: Current profile name
}) {
  const [formData, setFormData] = useState({
    market: "",
    profitLossDollar: "",
    tags: [],
    stars: 0,
    strategy: "",
    tradeDuration: "",
    image: null,
  });
  const [newTag, setNewTag] = useState("");
  const [trades, setTrades] = useState([]);
  const [images, setImages] = useState({});

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

  // Populate form for editing
  useEffect(() => {
    if (edit !== null && trades[edit]) {
      setFormData({
        market: trades[edit].market || "",
        profitLossDollar: trades[edit].profitLossDollar || "",
        tags: trades[edit].tags || [],
        stars: trades[edit].stars || 0,
        strategy: trades[edit].strategy || "",
        tradeDuration: trades[edit].tradeDuration || "",
        image: null,
      });
    }
  }, [edit, trades]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagChange = (tag) => {
    setFormData((prev) => {
      const newTags = prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag];
      return { ...prev, tags: newTags };
    });
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tg.includes(trimmedTag)) {
      ag(trimmedTag);
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmedTag] }));
      setNewTag("");
    } else if (tg.includes(trimmedTag)) {
      alert("Tag already exists.");
    }
  };

  const handleDeleteTag = (tag) => {
    if (window.confirm(`Are you sure you want to delete the tag "${tag}"?`)) {
      dg(tag);
      setFormData((prev) => ({
        ...prev,
        tags: prev.tags.filter((t) => t !== tag),
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trade = {
      date: d,
      market: formData.market,
      profitLossDollar: parseFloat(formData.profitLossDollar) || 0,
      tags: formData.tags,
      stars: parseInt(formData.stars) || 0,
      strategy: formData.strategy,
      tradeDuration: parseFloat(formData.tradeDuration) || 0,
      imageRef: formData.image ? `${d}-${trades.length}` : null,
    };

    try {
      if (formData.image) {
        const formDataToSend = new FormData();
        formDataToSend.append("image", formData.image);
        formDataToSend.append("profile", cp);
        formDataToSend.append("date", d);
        formDataToSend.append("index", edit !== null ? edit : trades.length);

        const response = await fetch("/api/upload_image", {
          method: "POST",
          body: formDataToSend,
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
          throw new Error("Failed to upload image");
        }
      }

      if (edit !== null) {
        ut(d, edit, trade);
        setEdit(null);
      } else {
        at(trade);
      }

      setFormData({
        market: "",
        profitLossDollar: "",
        tags: [],
        stars: 0,
        strategy: "",
        tradeDuration: "",
        image: null,
      });
    } catch (error) {
      console.error("Error submitting trade:", error);
      alert(`Failed to submit trade: ${error.message || "Network error"}`);
    }
  };

  const handleEdit = (index) => {
    setEdit(index);
  };

  const handleDelete = (index) => {
    if (window.confirm("Are you sure you want to delete this trade?")) {
      dt(d, index);
    }
  };

  const handleCancel = () => {
    setEdit(null);
    setFormData({
      market: "",
      profitLossDollar: "",
      tags: [],
      stars: 0,
      strategy: "",
      tradeDuration: "",
      image: null,
    });
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Trades for {d}</h2>

      {/* Trade Form */}
      <div className="mb-6 bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">
          {edit !== null ? "Edit Trade" : "Add Trade"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 mb-1">Market</label>
            <select
              name="market"
              value={formData.market}
              onChange={handleInputChange}
              className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
            >
              <option value="">Select Market</option>
              {window.markets.map((market) => (
                <option key={market} value={market}>
                  {market}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Profit/Loss ($)</label>
            <input
              type="number"
              name="profitLossDollar"
              value={formData.profitLossDollar}
              onChange={handleInputChange}
              placeholder="Enter profit/loss"
              className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">
              Trade Duration (min)
            </label>
            <input
              type="number"
              name="tradeDuration"
              value={formData.tradeDuration}
              onChange={handleInputChange}
              placeholder="Enter duration"
              className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Stars</label>
            <select
              name="stars"
              value={formData.stars}
              onChange={handleInputChange}
              className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
            >
              {[0, 1, 2, 3, 4, 5].map((star) => (
                <option key={star} value={star}>
                  {star} Star{star !== 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Strategy</label>
            <select
              name="strategy"
              value={formData.strategy}
              onChange={handleInputChange}
              className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
            >
              <option value="">Select Strategy</option>
              {st.map((strategy) => (
                <option key={strategy} value={strategy}>
                  {strategy}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-200"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-gray-400 mb-1">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tg.map((tag) => (
              <span
                key={tag}
                onClick={() => handleTagChange(tag)}
                className={`px-2 py-1 rounded-lg cursor-pointer smooth-transition ${
                  formData.tags.includes(tag)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-600 text-gray-200"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="New tag"
              className="flex-grow p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className={`px-4 py-2 text-white rounded-lg smooth-transition ${
                newTag.trim()
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              Add Tag
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {tg.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-600 text-gray-200 rounded-lg flex items-center"
              >
                {tag}
                <button
                  onClick={() => handleDeleteTag(tag)}
                  className="ml-2 text-red-400 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 smooth-transition"
          >
            {edit !== null ? "Update Trade" : "Add Trade"}
          </button>
          {(edit !== null ||
            formData.market ||
            formData.profitLossDollar ||
            formData.tags.length > 0) && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 smooth-transition"
            >
              Cancel
            </button>
          )}
        </div>
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
                <th className="p-3">Duration (min)</th>
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
                    <td className="p-3">{trade.tradeDuration || "N/A"}</td>
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
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(index)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 smooth-transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
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
