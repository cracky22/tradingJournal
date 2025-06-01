async function fetchImage(profile, date, index) {
  try {
    const response = await fetch(`/api/get_image/${encodeURIComponent(profile)}/${encodeURIComponent(date)}/${index}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.image || null;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}