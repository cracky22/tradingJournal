const { useState } = React;

function StrategiesView({
  strategies, // Array of available strategies (e.g., ['Trendfolge', 'Volumen', ...])
  addStrategy, // Function to add a new strategy
  delStrategy // Function to delete a strategy
}) {
  const [newStrategy, setNewStrategy] = useState('');

  const handleAddStrategy = () => {
    const trimmedStrategy = newStrategy.trim();
    if (trimmedStrategy && !strategies.includes(trimmedStrategy)) {
      addStrategy(trimmedStrategy);
      setNewStrategy('');
    } else if (strategies.includes(trimmedStrategy)) {
      alert('Strategy already exists.');
    }
  };

  const handleDeleteStrategy = (strategy) => {
    if (window.confirm(`Are you sure you want to delete the strategy "${strategy}"?`)) {
      delStrategy(strategy);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddStrategy();
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Strategies</h2>

      {/* Add New Strategy */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={newStrategy}
          onChange={(e) => setNewStrategy(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter new strategy name"
          className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 smooth-transition"
          aria-label="New strategy name"
        />
        <button
          onClick={handleAddStrategy}
          disabled={!newStrategy.trim()}
          className={`px-4 py-2 text-white rounded-lg smooth-transition ${
            newStrategy.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'
          }`}
        >
          Add Strategy
        </button>
      </div>

      {/* Strategies List */}
      {strategies.length > 0 ? (
        <ul className="space-y-2">
          {strategies.map((strategy) => (
            <li
              key={strategy}
              className="flex justify-between items-center p-3 bg-gray-700 rounded-lg"
            >
              <span className="text-gray-200">{strategy}</span>
              <button
                onClick={() => handleDeleteStrategy(strategy)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 smooth-transition"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400">No strategies available.</p>
      )}
    </div>
  );
}