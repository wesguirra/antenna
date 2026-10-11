class PictureInPicture {
  constructor(window, screen, platform = process.platform) {
    this.window = window;
    this.screen = screen;
    this.platform = platform;
    this.saved = null;
    this.pending = Promise.resolve();
  }
  get active() {
    return !!this.saved;
  }
  set(enabled) {
    this.pending = this.pending.catch(() => {}).then(() => this.apply(enabled));
    return this.pending;
  }
  async apply(enabled) {
    const win = this.window;
    if (win.isDestroyed() || enabled === this.active) return this.active;
    if (enabled) {
      const fullscreen = win.isFullScreen();
      const maximized = win.isMaximized();
      const bounds =
        maximized || fullscreen ? win.getNormalBounds() : win.getBounds();
      if (fullscreen) {
        await new Promise((resolve, reject) => {
          const done = () => {
            clearTimeout(timer);
            resolve();
          };
          const timer = setTimeout(() => {
            win.removeListener("leave-full-screen", done);
            reject(new Error("Exit full screen before entering PiP."));
          }, 4000);
          win.once("leave-full-screen", done);
          win.setFullScreen(false);
        });
      }
      this.saved = {
        bounds,
        fullscreen,
        maximized,
        minimum: win.getMinimumSize(),
        onTop: win.isAlwaysOnTop(),
        allSpaces: win.isVisibleOnAllWorkspaces(),
      };
      if (maximized) win.unmaximize();
      const area = this.screen.getDisplayMatching(bounds).workArea;
      win.setMinimumSize(320, 220);
      win.setBounds({
        x: area.x + Math.max(0, area.width - 500),
        y: area.y + Math.max(0, area.height - 340),
        width: 480,
        height: 300,
      });
      win.setAlwaysOnTop(true, "floating");
      if (this.platform === "darwin")
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } else {
      const saved = this.saved;
      this.saved = null;
      win.setAlwaysOnTop(saved.onTop);
      if (this.platform === "darwin")
        win.setVisibleOnAllWorkspaces(saved.allSpaces);
      win.setMinimumSize(...saved.minimum);
      win.setBounds(saved.bounds);
      if (saved.maximized) win.maximize();
      if (saved.fullscreen) win.setFullScreen(true);
    }
    win.webContents.send("pip-changed", this.active);
    return this.active;
  }
}
module.exports = { PictureInPicture };
