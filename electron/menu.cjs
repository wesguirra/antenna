function installMenu({ Menu, app, language, onFullscreen }) {
  const label = (en, pt) => (language === "en" ? en : pt);
  const item = (role, en, pt) => ({ role, label: label(en, pt) });
  const separator = { type: "separator" };
  const template = [];
  if (process.platform === "darwin")
    template.push({
      label: "Antenna",
      submenu: [
        item("about", "About Antenna", "Sobre o Antenna"),
        separator,
        item("services", "Services", "Serviços"),
        separator,
        item("hide", "Hide Antenna", "Ocultar Antenna"),
        item("hideOthers", "Hide Others", "Ocultar outros"),
        item("unhide", "Show All", "Mostrar tudo"),
        separator,
        item("quit", "Quit Antenna", "Sair do Antenna"),
      ],
    });
  template.push(
    {
      label: label("File", "Arquivo"),
      submenu: [item("close", "Close Window", "Fechar janela")],
    },
    {
      label: label("Edit", "Editar"),
      submenu: [
        item("undo", "Undo", "Desfazer"),
        item("redo", "Redo", "Refazer"),
        separator,
        item("cut", "Cut", "Recortar"),
        item("copy", "Copy", "Copiar"),
        item("paste", "Paste", "Colar"),
        item("selectAll", "Select All", "Selecionar tudo"),
      ],
    },
    {
      label: label("View", "Visualizar"),
      submenu: [
        {
          label: label("Full Screen", "Tela cheia"),
          accelerator: process.platform === "darwin" ? "Ctrl+Command+F" : "F11",
          click: onFullscreen,
        },
        separator,
        item("resetZoom", "Actual Size", "Tamanho original"),
        item("zoomIn", "Zoom In", "Ampliar"),
        item("zoomOut", "Zoom Out", "Reduzir"),
      ],
    },
    {
      label: label("Window", "Janela"),
      submenu: [
        item("minimize", "Minimize", "Minimizar"),
        item("zoom", "Zoom", "Ampliar janela"),
        ...(process.platform === "darwin"
          ? [
              separator,
              item("front", "Bring All to Front", "Trazer tudo para frente"),
            ]
          : []),
      ],
    },
  );
  if (process.platform !== "darwin")
    template.push({
      label: label("Help", "Ajuda"),
      submenu: [
        item("about", "About Antenna", "Sobre o Antenna"),
        item("quit", "Quit", "Sair"),
      ],
    });
  app.setAboutPanelOptions({
    applicationName: "Antenna",
    applicationVersion: "1.10.3",
    copyright: "GPL-3.0 · LiveBox by aimen08 · Antenna by wesguirra",
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
module.exports = { installMenu };
