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
  const [images, setImages] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);

  // Load trades for the selected date directly from props
  const dayTrades = t[d] || [];
  console.log(`[TradesView] Loaded trades for date ${d}:`, dayTrades);

  // Preload images from trade data
  useEffect(() => {
    console.log("[TradesView] Preloading images for dayTrades", dayTrades);
    const newImages = {};
    dayTrades.forEach((trade, i) => {
      const key = `${d}-${i}`;
      if (trade.image && !(key in images)) {
        newImages[key] = `data:image/png;base64,${trade.image}`;
        console.log(`[TradesView] Preloading image for trade ${key}`);
      }
    });
    if (Object.keys(newImages).length > 0) {
      setImages((prev) => ({ ...prev, ...newImages }));
      console.log("[TradesView] Images updated with new preloaded images:", newImages);
    } else {
      console.log("[TradesView] No new images to preload");
    }
  }, [dayTrades, d]);

  // Populate form for editing
  useEffect(() => {
    if (edit !== null && dayTrades[edit]) {
      console.log(`[TradesView] Editing trade index ${edit}`, dayTrades[edit]);
      setFormData({
        market: dayTrades[edit].market || "",
        profitLossDollar: dayTrades[edit].profitLossDollar || "",
        tags: dayTrades[edit].tags || [],
        stars: dayTrades[edit].stars || 0,
        strategy: dayTrades[edit].strategy || "",
        tradeDuration: dayTrades[edit].tradeDuration || "",
        image: null,
      });
    } else {
      console.log("[TradesView] Resetting form for new trade");
      setFormData({
        market: "",
        profitLossDollar: "",
        tags: [],
        stars: 0,
        strategy: "",
        tradeDuration: "",
        image: null,
      });
    }
  }, [edit, dayTrades]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`[TradesView] Input changed - ${name}: ${value}`);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagChange = (tag) => {
    setFormData((prev) => {
      const newTags = prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag];
      console.log(`[TradesView] Tag ${tag} toggled. New tags:`, newTags);
      return { ...prev, tags: newTags };
    });
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    console.log(`[TradesView] Adding new tag: "${trimmedTag}"`);
    if (trimmedTag && !tg.includes(trimmedTag)) {
      ag(trimmedTag);
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmedTag] }));
      setNewTag("");
      console.log(`[TradesView] Tag "${trimmedTag}" added.`);
    } else if (tg.includes(trimmedTag)) {
      console.warn(`[TradesView] Tag "${trimmedTag}" already exists.`);
      alert("Tag already exists.");
    }
  };

  const handleDeleteTag = (tag) => {
    console.log(`[TradesView] Request to delete tag "${tag}"`);
    if (window.confirm(`Are you sure you want to delete the tag "${tag}"?`)) {
      dg(tag);
      setFormData((prev) => ({
        ...prev,
        tags: prev.tags.filter((t) => t !== tag),
      }));
      console.log(`[TradesView] Tag "${tag}" deleted.`);
    } else {
      console.log(`[TradesView] Deletion of tag "${tag}" cancelled.`);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log("[TradesView] Image file selected:", file.name, file.size, file.type);
      setFormData((prev) => ({ ...prev, image: file }));
    } else {
      console.log("[TradesView] No image file selected.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("[TradesView] Submitting trade with formData:", formData);

    const trade = {
      date: d,
      market: formData.market,
      profitLossDollar: parseFloat(formData.profitLossDollar) || 0,
      tags: formData.tags,
      stars: parseInt(formData.stars) || 0,
      strategy: formData.strategy,
      tradeDuration: parseFloat(formData.tradeDuration) || 0,
      image: formData.image ? await convertImageToBase64(formData.image) : null,
    };

    console.log("[TradesView] Prepared trade object:", trade);

    try {
      if (formData.image) {
        console.log("[TradesView] Uploading image to server...");
        const formDataToSend = new FormData();
        formDataToSend.append("image", formData.image);
        formDataToSend.append("profile", cp);
        formDataToSend.append("date", d);
        formDataToSend.append("index", edit !== null ? edit : dayTrades.length);

        const response = await fetch("/api/upload_image", {
          method: "POST",
          body: formDataToSend,
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[TradesView] Image upload failed:", errorData);
          throw new Error(errorData.error || "Failed to upload image");
        } else {
          console.log("[TradesView] Image upload successful");
        }
      } else {
        console.log("[TradesView] No image to upload");
      }

      if (edit !== null) {
        console.log(`[TradesView] Updating trade at index ${edit}`);
        ut(d, edit, trade);
      } else {
        console.log("[TradesView] Adding new trade");
        at(trade);
      }

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
      console.log("[TradesView] Form reset after submit");
    } catch (error) {
      console.error("[TradesView] Error submitting trade:", error);
      alert(`Failed to submit trade: ${error.message || "Network error"}`);
    }
  };

  const handleEdit = (index) => {
    console.log(`[TradesView] Edit requested for trade index ${index}`);
    setEdit(index);
  };

  const handleDelete = (index) => {
    console.log(`[TradesView] Delete requested for trade index ${index}`);
    if (window.confirm("Are you sure you want to delete this trade?")) {
      dt(d, index);
      console.log(`[TradesView] Trade at index ${index} deleted.`);
    } else {
      console.log("[TradesView] Trade deletion cancelled.");
    }
  };

  const handleCancel = () => {
    console.log("[TradesView] Cancel editing");
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

  // Helper function to convert image to base64
  const convertImageToBase64 = (file) => {
    console.log("[TradesView] Converting image file to base64");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(",")[1]; // Remove data URL prefix
        console.log("[TradesView] Image converted to base64");
        resolve(base64);
      };
      reader.onerror = (error) => {
        console.error("[TradesView] Error converting image to base64:", error);
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  };

  const openImageViewer = (imageSrc) => {
    console.log("[TradesView] Opening image viewer");
    setSelectedImage(imageSrc);
  };

  const closeImageViewer = (e) => {
    if (e.target === e.currentTarget || e.target.className.includes("close")) {
      console.log("[TradesView] Closing image viewer");
      setSelectedImage(null);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg relative">
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
            <label className="block text-gray-400 mb-1">Trade Duration (min)</label>
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
            <label className="block text-gray-400 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tg.map((tag) => (
                <span
                  key={tag}
                  onClick={() => handleTagChange(tag)}
                  className={`inline-block px-3 py-1 rounded-full cursor-pointer select-none ${
                    formData.tags.includes(tag)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-600 text-gray-300"
                  }`}
                  title={`Click to ${formData.tags.includes(tag) ? "remove" : "add"} tag`}
                >
                  {tag}{" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTag(tag);
                    }}
                    className="ml-1 text-red-400 hover:text-red-600 font-bold"
                    aria-label={`Delete tag ${tag}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="New tag"
                className="p-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-200 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
              />
              <button
                onClick={handleAddTag}
                className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 transition"
              >
                Add Tag
              </button>
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-gray-200"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {edit !== null ? "Update Trade" : "Add Trade"}
          </button>
          {edit !== null && (
            <button
              onClick={handleCancel}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List of Trades */}
      <div>
        {dayTrades.length === 0 ? (
          <p className="text-gray-400">No trades for this date.</p>
        ) : (
          dayTrades.map((trade, index) => {
            const key = `${d}-${index}`;
            const imgSrc = images[key] || (trade.image ? `data:image/png;base64,${trade.image}` : null);
            return (
              <div
                key={key}
                className="mb-4 p-4 bg-gray-700 rounded-lg shadow cursor-pointer hover:bg-gray-600"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-white font-semibold">{trade.market || "Unknown Market"}</h4>
                    <p className="text-gray-300">
                      P/L: ${trade.profitLossDollar?.toFixed(2) ?? "0.00"} | Duration: {trade.tradeDuration ?? "-"} min | Stars: {trade.stars}
                    </p>
                    <p className="text-gray-300">Strategy: {trade.strategy || "None"}</p>
                    <p className="text-gray-300">
                      Tags:{" "}
                      {trade.tags && trade.tags.length > 0 ? trade.tags.join(", ") : "None"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {imgSrc && (
                      <img
                        src={imgSrc}
                        alt="Trade"
                        className="w-16 h-16 object-cover rounded cursor-pointer border border-gray-500"
                        onClick={() => openImageViewer(imgSrc)}
                      />
                    )}
                    <button
                      onClick={() => handleEdit(index)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                      title="Edit trade"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                      title="Delete trade"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={closeImageViewer}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={closeImageViewer}
              className="absolute top-2 right-2 text-white text-3xl font-bold cursor-pointer"
              aria-label="Close image viewer"
            >
              &times;
            </button>
            <img
              src={selectedImage}
              alt="Full view"
              className="max-w-full max-h-screen rounded-lg shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
