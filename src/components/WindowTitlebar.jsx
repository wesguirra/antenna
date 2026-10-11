import { t, useLanguage } from "../i18n";
import React, { useState, useEffect } from "react";
import { MinusIcon, SquareIcon, XIcon } from "./Icons";

function RestoreIcon() {
  useLanguage();
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="8" width="13" height="13" rx="2" ry="2" />
      <path d="M8 4h11a1 1 0 0 1 1 1v11" />
    </svg>
  );
}

export default function WindowTitlebar() {
  useLanguage();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    window.electron.isMaximized().then(setMaximized);
    window.electron.onWindowMaximized(setMaximized);
  }, []);

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-text">ANTENNA</span>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-btn"
          aria-label={t("Minimize")}
          title={t("Minimize")}
          onClick={() => window.electron.minimizeWindow()}
        >
          <MinusIcon />
        </button>
        <button
          className="titlebar-btn"
          aria-label={maximized ? t("Restore") : t("Maximize")}
          title={maximized ? t("Restore") : t("Maximize")}
          onClick={() => window.electron.maximizeWindow()}
        >
          {maximized ? <RestoreIcon /> : <SquareIcon />}
        </button>
        <button
          className="titlebar-btn titlebar-close"
          aria-label={t("Close")}
          title={t("Close")}
          onClick={() => window.electron.closeWindow()}
        >
          <XIcon />
        </button>
      </div>
    </div>
  );
}
