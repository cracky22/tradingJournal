const { useState, useEffect } = React;

function CalendarView({
  t, // trades: Object containing trades for the current profile
  d, // date: Selected date (string, e.g., "2025-06-01")
  sd, // setDate: Function to set selected date
  gp, // getProfit: Function to calculate profit for a day
  m, // month: Current month (0-11)
  y, // year: Current year (e.g., 2025)
  sm, // setMonth: Function to set month
  sy, // setYear: Function to set year
  so // setOvDate: Function to set overview date (navigate to DayOverview)
}) {
  // Generate calendar days for the current month
  const getCalendarDays = () => {
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const startDay = firstDay.getDay() || 7; // Adjust Sunday to 7
    const totalDays = lastDay.getDate();
    const days = [];

    // Add empty slots for days before the 1st
    for (let i = 1; i < startDay; i++) {
      days.push(null);
    }

    // Add days of the month
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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Use t[d] directly in render to ensure real-time updates
  const dayTrades = t[d] || [];

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Calendar</h2>
      
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePrevMonth}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 smooth-transition"
        >
          Previous
        </button>
        <h3 className="text-xl font-semibold text-white">
          {monthNames[m]} {y}
        </h3>
        <button
          onClick={handleNextMonth}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 smooth-transition"
        >
          Next
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Names */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-gray-400 font-semibold p-2">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {getCalendarDays().map((day, index) => (
          <div
            key={index}
            onClick={() => day && handleDayClick(day.date)}
            className={`p-2 text-center rounded-lg smooth-transition ${
              day
                ? day.profit !== 0
                  ? day.profit > 0
                    ? 'bg-green-600 hover:bg-green-500 cursor-pointer'
                    : 'bg-red-600 hover:bg-red-500 cursor-pointer'
                  : 'bg-gray-700 hover:bg-gray-600 cursor-pointer'
                : 'bg-gray-900'
            } ${day && day.date === d ? 'ring-2 ring-blue-500' : ''}`}
          >
            {day ? (
              <>
                <div className="text-white">{new Date(day.date).getDate()}</div>
                {day.profit !== 0 && (
                  <div className="text-sm" style={{ color: day.profit > 0 ? '#22c55e' : '#ef4444' }}>
                    ${day.profit.toFixed(2)}
                  </div>
                )}
              </>
            ) : null}
          </div>
        ))}
      </div>

      {/* Trades for Selected Day */}
      {d && dayTrades.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Trades on {d}</h3>
          <div className="space-y-2">
            {dayTrades.map((trade, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded-lg shadow flex justify-between items-center">
                <div>
                  <p className="text-white">{trade.market || 'N/A'} - ${trade.profitLossDollar?.toFixed(2) || '0.00'}</p>
                  <p className="text-gray-400 text-sm">{trade.strategy || 'N/A'}</p>
                  {trade.image && (
                    <img
                      src={`data:image/png;base64,${trade.image}`}
                      alt="Trade screenshot"
                      className="w-16 h-16 object-cover rounded mt-2"
                      onError={() => console.error(`Failed to load image for trade ${index} on ${d}`)}
                    />
                  )}
                </div>
                <div className="flex space-x-2">
                  {/* Placeholder for future delete functionality if needed */}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {d && dayTrades.length === 0 && (
        <p className="mt-6 text-gray-400">No trades for {d}.</p>
      )}
    </div>
  );
}