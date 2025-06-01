const { useState, useEffect } = React;

function ProfilesView() {
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/profiles'); // Passe die API-URL an
      if (!response.ok) {
        throw new Error('Netzwerkfehler beim Laden der Profile');
      }
      const data = await response.json();
      setProfiles(data);
      setIsLoading(false);
    } catch (err) {
      console.error('Fehler beim Laden der Profile:', err);
      setError('Fehler beim Laden der Profile. Bitte versuche es erneut.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleRetry = () => {
    loadProfiles();
  };

  if (isLoading) {
    return <div className="text-gray-400">Loading profiles...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        {error}
        <button
          onClick={handleRetry}
          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 smooth-transition"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Profiles</h2>
      {profiles.length > 0 ? (
        <div className="space-y-4">
          {profiles.map((profile, index) => (
            <div key={index} className="bg-gray-700 p-4 rounded-lg shadow">
              <p className="text-white">{profile.name || 'Unnamed Profile'}</p>
              <p className="text-gray-400 text-sm">{profile.description || 'No description'}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400">No profiles found.</p>
      )}
    </div>
  );
}