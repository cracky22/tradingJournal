const { useState } = React;

function CalendarView({
  t, d, sd, gp, m, y, sm, sy, so
}) {
  const [selectedImage, setSelectedImage] = useState(null);

  const getCalendarDays = () => {
    console.log(`[getCalendarDays] Generating calendar for year=${y}, month=${m}`);
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const startDay = firstDay.getDay() || 7;
    const totalDays = lastDay.getDate();
    console.log(`[getCalendarDays] firstDay: ${firstDay}, lastDay: ${lastDay}, startDay: ${startDay}, totalDays: ${totalDays}`);

    const days = [];

    for (let i = 1; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const profit = gp(dateStr);
      console.log(`[getCalendarDays] Adding day ${dateStr} with profit ${profit}`);
      days.push({ date: dateStr, profit });
    }

    console.log(`[getCalendarDays] Total days generated: ${days.length}`);
    return days;
  };

  const handlePrevMonth = () => {
    console.log(`[handlePrevMonth] Current month: ${m}, year: ${y}`);
    if (m === 0) {
      console.log('[handlePrevMonth] Switching to December of previous year');
      sm(11);
      sy(y - 1);
    } else {
      console.log(`[handlePrevMonth] Switching to month: ${m - 1}`);
      sm(m - 1);
    }
  };

  const handleNextMonth = () => {
    console.log(`[handleNextMonth] Current month: ${m}, year: ${y}`);
    if (m === 11) {
      console.log('[handleNextMonth] Switching to January of next year');
      sm(0);
      sy(y + 1);
    } else {
      console.log(`[handleNextMonth] Switching to month: ${m + 1}`);
      sm(m + 1);
    }
  };

  const handleDayClick = (date) => {
    console.log(`[handleDayClick] Day clicked: ${date}`);
    sd(date);
    so(date); // Nur das Datum setzen
  };

  const openImageViewer = (imageSrc) => {
    console.log(`[openImageViewer] Opening image viewer for image source: ${imageSrc.substring(0, 30)}...`);
    setSelectedImage(imageSrc);
  };

  const closeImageViewer = (e) => {
    console.log(`[closeImageViewer] Event target class: ${e.target.className}`);
    if (e.target === e.currentTarget || e.target.className.includes('close')) {
      console.log('[closeImageViewer] Closing image viewer');
      setSelectedImage(null);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Use the current date as default if no day is selected
  const currentDate = d || `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m, 1).getDate()).padStart(2, '0')}`;
  console.log(`[render] Current date for trades: ${currentDate}`);
  const dayTrades = t[currentDate] || [];
  console.log(`[render] Number of trades on ${currentDate}: ${dayTrades.length}`);

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
            onClick={() => {
              if (day) {
                console.log(`[CalendarDay] Clicked day: ${day.date}, profit: ${day.profit}`);
                handleDayClick(day.date);
              } else {
                console.log(`[CalendarDay] Clicked empty day slot at index: ${index}`);
              }
            }}
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

      {/* Trades for Current or Selected Day */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Trades on {currentDate}</h3>
        <div className="space-y-2">
          {dayTrades.map((trade, index) => {
            const hasValidImage =
              trade.image &&
              (trade.image.startsWith('data:image') || /^[A-Za-z0-9+/=]+$/.test(trade.image));
            const imageSrc =
              trade.image && !trade.image.startsWith('data:image')
                ? `data:image/png;base64,${trade.image}`
                : trade.image;

            console.log(`[trade ${index}] Market: ${trade.market}, Profit/Loss: ${trade.profitLossDollar}, Has image: ${hasValidImage}`);

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
                      onClick={() => openImageViewer(imageSrc)}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-600 flex items-center justify-center rounded mt-2 text-white text-xs">
                      No Image
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {dayTrades.length === 0 && (
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
