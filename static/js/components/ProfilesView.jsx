const { useState, useEffect } = React;

function ProfilesView({ loadProfiles }) {
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfiles = async () => {
    console.log('[ProfilesView] Starte fetchProfiles');
    try {
      setIsLoading(true);
      setError(null);
      console.log('[ProfilesView] setIsLoading(true), setError(null)');
      
      const profilesData = await loadProfiles();
      console.log('[ProfilesView] Profiles geladen:', profilesData);

      setProfiles(profilesData);
      setIsLoading(false);
      console.log('[ProfilesView] setProfiles und setIsLoading(false) abgeschlossen');
    } catch (err) {
      console.error('[ProfilesView] Fehler beim Laden der Profile:', err);
      setError('Fehler beim Laden der Profile. Bitte versuche es erneut.');
      setIsLoading(false);
      console.log('[ProfilesView] setError und setIsLoading(false) nach Fehler');
    }
  };

  useEffect(() => {
    console.log('[ProfilesView] useEffect gestartet, loadProfiles geändert oder initial');
    fetchProfiles();
  }, [loadProfiles]);

  const handleRetry = () => {
    console.log('[ProfilesView] Retry Button gedrückt, versuche Profile neu zu laden');
    fetchProfiles();
  };

  if (isLoading) {
    console.log('[ProfilesView] Rendering: Loading State');
    return <div className="text-gray-400">Loading profiles...</div>;
  }

  if (error) {
    console.log('[ProfilesView] Rendering: Error State:', error);
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

  console.log('[ProfilesView] Rendering: Profile Liste mit', profiles.length, 'Elementen');
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Profiles</h2>
      {profiles.length > 0 ? (
        <div className="space-y-4">
          {profiles.map((profile, index) => {
            console.log(`[ProfilesView] Render Profil #${index}:`, profile);
            return (
              <div key={index} className="bg-gray-700 p-4 rounded-lg shadow">
                <p className="text-white">{profile.name || 'Unnamed Profile'}</p>
                <p className="text-gray-400 text-sm">{profile.description || 'No description'}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-400">No profiles found.</p>
      )}
    </div>
  );
}
