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
      <div className="space-y-2">
        {trades.map((trade, index) => {
          // Debugging: Überprüfe die image-Daten
          console.log(`Trade ${index} image data:`, trade.image);

          // Bildverarbeitung mit erweiterten Überprüfungen
          let hasValidImage = false;
          let imageSrc = null;
          if (trade.image) {
            if (typeof trade.image === 'string') {
              if (trade.image.startsWith('data:image')) {
                hasValidImage = true;
                imageSrc = trade.image;
              } else if (/^[A-Za-z0-9+/=]+$/.test(trade.image)) {
                hasValidImage = true;
                imageSrc = `data:image/png;base64,${trade.image}`;
              } else {
                console.warn(`Trade ${index} image format not recognized:`, trade.image);
              }
            } else {
              console.warn(`Trade ${index} image is not a string:`, trade.image);
            }
          } else {
            console.log(`Trade ${index} has no image data.`);
          }

          return (
            <div
              key={index}
              className="bg-gray-700 p-3 rounded-lg shadow flex justify-between items-center"
            >
              <div>
                <p className="text-white">
                  {trade.market || 'N/A'} - ${trade.profitLossDollar?.toFixed(2) || '0.00'}
                </p>
                <p className="text-gray-400 text-sm">{trade.strategy || 'N/A'}</p>
                <p className="text-gray-400 text-xs">Tags: {trade.tags?.join(', ') || 'None'}</p>
                <p className="text-gray-400 text-xs">Stars: {Array(trade.stars || 0).fill('⭐').join('') || '0 ⭐'}</p>

                {hasValidImage && imageSrc ? (
                  <img
                    src={imageSrc}
                    alt="Trade screenshot"
                    className="w-16 h-16 object-cover rounded mt-2 cursor-pointer"
                    onClick={() => openImageViewer(imageSrc)}
                    onError={(e) => {
                      console.error(`Failed to load image for trade ${index}: ${imageSrc}`);
                      e.target.style.display = 'none'; // Verstecke fehlerhaftes Bild
                      e.target.nextSibling.style.display = 'block'; // Zeige "No Image" an
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-600 flex items-center justify-center rounded mt-2 text-white text-xs">
                    No Image
                  </div>
                )}
              </div>
              <button
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 smooth-transition"
                onClick={() => handleDelete(index)}
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
      {trades.length === 0 && (
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