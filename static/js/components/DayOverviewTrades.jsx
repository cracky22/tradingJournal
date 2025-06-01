const { useState } = React;

function DayOverviewTrades({ trades, date, dt, fi, cp }) {
  const [selectedImage, setSelectedImage] = useState(null);

  const openImageViewer = (imageSrc) => {
    console.log(`[openImageViewer] Öffne Bild-Viewer mit Bildquelle:`, imageSrc);
    setSelectedImage(imageSrc);
  };

  const closeImageViewer = (e) => {
    console.log(`[closeImageViewer] Klick Event erkannt. Event Target:`, e.target, 'Current Target:', e.currentTarget);
    if (e.target === e.currentTarget || e.target.className.includes('close')) {
      console.log(`[closeImageViewer] Bedingungen erfüllt, Bild-Viewer wird geschlossen.`);
      setSelectedImage(null);
    } else {
      console.log(`[closeImageViewer] Bedingungen nicht erfüllt, Bild-Viewer bleibt offen.`);
    }
  };

  const handleDelete = (index) => {
    console.log(`[handleDelete] Löschvorgang für Trade mit Index: ${index} gestartet.`);
    if (window.confirm(`Are you sure you want to delete this trade?`)) {
      console.log(`[handleDelete] Benutzer bestätigt Löschung.`);
      dt(date, index);
      console.log(`[handleDelete] Callback dt wurde aufgerufen mit Datum: ${date} und Index: ${index}`);
    } else {
      console.log(`[handleDelete] Benutzer hat Löschung abgebrochen.`);
    }
  };

  console.log(`[DayOverviewTrades] Rendering Trades für Datum: ${date}. Anzahl Trades: ${trades.length}`);

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-300 mb-2">Trades on {date}</h3>
      <div className="space-y-2">
        {trades.map((trade, index) => {
          console.log(`[Rendering Trade] Index: ${index}`, trade);

          const imageSrc = trade.image?.startsWith('data:image')
            ? trade.image
            : trade.image
            ? `data:image/png;base64,${trade.image}`
            : null;

          console.log(`[Rendering Trade] Ermitteltes imageSrc für Index ${index}:`, imageSrc);

          const hasValidImage = !!imageSrc;
          if (!hasValidImage) {
            console.log(`[Rendering Trade] Kein gültiges Bild für Trade Index ${index}`);
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

                {hasValidImage ? (
                  <img
                    src={imageSrc}
                    alt="Trade screenshot"
                    className="w-16 h-16 object-cover rounded mt-2 cursor-pointer"
                    onClick={() => {
                      console.log(`[onClick Bild] Trade Index ${index} Bild angeklickt.`);
                      openImageViewer(imageSrc);
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-600 flex items-center justify-center rounded mt-2 text-white text-xs">
                    No Image
                  </div>
                )}
              </div>
              <button
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => {
                  console.log(`[onClick Delete] Trade Index ${index} Löschen-Button geklickt.`);
                  handleDelete(index);
                }}
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
          onClick={(e) => {
            console.log(`[Image Viewer] Klick auf Overlay erkannt.`);
            closeImageViewer(e);
          }}
        >
          <div className="relative">
            <img
              src={selectedImage}
              alt="Full-size trade screenshot"
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
            <button
              className="absolute top-2 right-2 text-white text-2xl close"
              onClick={(e) => {
                console.log(`[Image Viewer] Klick auf Close-Button erkannt.`);
                closeImageViewer(e);
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
