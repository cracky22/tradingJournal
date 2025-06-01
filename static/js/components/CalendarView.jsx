const { useState, useEffect } = React;

function CalendarView({ t, d, sd, cp, fi }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(d).getMonth());
  const [currentYear, setCurrentYear] = useState(new Date(d).getFullYear());
  const [dayTrades, setDayTrades] = useState(t[d] || []);
  const [images, setImages] = useState({});

  // Update trades for the selected day whenever t or d changes
  useEffect(() => {
    setDayTrades(t[d] || []);
  }, [t, d]);

  // Fetch images for trades of the selected day
  useEffect(() => {
    const loadImages = async () => {
      const newImages = {};
      const trades = t[d] || [];
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
  }, [t, d, cp, fi, images]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, () => null);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const newMonth = prev === 0 ? 11 : prev - 1;
      setCurrentYear((prevYear) => (newMonth === 11 ? prevYear - 1 : prevYear));
      return newMonth;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const newMonth = prev === 11 ? 0 : prev + 1;
      setCurrentYear((prevYear) => (newMonth === 0 ? prevYear + 1 : prevYear));
      return newMonth;
    });
  };

  const handleDayClick = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    sd(dateStr);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Calendar</h2>

      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePrevMonth}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 smooth-transition"
        >
          Previous
        </button>
        <h3 className="text-lg font-semibold text-gray-300">
          {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={handleNextMonth}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 smooth-transition"
        >
          Next
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-gray-400 font-semibold">
            {day}
          </div>
        ))}
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} className="p-2"></div>
        ))}
        {days.map((day) => {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const hasTrades = t[dateStr] && t[dateStr].length > 0;
          const isSelected = d === dateStr;
          return (
            <div
              key={day}
              onClick={() => handleDayClick(day)}
              className={`p-2 rounded-lg cursor-pointer smooth-transition ${
                isSelected ? 'bg-blue-600 text-white' : hasTrades ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-200'
              } hover:bg-blue-500`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Trades for Selected Day */}
      {dayTrades.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Trades on {d}</h3>
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
                </tr>
              </thead>
              <tbody>
                {dayTrades.map((trade, index) => {
                  const imageKey = `${d}-${index}`;
                  return (
                    <tr key={imageKey} className="border-t border-gray-600 hover:bg-gray-700">
                      <td className="p-3">{trade.market || 'N/A'}</td>
                      <td className="p-3" style={{ color: trade.profitLossDollar >= 0 ? '#22c55e' : '#ef4444' }}>
                        {trade.profitLossDollar?.toFixed(2) || '0.00'}
                      </td>
                      <td className="p-3">{trade.tags?.join(', ') || 'None'}</td>
                      <td className="p-3">{trade.stars || 0} ⭐</td>
                      <td className="p-3">{trade.strategy || 'N/A'}</td>
                      <td className="p-3">{trade.tradeDuration || 'N/A'}</td>
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
                          'No Image'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        d && <p className="mt-6 text-gray-400">No trades for {d}.</p>
      )}
    </div>
  );
}