const { useState } = React;

function DayOverviewTrades({ trades, date, dt, fi, cp }) {
  const [selectedImage, setSelectedImage] = useState(null);

  const openImageViewer = (imageSrc) => {
    setSelectedImage(imageSrc);
  };

  const closeImageViewer = (e) => {
    if (e.target === e.currentTarget || e.target.className.includes('close')) {
      setSelectedImage(null);
    }
  };

  const handleDelete = (index) => {
    if (window.confirm(`Are you sure you want to delete this trade?`)) {
      dt(date, index);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-300 mb-2">Trades on {date}</h3>
      {trades.length > 0 ? (
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
                const hasValidImage =
                  trade.image &&
                  (trade.image.startsWith('data:image') || /^[A-Za-z0-9+/=]+$/.test(trade.image));
                const imageSrc =
                  trade.image && !trade.image.startsWith('data:image')
                    ? `data:image/png;base64,${trade.image}`
                    : trade.image;

                return (
                  <tr key={index} className="border-t border-gray-600 hover:bg-gray-700">
                    <td className="p-3">{trade.market || 'N/A'}</td>
                    <td
                      className="p-3"
                      style={{
                        color: trade.profitLossDollar >= 0 ? '#22c55e' : '#ef4444',
                      }}
                    >
                      ${trade.profitLossDollar?.toFixed(2) || '0.00'}
                    </td>
                    <td className="p-3">{trade.tags?.join(', ') || 'None'}</td>
                    <td className="p-3">
                      {Array(trade.stars || 0)
                        .fill('⭐')
                        .join('') || '0 ⭐'}
                    </td>
                    <td className="p-3">{trade.strategy || 'N/A'}</td>
                    <td className="p-3">
                      {hasValidImage ? (
                        <img
                          src={imageSrc}
                          alt="Trade screenshot"
                          className="w-16 h-16 object-cover rounded cursor-pointer"
                          onClick={() => openImageViewer(imageSrc)}
                        />
                      ) : (
                        'No Image'
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 smooth-transition"
                        onClick={() => handleDelete(index)}
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
      ) : (
        <p className="mt-2 text-gray-400">No trades for {date}.</p>
      )}

      {/* Image Viewer */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closeImageViewer}
        >
          <div className="relative">
            <img
              src={selectedImage}
              alt="Full-size trade screenshot"
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
            <button
              className="absolute top-2 right-2 text-white text-2xl close"
              onClick={closeImageViewer}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}