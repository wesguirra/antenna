import React from "react";

// The AppKit bridge supplies SF Symbols from the installed macOS. Other
// platforms use the existing SVG artwork; button names remain accessible.
export default function AppleSymbol({ name, size = 20, children }) {
  const source = window.electron?.playerSymbols?.[name];
  if (!source) return children || null;
  return <span className="apple-symbol" data-symbol={name} aria-hidden="true"
    style={{ width: size, height: size, maskImage: `url("${source}")`, WebkitMaskImage: `url("${source}")` }} />;
}
