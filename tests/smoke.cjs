// Run with: ANTENNA_SMOKE_VIDEO=/absolute/file.mp4 npx electron tests/smoke.cjs
// Uses a disposable profile and synthetic catalog; never touches personal data.
const { app, BrowserWindow, Menu } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
// Mock only OpenSubtitles: playback still uses a real local video and native mpv.
globalThis.fetch = async (url) => {
  const json = (data) =>
    new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json" },
    });
  if (String(url).includes("/api/v1/login"))
    return json({ token: "fixture-token", base_url: "api.opensubtitles.com" });
  if (String(url).includes("/api/v1/subtitles?"))
    return json({
      data: [
        {
          attributes: {
            language: "pt-br",
            files: [{ file_id: 123, file_name: "fixture.srt" }],
          },
        },
      ],
    });
  if (String(url).includes("/api/v1/download"))
    return json({ link: "https://dl.opensubtitles.com/fixture.srt" });
  if (String(url).startsWith("https://dl.opensubtitles.com/"))
    return new Response(
      "1\n00:00:00,000 --> 00:00:19,000\nLegenda do Antenna\n",
    );
  throw new Error("Unexpected network request in smoke test");
};
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "antenna-smoke-"));
app.setPath("userData", profile);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let win;
let initial = true;
const errors = [];
app.on("browser-window-created", (_e, w) => {
  win = w;
  w.webContents.setBackgroundThrottling(false);
  w.webContents.on("console-message", (event) => {
    if (event.level === "error") {
      errors.push(event.message);
      console.error("RENDERER:", event.message);
    }
  });
  w.webContents.once("did-finish-load", () =>
    run().catch((e) => {
      console.error(e);
      app.exit(1);
    }),
  );
});
try {
  if (process.env.ANTENNA_SMOKE_RESOURCES) {
    const resources = path.resolve(process.env.ANTENNA_SMOKE_RESOURCES);
    const entry = path.join(resources, "app.asar", "index.js");
    // Electron's process.resourcesPath is read-only. Adapt only that location
    // when running the packaged entry through the development test runner.
    const Module = require("node:module");
    const packaged = new Module(entry, module);
    packaged.filename = entry;
    packaged.paths = Module._nodeModulePaths(path.dirname(entry));
    packaged._compile(
      fs
        .readFileSync(entry, "utf8")
        .replaceAll("process.resourcesPath", JSON.stringify(resources)),
      entry,
    );
  } else require("../index.js");
} catch (error) {
  console.error(error);
  app.exit(1);
}

async function run() {
  const js = async (code) => {
    try {
      return await win.webContents.executeJavaScript(
        `(()=>{return eval(${JSON.stringify(code)})})()`,
        true,
      );
    } catch (error) {
      console.error("FAILED SCRIPT:", code);
      throw error;
    }
  };
  await delay(500);
  assert.equal(await js("window.electron.playbackBackend"), "embedded", "macOS must use the embedded player");
  assert.equal(await js("document.documentElement.lang"), "pt-BR");
  assert.ok(
    Menu.getApplicationMenu().items.some((item) => item.label === "Arquivo"),
  );
  assert.match(
    await js("document.body.innerText"),
    /Sua tela\. Suas histórias\./,
  );
  await js(`document.querySelector('[aria-label="Configurações"]').click()`);
  await delay(200);
  assert.equal(
    await js('document.querySelector(".language-select").value'),
    "pt-BR",
  );
  await js(
    `const s=document.querySelector('.language-select');s.value='en';s.dispatchEvent(new Event('change',{bubbles:true}))`,
  );
  await delay(200);
  assert.equal(await js("document.documentElement.lang"), "en");
  assert.ok(
    Menu.getApplicationMenu().items.some((item) => item.label === "File"),
  );
  assert.match(await js("document.body.innerText"), /App language/);
  await js(
    `const s=document.querySelector('.language-select');s.value='pt-BR';s.dispatchEvent(new Event('change',{bubbles:true}))`,
  );
  const video = process.env.ANTENNA_SMOKE_VIDEO;
  assert.ok(
    video && fs.existsSync(video),
    "Set ANTENNA_SMOKE_VIDEO to a local test video",
  );
  const svg = (color) =>
    "data:image/svg+xml;base64," +
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g"><stop stop-color="${color}"/><stop offset="1" stop-color="#090910"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="900" cy="300" r="170" fill="white" opacity=".12"/></svg>`,
    ).toString("base64");
  const movies = [
    "Horizonte",
    "Luz da manhã",
    "Depois da chuva",
    "Entre mundos",
    "A última estação",
    "Constelação",
  ].map((name, i) => ({
    id: i,
    streamId: i,
    name,
    url: pathToFileURL(video).href + "?" + i,
    poster: svg(["#415470", "#925939", "#234e49"][i % 3]),
    backdrop: svg("#38445c"),
    rating: 8.8 - i / 10,
    group: "Histórias para descobrir",
    plot: "Um novo lugar, um encontro inesperado e uma história que fica com você.",
  }));
  movies[0].url = pathToFileURL(video).href;
  const cache = {
    baseUrl: "https://example.invalid",
    username: "demo",
    cachedAt: Date.now(),
    channels: [],
    groups: [],
    movies,
    movieGroups: ["Histórias para descobrir"],
    series: Array.from({ length: 24 }, (_, i) => ({
      id: i,
      seriesId: i + 1,
      name: `Série ${i + 1}`,
      poster: svg("#38445c"),
      group: [
        "Séries | AMC Plus",
        "Séries | Apple TV Plus",
        "Séries | Brasil Paralelo",
      ][Math.floor(i / 8)],
      rating: 8,
    })),
    seriesGroups: [
      "Séries | AMC Plus",
      "Séries | Apple TV Plus",
      "Séries | Brasil Paralelo",
    ],
  };
  await js(
    `localStorage.setItem('livebox_xtreamCreds',${JSON.stringify(JSON.stringify({ baseUrl: cache.baseUrl, username: cache.username, password: "fixture" }))});localStorage.setItem('livebox_xtreamCache',${JSON.stringify(JSON.stringify(cache))});`,
  );
  await new Promise((resolve) => {
    win.webContents.once("did-finish-load", resolve);
    win.reload();
  });
  await delay(800);
  assert.match(
    await js('document.querySelector(".home-dashboard").innerText'),
    /Hoje merece uma boa história/,
  );
  const output = process.env.ANTENNA_SMOKE_OUTPUT || profile;
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(
    path.join(output, "antenna-home.png"),
    (await win.webContents.capturePage()).toPNG(),
  );
  // Regression: the catalog scrolls on the document, not the .main element.
  for (const page of ["movies", "series", "home"]) {
    await js(
      `document.querySelector('.topnav-link:nth-child(${page === "movies" ? 3 : page === "series" ? 4 : 1})').click();window.scrollTo(0,0)`,
    );
    await delay(150);
    await js(`window.scrollTo(0,700)`);
    await delay(300);
    assert.ok(
      await js("window.scrollY > 8"),
      "the actual document must scroll",
    );
    assert.ok(
      await js(
        'document.querySelector(".topnav").classList.contains("is-scrolled")',
      ),
      `${page}: header must track document scrolling`,
    );
    for (
      let attempt = 0;
      attempt < 20 &&
      (await js(
        'getComputedStyle(document.querySelector(".topnav")).backgroundColor',
      )) !== "rgb(16, 16, 18)";
      attempt++
    )
      await delay(100);
    assert.equal(
      await js(
        'getComputedStyle(document.querySelector(".topnav")).backgroundColor',
      ),
      "rgb(16, 16, 18)",
      `${page}: header must hide titles behind it`,
    );
    await delay(500);
    if (page === "series") {
      const screenshot = await win.webContents.capturePage();
      const bitmap = screenshot.resize({ width: 1400, height: 900 }).toBitmap();
      const pixel = bitmap.subarray(
        (15 * 1400 + 1000) * 4,
        (15 * 1400 + 1000) * 4 + 4,
      );
      // macOS color profiles can shift captured channel values by a few levels.
      assert.ok(
        Math.abs(pixel[0] - 18) <= 4 &&
          Math.abs(pixel[1] - 16) <= 4 &&
          Math.abs(pixel[2] - 16) <= 4,
        `rendered header must cover the posters (pixel ${Array.from(pixel)}, bitmap ${bitmap.length}, size ${JSON.stringify(screenshot.resize({ width: 1400, height: 900 }).getSize())})`,
      );
      fs.writeFileSync(
        path.join(output, "antenna-series-scroll.png"),
        screenshot.toPNG(),
      );
    }
    await js("window.scrollTo(0,0)");
    await delay(300);
    assert.equal(
      await js(
        'document.querySelector(".topnav").classList.contains("is-scrolled")',
      ),
      false,
      `${page}: hero header must reset at top`,
    );
  }
  await js(
    `window.__times=[];window.electron.mpv.onEvent(e=>{if(e.type==='time')window.__times.push(e.value);if(e.type==='tracks')window.__tracks=e});document.querySelector('.billboard .btn-primary').click()`,
  );
  await delay(1800);
  assert.equal(await js("window.electron.mpvAvailable"), true);
  assert.equal(await js('!!document.querySelector(".mpv-surface")'), true);
  for (
    let attempt = 0;
    attempt < 80 && !(await js("window.__times.some(t=>t>=1)"));
    attempt++
  )
    await delay(100);
  assert.ok(
    await js("window.__times.some(t=>t>=1)"),
    "native playback must advance",
  );
  const beforePip = await js("window.__times.at(-1)");
  const original = win.getBounds();
  await js("window.electron.pip.set(true)");
  await delay(700);
  assert.equal(win.getBounds().width, 480);
  assert.equal(win.isAlwaysOnTop(), true);
  assert.equal(
    await js('document.body.classList.contains("pip-active")'),
    true,
  );
  fs.writeFileSync(
    path.join(output, "antenna-pip.png"),
    (await win.webContents.capturePage()).toPNG(),
  );
  await js("window.electron.pip.set(false)");
  await delay(300);
  assert.deepEqual(win.getBounds(), original);
  assert.equal(win.isAlwaysOnTop(), false);
  assert.ok(
    (await js("window.__times.at(-1)")) >= beforePip,
    "PiP must preserve playback progress",
  );
  await js(`document.querySelector('button[title="Legendas"]').click()`);
  await delay(200);
  await js(`document.querySelector('.online-subtitles form button').click()`);
  await delay(300);
  assert.match(
    await js(
      'document.querySelector(".online-subtitles [role=alert]").innerText',
    ),
    /Adicione sua chave/,
  );
  await js(
    `window.electron.subtitles.configure({apiKey:'fixture-key',languages:'pt-br,en'})`,
  );
  await js(
    `window.electron.subtitles.login({username:'fixture',password:'never-persist-this'})`,
  );
  await js(`document.querySelector('.online-subtitles form button').click()`);
  await delay(200);
  await js(
    `document.querySelector('.online-subtitles .mpv-panel-item').click()`,
  );
  for (
    let attempt = 0;
    attempt < 50 && !(await js("window.__tracks?.selectedSub > 0"));
    attempt++
  )
    await delay(100);
  assert.ok(
    await js("window.__tracks?.selectedSub > 0"),
    "downloaded subtitle must be selected by native mpv",
  );
  assert.equal(
    fs
      .readFileSync(path.join(profile, "opensubtitles.enc"))
      .includes(Buffer.from("never-persist-this")),
    false,
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS: Portuguese default, live English switch, cinematic home, native playback, PiP restore, localized subtitle error, subtitle added to native playback.",
  );
  await js("window.electron.mpv.stop()");
  app.quit();
}
