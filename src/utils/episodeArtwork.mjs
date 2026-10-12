// Xtream providers use several schemas for episode metadata and artwork.
export function episodeInfo(value) {
  if (typeof value === "string") {
    try { return episodeInfo(JSON.parse(value)); } catch { return {}; }
  }
  if (Array.isArray(value)) return episodeInfo(value[0]);
  return value && typeof value === "object" ? value : {};
}

export function episodeArtwork(ep, poster = "", baseUrl = "") {
  const info = episodeInfo(ep?.info);
  const candidates = [];
  const add = (value, tmdb = false) => {
    if (Array.isArray(value)) { value.forEach(v => add(v, tmdb)); return; }
    if (typeof value !== "string") return;
    const raw = value.trim();
    if (!raw || /^(null|undefined|n\/a|0)$/i.test(raw)) return;
    try {
      let url;
      if (raw.startsWith("data:image/")) url = raw;
      else if (raw.startsWith("//")) url = `https:${raw}`;
      else if (raw.startsWith("/") && (tmdb || /^\/[a-zA-Z0-9]{20,}\.(jpg|png|webp)$/i.test(raw))) url = `https://image.tmdb.org/t/p/w780${raw}`;
      else url = new URL(raw, baseUrl || undefined).href;
      if (/^(https?:|data:image\/)/i.test(url) && !candidates.includes(url)) candidates.push(url);
    } catch { /* Missing/invalid provider artwork falls back to the series. */ }
  };
  add(info.movie_image);
  add(info.still_path, true);
  add(info.cover_big);
  add(info.cover);
  add(info.backdrop_path);
  add(info.image);
  add(ep?.movie_image);
  add(ep?.still_path, true);
  add(ep?.cover);
  add(ep?.thumbnail);
  add(poster);
  return candidates;
}

export function normalizeSeasons(value) {
  const seasons = {};
  for (const [season, episodes] of Object.entries(value || {})) {
    if (!Array.isArray(episodes)) continue;
    seasons[season] = episodes.map((ep, index) => ({
      ...ep,
      season: Number(ep.season) || Number(season) || 1,
      episode_num: Number(ep.episode_num) || index + 1,
      info: episodeInfo(ep.info),
    }));
  }
  return seasons;
}
