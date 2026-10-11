import { t, useLanguage } from "../i18n";
import antennaMark from "../../icon.png";
import React, { useMemo, useState } from "react";
import {
  TvIcon,
  FolderIcon,
  LinkIcon,
  FilmIcon,
  MonitorIcon,
} from "../components/Icons";
import Billboard from "../components/Billboard";
import Shelf from "../components/Shelf";
import PreviewCard from "../components/PreviewCard";

function WelcomeLogo() {
  return (
    <img
      className="welcome-logo"
      src={antennaMark}
      width="88"
      height="88"
      alt=""
    />
  );
}

function FeatureItem({ icon, title, desc }) {
  useLanguage();
  return (
    <div className="welcome-feature">
      <div className="welcome-feature-icon">{icon}</div>
      <div>
        <div className="welcome-feature-title">{title}</div>
        <div className="welcome-feature-desc">{desc}</div>
      </div>
    </div>
  );
}

function HomePage({
  channels,
  movies,
  series,
  onPlay,
  onPlayLive,
  onNavigate,
  onOpenFile,
  onOpenURL,
  onOpenSeries,
  onOpenSearch,
  hasContent,
  watchProgress,
  favorites,
  onToggleFav,
}) {
  useLanguage();
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const highlights = useMemo(() => {
    const picks = [];
    for (let i = 0; i < 3; i++) {
      if (movies[i]) picks.push({ ...movies[i], kind: "movie" });
      if (series[i]) picks.push({ ...series[i], kind: "series" });
    }
    return picks;
  }, [movies, series]);
  const topRated = useMemo(
    () =>
      [...movies]
        .filter((m) => Number(m.rating) > 0)
        .sort((a, b) => Number(b.rating) - Number(a.rating))
        .slice(0, 10),
    [movies],
  );
  const favoriteChannels = useMemo(
    () => channels.filter((c) => favorites?.[c.url || c.streamId]).slice(0, 20),
    [channels, favorites],
  );
  // Resume movies and the most recent unfinished episode of each series.
  const continueItems = useMemo(() => {
    if (!watchProgress) return [];
    const items = [];
    for (const m of movies) {
      const p = watchProgress[m.url];
      if (p && p.position > 30 && p.position < p.duration * 0.95) {
        items.push({ ...m, progress: p, type: "movie" });
      }
    }
    for (const show of series) {
      const progress = Object.values(watchProgress)
        .filter(
          (p) =>
            String(p.seriesId) === String(show.seriesId) &&
            p.position > 30 &&
            p.position < p.duration * 0.95,
        )
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
      if (progress) items.push({ ...show, progress, type: "series" });
    }
    items.sort(
      (a, b) => (b.progress.updatedAt || 0) - (a.progress.updatedAt || 0),
    );
    return items.slice(0, 10);
  }, [watchProgress, movies, series]);

  // Top movie genre rows — first 6 distinct groups, with their (capped) items.
  // Built in a SINGLE pass over `movies` and memoized: the old code re-ran a
  // full `movies.filter()` per genre on every render (6× full-array scans of a
  // multi-thousand-item list), a real source of render/navigation jank.
  const movieGenreShelves = useMemo(() => {
    const order = [];
    const byGroup = new Map();
    for (const m of movies) {
      if (!m.group) continue;
      let bucket = byGroup.get(m.group);
      if (!bucket) {
        if (order.length >= 6) continue;
        bucket = [];
        byGroup.set(m.group, bucket);
        order.push(m.group);
      }
      if (bucket.length < 20) bucket.push(m);
    }
    return order.map((g) => ({ group: g, items: byGroup.get(g) }));
  }, [movies]);

  // Top series genre rows — first 4 distinct groups, same single-pass build.
  const seriesGenreShelves = useMemo(() => {
    const order = [];
    const byGroup = new Map();
    for (const s of series) {
      if (!s.group) continue;
      let bucket = byGroup.get(s.group);
      if (!bucket) {
        if (order.length >= 4) continue;
        bucket = [];
        byGroup.set(s.group, bucket);
        order.push(s.group);
      }
      if (bucket.length < 20) bucket.push(s);
    }
    return order.map((g) => ({ group: g, items: byGroup.get(g) }));
  }, [series]);

  if (!hasContent) {
    return (
      <div className="welcome-page fade-in">
        <div className="welcome-hero">
          <WelcomeLogo />
          <h1 className="welcome-title">Antenna</h1>
          <p className="welcome-sub">{t("Your screen. Your stories.")}</p>
          <div className="welcome-actions">
            <button className="btn btn-primary btn-lg" onClick={onOpenURL}>
              <LinkIcon />
              {t("Add Playlist URL")}
            </button>
            <button className="btn btn-secondary btn-lg" onClick={onOpenFile}>
              <FolderIcon />
              {t("Open M3U File")}
            </button>
          </div>
        </div>

        <div className="welcome-features">
          <FeatureItem
            icon={<MonitorIcon />}
            title={t("Live TV")}
            desc={t("Your channels, always close.")}
          />

          <FeatureItem
            icon={<FilmIcon />}
            title={t("Movies")}
            desc={t("Browse and stream movies on demand with subtitles")}
          />

          <FeatureItem
            icon={<TvIcon size={22} />}
            title={t("Series")}
            desc={t("Binge your favorite shows with full season support")}
          />
        </div>

        <p className="welcome-hint">
          {t("Connect your Xtream Codes account or M3U playlist to begin.")}
        </p>
      </div>
    );
  }

  const featured = highlights[featuredIndex % (highlights.length || 1)] || null;
  const featuredKind = featured?.kind || "movie";
  const featuredAction = featuredKind === "series" ? onOpenSeries : onPlay;

  const favs = favorites || {};
  const movieIsFav = (m) => !!favs[m.url || m.streamId];
  const seriesIsFav = (s) => !!favs[s.seriesId];

  const renderMovieCard = (m) => (
    <PreviewCard
      item={m}
      kind="movie"
      isFav={movieIsFav(m)}
      progress={m.progress}
      onPlay={onPlay}
      onDetail={onPlay}
      onToggleFav={onToggleFav}
    />
  );

  const renderSeriesCard = (s) => (
    <PreviewCard
      item={s}
      kind="series"
      isFav={seriesIsFav(s)}
      onPlay={onOpenSeries}
      onDetail={onOpenSeries}
      onToggleFav={onToggleFav}
    />
  );

  return (
    <div className="home-dashboard fade-in">
      <Billboard
        item={featured}
        kind={featuredKind}
        onPlay={featuredAction}
        onMoreInfo={featuredAction}
        onToggleFav={onToggleFav}
        isFav={
          featuredKind === "series"
            ? seriesIsFav(featured || {})
            : movieIsFav(featured || {})
        }
        eyebrow={t("Tonight, something worth watching.")}
      />

      {highlights.length > 1 && (
        <div className="hero-pagination" aria-label={t("Featured titles")}>
          {highlights.map((item, index) => (
            <button
              key={`${item.kind}-${item.id ?? item.seriesId ?? index}`}
              aria-label={item.name}
              aria-pressed={index === featuredIndex % highlights.length}
              className={
                index === featuredIndex % highlights.length ? "active" : ""
              }
              onClick={() => setFeaturedIndex(index)}
            />
          ))}
        </div>
      )}
      {!featured && (
        <div className="home-live-intro">
          <p className="billboard-eyebrow">
            {t("Your channels, always close.")}
          </p>
          <h1>{t("Live TV")}</h1>
          <p>{t("Pick a channel from the list")}</p>
        </div>
      )}
      <div className="home-shelves">
        <Shelf
          title={t("Continue Watching")}
          items={continueItems}
          renderItem={(item) =>
            item.type === "series" ? (
              <PreviewCard
                item={item}
                kind="series"
                progress={item.progress}
                isFav={seriesIsFav(item)}
                onPlay={onOpenSeries}
                onDetail={onOpenSeries}
                onToggleFav={onToggleFav}
              />
            ) : (
              renderMovieCard(item)
            )
          }
        />

        <Shelf
          title={t("Recently Added Movies")}
          items={movies.slice(0, 20)}
          renderItem={renderMovieCard}
          onSeeAll={() => onNavigate("movies")}
        />

        <Shelf
          title={t("Recently Added Series")}
          items={series.slice(0, 20)}
          renderItem={renderSeriesCard}
          onSeeAll={() => onNavigate("series")}
        />

        <Shelf
          title={t("Highest rated in your library")}
          items={topRated}
          renderItem={(m, index) => (
            <div className="ranked-card">
              <span className="rank-number">{index + 1}</span>
              {renderMovieCard(m)}
            </div>
          )}
          onSeeAll={() => onNavigate("movies")}
        />
        <Shelf
          title={t(
            favoriteChannels.length ? "Your favorite channels" : "Live TV",
          )}
          items={
            favoriteChannels.length ? favoriteChannels : channels.slice(0, 20)
          }
          renderItem={(ch) => (
            <button className="home-live-card" onClick={() => onPlayLive(ch)}>
              <span className="live-dot">{t("LIVE")}</span>
              {ch.logo && <img src={ch.logo} alt="" loading="lazy" />}
              <span>{ch.name}</span>
            </button>
          )}
          onSeeAll={() => onNavigate("live")}
        />
        {movieGenreShelves.map(({ group, items }) => (
          <Shelf
            key={`mg-${group}`}
            title={t(group)}
            items={items}
            renderItem={renderMovieCard}
            onSeeAll={() => onNavigate("movies")}
          />
        ))}

        {seriesGenreShelves.map(({ group, items }) => (
          <Shelf
            key={`sg-${group}`}
            title={t(group)}
            items={items}
            renderItem={renderSeriesCard}
            onSeeAll={() => onNavigate("series")}
          />
        ))}
      </div>
    </div>
  );
}

export default React.memo(HomePage);
