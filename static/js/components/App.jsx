const { useState, useEffect } = React;

function App() {
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState("");
  const [trades, setTrades] = useState({});
  const [tags, setTags] = useState([]);
  const [strategies, setStrategies] = useState([
    "Trendfolge",
    "Volumen",
    "Fibonacci",
    "Sweep",
    "Range",
    "RAIN",
  ]);
  const [view, setView] = useState("dashboard");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [edit, setEdit] = useState(null);
  const [allTradesFMkt, setAllTradesFMkt] = useState("All");
  const [allTradesFPrd, setAllTradesFPrd] = useState("All");
  const [allTradesFTag, setAllTradesFTag] = useState("All");
  const [allTradesFStar, setAllTradesFStar] = useState(null);
  const [allTradesFStart, setAllTradesFStart] = useState("");
  const [allTradesFEnd, setAllTradesFEnd] = useState("");
  const [ovDate, setOvDate] = useState(null);
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [newProfileName, setNewProfileName] = useState("Profile 1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from sessionStorage or server
  const loadFromSessionStorage = () => {
    sessionStorage.removeItem("tradingJournalData");
    return false; // Always return false to trigger fetchAllData
  };

  // Save data to sessionStorage
  const saveToSessionStorage = (data) => {
    try {
      sessionStorage.setItem(
        "tradingJournalData",
        JSON.stringify({
          profiles: data.profiles,
          currentProfile: data.currentProfile,
          trades: data.trades,
          tags: data.tags,
          strategies: data.strategies,
        })
      );
    } catch (e) {
      console.error("Error saving to sessionStorage:", e);
    }
  };

  // Fetch all profiles and their data
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const profilesResponse = await fetch("/api/get_profiles", {
        signal: AbortSignal.timeout(10000),
      });
      if (!profilesResponse.ok) {
        const data = await profilesResponse.json().catch(() => {});
        throw new Error(data.error || `HTTP error! Status: ${profilesResponse.status}`);
      }
      const { profiles: profilesList } = await profilesResponse.json();
      const profilesData = profilesList.length > 0 ? profilesList : ["Profile 1"];

      setProfiles(profilesData);
      setCurrentProfile(profilesData[0] || "Profile 1");

      const allData = {
        profiles: profilesData,
        currentProfile: profilesData[0] || "Profile 1",
        trades: {},
        tags: [],
        strategies: [],
      };
      for (const profile of profilesData) {
        const response = await fetch(
          `/api/get_data/${encodeURIComponent(profile)}`,
          {
            signal: AbortSignal.timeout(10000),
          }
        );
        if (!response.ok) {
          const data = await response.json().catch(() => {});
          throw new Error(data.error || `HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        allData.trades[profile] = data.trades || {};
        allData.tags = [...new Set([...allData.tags, ...(data.tags || [])])];
        allData.strategies = [...new Set([...allData.strategies, ...(data.strategies || [])])];
      }

      saveToSessionStorage(allData);
      setTrades(allData.trades);
      setTags(allData.tags);
      setStrategies(allData.strategies);
    } catch (error) {
      console.error("Error fetching all data:", error);
      const fallbackProfiles = ["Profile 1"];
      setProfiles(fallbackProfiles);
      setCurrentProfile(fallbackProfiles[0]);
      setTrades({ "Profile 1": {} });
      setTags([]);
      setStrategies([
        "Trendfolge",
        "Volumen",
        "Fibonacci",
        "Sweep",
        "Range",
        "RAIN",
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (!loadFromSessionStorage()) {
      fetchAllData();
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Parallax effect for background
  useEffect(() => {
    let lastScroll = 0;
    const throttle = (func, wait) => {
      let timeout;
      return (...args) => {
        if (!timeout) {
          timeout = setTimeout(() => {
            timeout = null;
            func(...args);
          }, wait);
        }
      };
    };

    const handleScroll = throttle(() => {
      const parallaxBg = document.querySelector(".parallax-bg");
      const scrollPosition = window.pageYOffset;
      if (parallaxBg) {
        parallaxBg.style.transform = `translate3d(0, ${scrollPosition * 0.5}px, 0)`;
      }
    }, 16);

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleSubmitData = async () => {
    setIsSubmitting(true);
    try {
      const data = {
        profiles: profiles,
        currentProfile: currentProfile,
        trades: trades,
        tags: tags,
        strategies: strategies,
      };
      const response = await fetch("/api/submit_data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit data");
      }
      saveToSessionStorage(data);
      alert("Data submitted successfully");
    } catch (error) {
      alert(`Failed to submit data: ${error.message || "Network error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileChange = async (profile) => {
    if (!profile || !profiles.includes(profile)) {
      console.warn("Invalid profile selection, resetting to default");
      setCurrentProfile(profiles[0] || "Profile 1");
      setView("dashboard");
      setOvDate(null);
      setShowProfileManager(false);
      return;
    }
    console.log(
      `Switching to profile: ${profile}, trades available:`,
      trades[profile]
    );
    setCurrentProfile(profile);
    setView("dashboard");
    setOvDate(null);
    setShowProfileManager(false);
    if (!trades[profile]) {
      try {
        const response = await fetch(
          `/api/get_data/${encodeURIComponent(profile)}`,
          {
            signal: AbortSignal.timeout(10000),
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setTrades((prev) => ({
          ...prev,
          [profile]: data.trades || {},
        }));
        setTags((prev) => [...new Set([...prev, ...(data.tags || [])])]);
        setStrategies((prev) => [
          ...new Set([...prev, ...(data.strategies || [])]),
        ]);
        saveToSessionStorage({
          profiles,
          currentProfile: profile,
          trades: { ...trades, [profile]: data.trades || {} },
          tags: [...new Set([...tags, ...(data.tags || [])])],
          strategies: [...new Set([...strategies, ...(data.strategies || [])])],
        });
      } catch (error) {
        console.error(`Error fetching data for profile ${profile}:`, error);
        setTrades((prev) => ({ ...prev, [profile]: {} }));
      }
    }
  };

  const handleRenameProfile = async () => {
    const name = newProfileName.trim();
    if (!name || name === currentProfile || profiles.includes(name)) return;
    const updatedProfiles = profiles.map((p) =>
      p === currentProfile ? name : p
    );
    const updatedTrades = { ...trades };
    updatedTrades[name] = updatedTrades[currentProfile];
    delete updatedTrades[currentProfile];
    setProfiles(updatedProfiles);
    setCurrentProfile(name);
    setTrades(updatedTrades);
    setShowProfileManager(false);
    await handleSubmitData();
  };

  const handleAddProfile = async () => {
    const name = newProfileName.trim();
    if (!name || profiles.includes(name)) return;
    const updatedProfiles = [...profiles, name];
    setProfiles(updatedProfiles);
    setCurrentProfile(name);
    setTrades({ ...trades, [name]: {} });
    setShowProfileManager(false);
    await handleSubmitData();
  };

  const handleDeleteProfile = async () => {
    if (profiles.length <= 1) return;
    if (
      !window.confirm(
        `Are you sure you want to delete the profile "${currentProfile}"?`
      )
    )
      return;
    const updatedProfiles = profiles.filter((p) => p !== currentProfile);
    const updatedTrades = { ...trades };
    delete updatedTrades[currentProfile];
    setProfiles(updatedProfiles);
    setCurrentProfile(updatedProfiles[0] || "Profile 1");
    setTrades(updatedTrades);
    setShowProfileManager(false);
    await handleSubmitData();
  };

  const addTrade = (t) =>
    setTrades((p) => ({
      ...p,
      [currentProfile]: {
        ...(p[currentProfile] || {}),
        [t.date]: [...(p[currentProfile]?.[t.date] || []), t],
      },
    }));
  const updTrade = (d, i, t) =>
    setTrades((p) => {
      const updated = { ...p };
      updated[currentProfile][d] = updated[currentProfile][d].map((x, j) =>
        j === i ? t : x
      );
      return updated;
    });
  const delTrade = (d, i) =>
    setTrades((p) => {
      const updated = { ...p };
      updated[currentProfile][d] = updated[currentProfile][d].filter(
        (_, j) => j !== i
      );
      if (!updated[currentProfile][d].length) delete updated[currentProfile][d];
      return updated;
    });
  const addTag = (t) => !tags.includes(t) && setTags((prev) => [...prev, t]);
  const delTag = (t) => {
    setTags((prev) => prev.filter((x) => x !== t));
    setTrades((prev) => {
      const updated = { ...prev };
      for (let profile in updated) {
        for (let date in updated[profile]) {
          updated[profile][date] = updated[profile][date].map((trade) => ({
            ...trade,
            tags: trade.tags.filter((tag) => tag !== t),
          }));
        }
      }
      return updated;
    });
  };
  const addStrategy = (s) =>
    !strategies.includes(s) && setStrategies((prev) => [...prev, s]);
  const delStrategy = (s) =>
    setStrategies((prev) => prev.filter((x) => x !== s));
  const getProfit = (d) =>
    (trades[currentProfile]?.[d] || []).reduce(
      (s, t) => s + (t.profitLossDollar || 0),
      0
    ) || 0;
  const getFTrades = () => {
    let f = Object.values(trades[currentProfile] || {})
      .flat()
      .filter((t) => t && typeof t === "object");
    if (allTradesFMkt !== "All")
      f = f.filter((t) => t.market === allTradesFMkt);
    if (allTradesFPrd !== "All") {
      const n = new Date();
      let s;
      if (allTradesFPrd === "Week") {
        s = new Date(n);
        s.setDate(n.getDate() - (n.getDay() || 7) + 1);
      } else {
        s = new Date(
          n.getFullYear(),
          n.getMonth() - { Month: 1, Quarter: 3 }[allTradesFPrd],
          n.getDate()
        );
      }
      f = f.filter((t) => new Date(t.date) >= s && new Date(t.date) <= n);
    }
    if (allTradesFTag !== "All")
      f = f.filter((t) => (t.tags || []).includes(allTradesFTag));
    if (allTradesFStar !== null)
      f = f.filter((t) => (t.stars || 0) === allTradesFStar);
    if (allTradesFStart && allTradesFEnd) {
      f = f.filter(
        (t) =>
          new Date(t.date) >= new Date(allTradesFStart) &&
          new Date(t.date) <= new Date(allTradesFEnd)
      );
    }
    return f;
  };
  const getCData = (t) => {
    if (!Array.isArray(t)) {
      return {
        labels: [],
        datasets: [
          {
            label: "Profit ($)",
            data: [0],
            tradeData: [null],
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "rgb(59, 130, 246)",
            pointBorderColor: "#fff",
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      };
    }
    const s = t.sort((a, b) => new Date(a.date) - new Date(b.date));
    let sum = 0;
    const data = s.length
      ? [0, ...s.map((x) => (sum += x.profitLossDollar || 0))]
      : [0];
    const tradeData = s.length ? [null, ...s] : [null];
    const labels = s.length
      ? ["Start", ...s.map((_, i) => `Trade ${i + 1}`)]
      : ["Start"];
    return {
      labels,
      datasets: [
        {
          label: "Profit ($)",
          data,
          tradeData,
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "rgb(59, 130, 246)",
          pointBorderColor: "#fff",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  };
  const getTimePerfData = (t) => {
    if (!Array.isArray(t)) return { labels: [], datasets: [] };
    const dataPoints = t.map((trade) => ({
      x: trade.tradeDuration || 0,
      y: trade.profitLossDollar || 0,
    }));
    return {
      datasets: [
        {
          label: "Performance by Duration",
          data: dataPoints,
          backgroundColor: dataPoints.map((point) =>
            point.y >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"
          ),
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col sm:flex-row relative">
        <div className="w-full sm:w-16 md:w-56 bg-gray-800 p-4 flex flex-col smooth-transition z-10">
          <h1 className="text-2xl font-bold text-white mb-6 hidden sm:block">
            Trading Journal
          </h1>
          <h1 className="text-xl font-bold text-white mb-4 sm:hidden">TJ</h1>
          {isLoading ? (
            <div className="text-gray-400">Loading profiles...</div>
          ) : (
            <select
              value={currentProfile}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200 mb-4 smooth-transition"
              aria-label="Select profile"
            >
              {profiles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowProfileManager(!showProfileManager)}
            className={`w-full text-left py-2 px-4 rounded-lg smooth-transition ${
              showProfileManager
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-700"
            }`}
          >
            <span className="block sm:truncate">Manage Profiles</span>
          </button>
          {showProfileManager && (
            <div className="mb-4 p-4 bg-gray-700 rounded-lg smooth-transition">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="New profile name"
                className="w-full p-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200 mb-2 smooth-transition"
                aria-label="New profile name"
              />
              <button
                onClick={handleRenameProfile}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-600 mb-2 smooth-transition"
              >
                Rename Profile
              </button>
              <button
                onClick={handleAddProfile}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-600 mb-2 smooth-transition"
              >
                Add New Profile
              </button>
              <button
                onClick={handleDeleteProfile}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-red-700 mb-2 smooth-transition"
              >
                Delete Profile
              </button>
              <button
                onClick={handleSubmitData}
                disabled={isSubmitting}
                className={`w-full px-4 py-2 text-white rounded-lg smooth-transition ${
                  isSubmitting
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {isSubmitting ? "Submitting..." : "Submit Data"}
              </button>
              <button
                onClick={fetchAllData}
                disabled={isLoading}
                className={`w-full px-4 py-2 text-white rounded-lg mt-2 smooth-transition ${
                  isLoading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {isLoading ? "Loading..." : "Refresh Data"}
              </button>
            </div>
          )}
          {["dashboard", "calendar", "trades", "allTrades", "strategies"].map(
            (v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v);
                  setOvDate(null);
                  setShowProfileManager(false);
                }}
                className={`w-full text-left py-2 px-4 rounded-lg smooth-transition ${
                  view === v ? "bg-blue-600 text-white" : "hover:bg-gray-700"
                }`}
              >
                <span className="block sm:truncate">
                  {v === "allTrades"
                    ? "All Trades"
                    : v.charAt(0).toUpperCase() + v.slice(1)}
                </span>
              </button>
            )
          )}
        </div>
        <div className="flex-1 p-6 overflow-y-auto smooth-transition z-10">
          {ovDate && ovDate.date ? (
            <DayOverview
              t={trades[currentProfile] || {}}
              d={ovDate}
              sd={setOvDate}
              gp={getProfit}
              gc={getCData}
              dt={delTrade}
              fi={fetchImage}
              cp={currentProfile}
            />
          ) : (
            <>
              {view === "dashboard" && (
                <DashboardView
                  t={trades[currentProfile] || {}}
                  gc={getCData}
                  gp={getProfit}
                  gf={getFTrades}
                  gtp={getTimePerfData}
                />
              )}
              {view === "calendar" && (
                <CalendarView
                  t={trades[currentProfile] || {}}
                  d={date}
                  sd={setDate}
                  gp={getProfit}
                  m={month}
                  y={year}
                  sm={setMonth}
                  sy={setYear}
                  so={setOvDate}
                />
              )}
              {view === "trades" && (
                <TradesView
                  t={trades[currentProfile] || {}}
                  at={addTrade}
                  ut={updTrade}
                  dt={delTrade}
                  d={date}
                  sd={setDate}
                  tg={tags}
                  ag={addTag}
                  dg={delTag}
                  st={strategies}
                  edit={edit}
                  setEdit={setEdit}
                  fi={fetchImage}
                  cp={currentProfile}
                />
              )}
              {view === "allTrades" && (
                <AllTradesView
                  t={trades[currentProfile] || {}}
                  gf={getFTrades}
                  fs={allTradesFStar}
                  sfs={setAllTradesFStar}
                  fm={allTradesFMkt}
                  sfm={setAllTradesFMkt}
                  ft={allTradesFTag}
                  sft={setAllTradesFTag}
                  fp={allTradesFPrd}
                  sfp={setAllTradesFPrd}
                  fst={allTradesFStart}
                  sfst={setAllTradesFStart}
                  fe={allTradesFEnd}
                  sfe={setAllTradesFEnd}
                  dt={delTrade}
                  tg={tags}
                  st={strategies}
                  fi={fetchImage}
                  cp={currentProfile}
                />
              )}
              {view === "strategies" && (
                <StrategiesView
                  strategies={strategies}
                  addStrategy={addStrategy}
                  delStrategy={delStrategy}
                />
              )}
            </>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}