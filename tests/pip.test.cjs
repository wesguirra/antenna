const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PictureInPicture } = require("../electron/pip.cjs");
function mock() {
  const w = new EventEmitter();
  Object.assign(w, {
    bounds: { x: 30, y: 50, width: 1400, height: 900 },
    minimum: [900, 600],
    top: false,
    spaces: false,
    aspect: 0,
    full: false,
    max: false,
    messages: [],
    isDestroyed: () => false,
    isFullScreen() {
      return this.full;
    },
    isMaximized() {
      return this.max;
    },
    getBounds() {
      return this.bounds;
    },
    getNormalBounds() {
      return this.bounds;
    },
    getMinimumSize() {
      return this.minimum;
    },
    isAlwaysOnTop() {
      return this.top;
    },
    isVisibleOnAllWorkspaces() {
      return this.spaces;
    },
    setFullScreen(v) {
      this.full = v;
      if (!v) queueMicrotask(() => this.emit("leave-full-screen"));
    },
    setAspectRatio(v) { this.aspect = v; },
    setMinimumSize(...v) {
      this.minimum = v;
    },
    setBounds(v) {
      this.bounds = v;
    },
    setAlwaysOnTop(v) {
      this.top = v;
    },
    setVisibleOnAllWorkspaces(v) {
      this.spaces = v;
    },
    unmaximize() {
      this.max = false;
    },
    maximize() {
      this.max = true;
    },
  });
  w.webContents = { send: (...args) => w.messages.push(args) };
  return w;
}
test("PiP reuses the same window and restores original bounds and workspace state", async () => {
  const w = mock(),
    original = { ...w.bounds };
  const pip = new PictureInPicture(
    w,
    {
      getDisplayMatching: () => ({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      }),
    },
    "darwin",
  );
  assert.equal(await pip.set(true), true);
  assert.equal(w.bounds.width, 480);
  assert.equal(w.bounds.height, 270);
  assert.equal(w.aspect, 16 / 9);
  assert.deepEqual(w.minimum, [320, 180]);
  assert.equal(w.top, true);
  assert.equal(w.spaces, true);
  assert.equal(await pip.set(false), false);
  assert.deepEqual(w.bounds, original);
  assert.deepEqual(w.minimum, [900, 600]);
  assert.equal(w.top, false);
  assert.equal(w.aspect, 0);
  assert.equal(w.spaces, false);
});
test("rapid toggles serialize fullscreen transitions and restore fullscreen", async () => {
  const w = mock();
  w.full = true;
  const original = { ...w.bounds };
  const pip = new PictureInPicture(
    w,
    {
      getDisplayMatching: () => ({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      }),
    },
    "darwin",
  );
  await Promise.all([pip.set(true), pip.set(false)]);
  assert.equal(pip.active, false);
  assert.equal(w.full, true);
  assert.deepEqual(w.bounds, original);
  assert.deepEqual(w.messages, [
    ["pip-changed", true],
    ["pip-changed", false],
  ]);
});
