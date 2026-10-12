import React, { useEffect, useState } from "react";
import { t, useLanguage } from "../i18n";
import EpisodeArtwork from "./EpisodeArtwork";
import { XIcon } from "./Icons";

export default function EpisodesPanel({ channel, episodes, watchProgress, onPlay, onClose }) {
  useLanguage();
  const seasons = [...new Set(episodes.map(ep => String(ep.season || 1)))].sort((a, b) => Number(a) - Number(b));
  const [season, setSeason] = useState(String(channel?.season || seasons[0] || 1));
  useEffect(() => setSeason(String(channel?.season || seasons[0] || 1)), [channel?.seriesId, channel?.season]);
  const selectedSeason = seasons.includes(season) ? season : seasons[0];
  return (
    <section className="mpv-panel mpv-episodes-panel" aria-label={t("Episodes")}>
      <div className="mpv-panel-head">
        <span className="mpv-panel-title">{t("Episodes")}</span>
        <button className="player-ctrl-btn" onClick={onClose} title={t("Close")} aria-label={t("Close")}><XIcon /></button>
      </div>
      <div className="mpv-episodes-heading">
        <strong>{channel?.seriesName}</strong>
        <select aria-label={t("Season")} value={selectedSeason} onChange={e => setSeason(e.target.value)}>
          {seasons.map(s => <option key={s} value={s}>{t("Season")} {s}</option>)}
        </select>
      </div>
      <div className="mpv-panel-list">
        {episodes.filter(ep => String(ep.season || 1) === selectedSeason).map(ep => {
          const current = ep.url === channel?.url;
          const progress = watchProgress?.[ep.url];
          const watched = progress?.duration > 0 && progress.position > progress.duration * .9;
          return (
            <button key={`${ep.season}:${ep.id}:${ep.episodeNum}`} className={`ep-sidebar-item${current ? " active" : ""}`}
              aria-current={current ? "true" : undefined}
              onClick={() => {
                onPlay?.({ ...ep, episodes, seriesName: channel?.seriesName, seriesPoster: channel?.seriesPoster });
                onClose();
              }}>
              <EpisodeArtwork candidates={ep.artwork || [ep.thumb, channel?.seriesPoster]}
                className="ep-sidebar-thumb" fallback={<span className="ep-sidebar-num">E{ep.episodeNum}</span>} />
              <span className="ep-sidebar-info">
                <span className="ep-sidebar-label">S{ep.season || 1}E{ep.episodeNum}</span>
                <span className="ep-sidebar-name">{ep.name}</span>
                {ep.duration && <span className="ep-sidebar-dur">{ep.duration}</span>}
                {progress?.duration > 0 && <span className="episode-progress-bar"><span className="episode-progress-fill" style={{ width: `${Math.min(100, progress.position / progress.duration * 100)}%` }} /></span>}
              </span>
              {watched && <span className="ep-sidebar-check" aria-label={t("Watched")}>✓</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
