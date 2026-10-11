import { t, useLanguage } from "../i18n";
import React, { useEffect, useState } from "react";

export default function SubtitleSettings() {
  useLanguage();
  const api = window.electron?.subtitles;
  const [status, setStatus] = useState({ configured: false, signedIn: false });
  const [apiKey, setApiKey] = useState("");
  const [languages, setLanguages] = useState("pt-br,en");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const update = () =>
      api
        ?.status()
        .then((s) => {
          setStatus(s);
          setLanguages(s.languages);
          setUsername(s.username || "");
          setPassword("");
          setApiKey("");
        })
        .catch((e) => setMessage(e.message));
    update();
    window.addEventListener("antenna-subtitles-reset", update);
    return () => window.removeEventListener("antenna-subtitles-reset", update);
  }, []);
  if (!api) return null;
  const run = async (action) => {
    setBusy(true);
    setMessage("");
    try {
      setStatus(await action());
      setApiKey("");
      setPassword("");
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="setting-section">
      <h3 className="setting-section-title">OpenSubtitles</h3>
      <div className="setting-section-body subtitle-settings">
        <p>
          {t(
            "Find subtitles in the player. Your API key and login token are stored securely on this Mac.",
          )}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api.configure({ apiKey, languages }));
          }}
        >
          <label>
            {t("API key")}
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                status.configured
                  ? t("Saved — leave blank to keep")
                  : t("Your OpenSubtitles.com API key")
              }
            />
          </label>
          <label>
            {t("Languages")}
            <input
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="pt-br,en"
            />
          </label>
          <button className="btn btn-sm btn-secondary" disabled={busy}>
            {t("Save preferences")}
          </button>
        </form>
        {status.signedIn ? (
          <div className="subtitle-account">
            <span>
              {t("Signed in as")} {status.username}
            </span>
            <button
              className="btn btn-sm btn-secondary"
              disabled={busy}
              onClick={() => run(() => api.logout())}
            >
              {t("Sign out")}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => api.login({ username, password }));
            }}
          >
            <label>
              {t("Username")}
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label>
              {t("Password")}
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              className="btn btn-sm btn-primary"
              disabled={busy || !status.configured || !username || !password}
            >
              {t("Sign in")}
            </button>
          </form>
        )}
        <p>
          {t(
            "Search requires an API key; downloads require an OpenSubtitles account and follow its daily quota.",
          )}
        </p>
        {message && <p role="status">{t(message)}</p>}
      </div>
    </section>
  );
}
