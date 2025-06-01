const { useState } = React;

function CalendarView({
  t, d, sd, gp, m, y, sm, sy, so
}) {
  const [selectedImage, setSelectedImage] = useState(null);

  const getCalendarDays = () => {
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const startDay = firstDay.getDay() || 7;
    const totalDays = lastDay.getDate();
    const days = [];

    for (let i = 1; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ date: dateStr, profit: gp(dateStr) });
    }

    return days;
  };

  const handlePrevMonth = () => {
    if (m === 0) {
      sm(11);
      sy(y - 1);
    } else {
      sm(m - 1);
    }
  };

  const handleNextMonth = () => {
    if (m === 11) {
      sm(0);
      sy(y + 1);
    } else {
      sm(m + 1);
    }
  };

  const handleDayClick = (date) => {
    sd(date);
    so(date);
  };

  const openImageViewer = (imageSrc) => {
    setSelectedImage(imageSrc);
  };

  const closeImageViewer = (e) => {
    if (e.target === e.currentTarget || e.target.className.includes('close')) {
      setSelectedImage(null);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Use the current date as default if no day is selected
  const currentDate = d || `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m, 1).getDate()).padStart(2, '0')}`;
  const dayTrades = t[currentDate] || [];

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg relative">
      <h2 className="text-2xl font-bold text-white mb-4">Calendar</h2>

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePrevMonth}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
        >
          Previous
        </button>
        <h3 className="text-xl font-semibold text-white">
          {monthNames[m]} {y}
        </h3>
        <button
          onClick={handleNextMonth}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-gray-400 font-semibold p-2">
            {day}
          </div>
        ))}

        {getCalendarDays().map((day, index) => (
          <div
            key={index}
            onClick={() => day && handleDayClick(day.date)}
            className={`p-2 text-center rounded-lg transition-colors ${
              day
                ? day.profit !== 0
                  ? day.profit > 0
                    ? 'bg-green-600 hover:bg-green-500 cursor-pointer'
                    : 'bg-red-600 hover:bg-red-500 cursor-pointer'
                  : 'bg-gray-700 hover:bg-gray-600 cursor-pointer'
                : 'bg-gray-900'
            } ${day && day.date === d ? 'ring-2 ring-blue-500' : ''}`}
          >
            {day && (
              <>
                <div className="text-white">{new Date(day.date).getDate()}</div>
                {day.profit !== 0 && (
                  <div
                    className="text-sm"
                    style={{ color: day.profit > 0 ? '#22c55e' : '#ef4444' }}
                  >
                    ${day.profit.toFixed(2)}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Trades Table for Current or Selected Day */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Trades on {currentDate}</h3>
        {dayTrades.length > 0 ? (
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
                {dayTrades.map((trade, index) => {
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
                          onClick={() => {/* Implement delete logic if needed */}}
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
          <p className="mt-2 text-gray-400">No trades for {currentDate}.</p>
        )}
      </div>

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