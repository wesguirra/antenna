const fs = require("node:fs");

class OpenSubtitles {
  constructor({ file, safeStorage, fetch = globalThis.fetch, apiKey = "" }) {
    this.file = file;
    this.safeStorage = safeStorage;
    this.fetch = fetch;
    this.config = {
      apiKey,
      languages: "pt-br,en",
      token: "",
      username: "",
      base: "https://api.opensubtitles.com",
    };
    try {
      const saved = JSON.parse(
        safeStorage.decryptString(fs.readFileSync(file)),
      );
      const base = this.validBase(saved.base || this.config.base);
      this.config = { ...this.config, ...saved, base };
    } catch {
      /* First launch or unavailable keychain. */
    }
  }
  validBase(value) {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (
      url.protocol !== "https:" ||
      !["api.opensubtitles.com", "vip-api.opensubtitles.com"].includes(
        url.hostname,
      ) ||
      url.port ||
      url.username ||
      url.password
    ) {
      throw new Error("Invalid OpenSubtitles API server.");
    }
    return url.origin;
  }
  status() {
    return {
      configured: !!this.config.apiKey,
      signedIn: !!this.config.token,
      username: this.config.username,
      languages: this.config.languages,
    };
  }
  save() {
    if (!this.safeStorage.isEncryptionAvailable())
      throw new Error("Secure credential storage is unavailable.");
    const encrypted = this.safeStorage.encryptString(
      JSON.stringify(this.config),
    );
    fs.writeFileSync(`${this.file}.tmp`, encrypted, { mode: 0o600 });
    fs.renameSync(`${this.file}.tmp`, this.file);
  }
  configure({ apiKey, languages }) {
    const previous = this.config;
    const next = { ...previous };
    if (typeof apiKey === "string" && apiKey.trim()) {
      next.apiKey = apiKey.trim();
      if (next.apiKey !== previous.apiKey) {
        next.token = "";
        next.username = "";
        next.base = "https://api.opensubtitles.com";
      }
    }
    if (typeof languages === "string") {
      const codes = languages
        .toLowerCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (
        !codes.length ||
        codes.length > 10 ||
        codes.some((s) => !/^[a-z]{2}(?:-[a-z]{2})?$/.test(s))
      )
        throw new Error("Use language codes such as pt-br,en,es.");
      next.languages = [...new Set(codes)].join(",");
    }
    this.config = next;
    try {
      this.save();
    } catch (error) {
      this.config = previous;
      throw error;
    }
    return this.status();
  }
  async request(endpoint, body) {
    if (!this.config.apiKey)
      throw new Error("Add your OpenSubtitles API key in Settings first.");
    const response = await this.fetch(
      `${this.config.base}/api/v1/${endpoint}`,
      {
        method: body ? "POST" : "GET",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: {
          "Api-Key": this.config.apiKey,
          "User-Agent": "Antenna v1.10.2",
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(this.config.token
            ? { Authorization: `Bearer ${this.config.token}` }
            : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("OpenSubtitles returned an invalid response.");
    }
    if (!response.ok) {
      if (response.status === 401)
        throw new Error(
          "OpenSubtitles login expired or credentials are incorrect. Sign in again.",
        );
      if (response.status === 406 || response.status === 429)
        throw new Error(
          "OpenSubtitles download quota or rate limit reached. Try again later.",
        );
      throw new Error(`OpenSubtitles request failed (${response.status}).`);
    }
    return data;
  }
  async login({ username, password }) {
    if (!username?.trim() || !password)
      throw new Error("Enter your OpenSubtitles username and password.");
    const previous = this.config;
    this.config = {
      ...previous,
      token: "",
      base: "https://api.opensubtitles.com",
    };
    try {
      const data = await this.request("login", {
        username: username.trim(),
        password,
      });
      if (!data.token)
        throw new Error("OpenSubtitles did not return a login token.");
      this.config.token = data.token;
      this.config.username = username.trim();
      this.config.base = this.validBase(
        data.base_url || "https://api.opensubtitles.com",
      );
      this.save();
      return this.status();
    } catch (error) {
      this.config = previous;
      throw error;
    }
  }
  logout() {
    const previous = this.config;
    this.config = {
      ...previous,
      token: "",
      username: "",
      base: "https://api.opensubtitles.com",
    };
    try {
      this.save();
    } catch (error) {
      this.config = previous;
      throw error;
    }
    return this.status();
  }
  reset() {
    fs.rmSync(this.file, { force: true });
    this.config = {
      apiKey: "",
      languages: "pt-br,en",
      token: "",
      username: "",
      base: "https://api.opensubtitles.com",
    };
    return this.status();
  }
  async search(query, season, episode) {
    if (typeof query !== "string" || !query.trim())
      throw new Error("Enter a title to search.");
    const params = new URLSearchParams({
      query: query.trim().slice(0, 200),
      languages: this.config.languages,
      order_by: "download_count",
    });
    if (Number(season) > 0) params.set("season_number", String(Number(season)));
    if (Number(episode) > 0)
      params.set("episode_number", String(Number(episode)));
    const data = await this.request(`subtitles?${params}`);
    return (data.data || [])
      .flatMap((item) =>
        (item.attributes?.files || []).map((file) => ({
          id: `os-${file.file_id}`,
          fileId: file.file_id,
          lang: item.attributes.language,
          name: `${item.attributes.language} · ${file.file_name || item.attributes.release || "Subtitle"}`,
        })),
      )
      .slice(0, 30);
  }
  async download(fileId) {
    if (!Number.isSafeInteger(Number(fileId)) || Number(fileId) <= 0)
      throw new Error("Invalid subtitle file.");
    if (!this.config.token)
      throw new Error(
        "Sign in to OpenSubtitles in Settings to download subtitles.",
      );
    const data = await this.request("download", {
      file_id: Number(fileId),
      sub_format: "srt",
    });
    let url = new URL(data.link);
    // Download links never receive the API key or login token, including redirects.
    for (let redirect = 0; redirect <= 5; redirect++) {
      if (
        url.protocol !== "https:" ||
        !(
          url.hostname === "opensubtitles.com" ||
          url.hostname.endsWith(".opensubtitles.com")
        ) ||
        url.username ||
        url.password
      )
        throw new Error("Invalid subtitle download URL.");
      const response = await this.fetch(url.href, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get("location")
      ) {
        url = new URL(response.headers.get("location"), url);
        continue;
      }
      if (!response.ok)
        throw new Error(`Subtitle download failed (${response.status}).`);
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 5 * 1024 * 1024)
          throw new Error("Subtitle file is too large.");
        chunks.push(Buffer.from(chunk));
      }
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text.includes("-->"))
        throw new Error("Downloaded file is not a subtitle.");
      return text;
    }
    throw new Error("Too many subtitle download redirects.");
  }
}
module.exports = { OpenSubtitles };
