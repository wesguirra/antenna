const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { OpenSubtitles } = require("../electron/opensubtitles.cjs");
function service(t, fetch) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "antenna-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (s) => Buffer.from(s).map((b) => b ^ 91),
    decryptString: (b) =>
      Buffer.from(b)
        .map((v) => v ^ 91)
        .toString(),
  };
  return new OpenSubtitles({
    file: path.join(dir, "credentials"),
    safeStorage,
    fetch,
  });
}
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
test("credentials are encrypted, secrets hidden, password never persisted and language preferences survive restart", async (t) => {
  const s = service(t, async () =>
    json({ token: "private-token", base_url: "api.opensubtitles.com" }),
  );
  s.configure({ apiKey: "private-key", languages: "PT-BR,en,pt-br" });
  await s.login({ username: "demo", password: "private-password" });
  const saved = fs.readFileSync(s.file).toString();
  for (const secret of ["private-key", "private-token", "private-password"])
    assert.equal(saved.includes(secret), false);
  assert.deepEqual(s.status(), {
    configured: true,
    signedIn: true,
    username: "demo",
    languages: "pt-br,en",
  });
  const restored = new OpenSubtitles({
    file: s.file,
    safeStorage: s.safeStorage,
  });
  assert.deepEqual(restored.status(), s.status());
  s.configure({ apiKey: "", languages: "en" });
  assert.equal(s.status().signedIn, true);
  s.configure({ apiKey: "new-key", languages: "en" });
  assert.equal(s.status().signedIn, false);
});
test("series search carries season, episode and preferred languages", async (t) => {
  let url;
  const s = service(t, async (u) => {
    url = new URL(u);
    return json({
      data: [
        {
          attributes: {
            language: "pt-br",
            files: [{ file_id: 12, file_name: "episode.srt" }],
          },
        },
      ],
    });
  });
  s.configure({ apiKey: "key", languages: "pt-br,en" });
  const tracks = await s.search("Show", 2, 4);
  assert.equal(url.searchParams.get("season_number"), "2");
  assert.equal(url.searchParams.get("episode_number"), "4");
  assert.equal(url.searchParams.get("languages"), "pt-br,en");
  assert.equal(tracks[0].fileId, 12);
});
test("quota errors are actionable and downloads carry credentials only to the API", async (t) => {
  const calls = [];
  const s = service(t, async (u, options) => {
    calls.push({ u, options });
    if (u.includes("/api/v1/download"))
      return json({ link: "https://dl.opensubtitles.com/sub.srt" });
    return new Response("1\n00:00:01,000 --> 00:00:02,000\nOlá\n");
  });
  s.configure({ apiKey: "secret", languages: "pt-br" });
  s.config.token = "token";
  assert.match(await s.download(123), /Olá/);
  assert.equal(calls[0].options.headers.Authorization, "Bearer token");
  assert.equal(calls[1].options.headers, undefined);
  s.fetch = async () => json({}, 429);
  await assert.rejects(s.download(123), /quota or rate limit/);
});
test("rejects malicious API bases and download redirects before forwarding secrets", async (t) => {
  let downloads = 0;
  const s = service(t, async (u) => {
    if (u.includes("/api/v1/download"))
      return json({ link: "https://dl.opensubtitles.com/file" });
    downloads++;
    return new Response(null, {
      status: 302,
      headers: { location: "https://evil.example/steal" },
    });
  });
  s.configure({ apiKey: "key", languages: "en" });
  s.config.token = "token";
  await assert.rejects(s.download(1), /Invalid subtitle download URL/);
  assert.equal(downloads, 1);
  for (const base of [
    "https://api.opensubtitles.com.evil.example",
    "http://api.opensubtitles.com",
    "https://user:pass@api.opensubtitles.com",
  ])
    assert.throws(() => s.validBase(base));
  s.fetch = async () =>
    json({ token: "bad", base_url: "https://evil.example" });
  await assert.rejects(s.login({ username: "u", password: "p" }));
  assert.equal(s.config.token, "token");
});
test("secure storage failures roll back changes and invalid subtitle content is rejected", async (t) => {
  const s = service(t, async (u) =>
    u.includes("/api/v1/download")
      ? json({ link: "https://dl.opensubtitles.com/file" })
      : new Response("<html>error</html>"),
  );
  s.configure({ apiKey: "key", languages: "en" });
  s.config.token = "token";
  await assert.rejects(s.download(1), /not a subtitle/);
  s.safeStorage.isEncryptionAvailable = () => false;
  assert.throws(
    () => s.configure({ apiKey: "new", languages: "pt-br" }),
    /Secure/,
  );
  assert.equal(s.config.apiKey, "key");
  assert.throws(() => s.configure({ languages: "invalid" }), /language codes/);
});

test('reset removes saved credentials and returns to default languages', t => {
  const s = service(t, async () => json({}));
  s.configure({ apiKey: 'key', languages: 'es' });
  assert.ok(fs.existsSync(s.file));
  assert.deepEqual(s.reset(), {configured:false,signedIn:false,username:'',languages:'pt-br,en'});
  assert.equal(fs.existsSync(s.file), false);
});
