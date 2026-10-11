import { t, useLanguage, formatRating } from "../i18n";
import React from "react";
import { PlayIcon, InfoIcon } from "./Icons";

export default function Billboard({
  item,
  kind,
  onPlay,
  onMoreInfo,
  onToggleFav,
  isFav,
  eyebrow,
}) {
  useLanguage();
  if (!item) return null;
  const meta = [];
  if (kind === "series" && item.releaseDate)
    meta.push(String(item.releaseDate).slice(0, 4));
  if (item.rating) meta.push(`★ ${formatRating(item.rating)}`);
  if (item.genre) meta.push(item.genre);
  const desc = item.plot || "";

  return (
    <section className="billboard">
      <div className="billboard-bg" aria-hidden="true">
        {item.backdrop || item.poster ? (
          <img
            src={item.backdrop || item.poster}
            alt=""
            className="billboard-bg-img"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div className="billboard-bg-fallback" />
        )}
      </div>
      <div className="billboard-scrim" aria-hidden="true" />
      <div className="billboard-content">
        {eyebrow && <p className="billboard-eyebrow">{eyebrow}</p>}
        <span className="billboard-kind">
          {kind === "series" ? t("SERIES") : t("MOVIE")}
        </span>
        <h1 className="billboard-title">{item.name}</h1>
        {meta.length > 0 && (
          <div className="billboard-meta">
            {meta.map((m, i) => (
              <span key={i} className="billboard-meta-item">
                {m}
              </span>
            ))}
          </div>
        )}
        {desc && <p className="billboard-desc">{desc}</p>}
        <div className="billboard-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => onPlay(item)}
          >
            <PlayIcon />
            {t("Play")}
          </button>
          {onToggleFav ? (
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => onToggleFav(item)}
            >
              <span aria-hidden="true">{isFav ? "✓" : "+"}</span>
              {t("My List")}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => onMoreInfo(item)}
            >
              <InfoIcon />
              {t("More Info")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
