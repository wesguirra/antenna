import { useSyncExternalStore } from "react";
import pt from "./locales/pt-BR.json";
const key = "antenna_language";
const current = () => (localStorage.getItem(key) === "en" ? "en" : "pt-BR");
const subscribe = (listener) => {
  window.addEventListener("antenna-language", listener);
  return () => window.removeEventListener("antenna-language", listener);
};
export function useLanguage() {
  return useSyncExternalStore(subscribe, current);
}
export function setLanguage(language) {
  localStorage.setItem(key, language === "en" ? "en" : "pt-BR");
  document.documentElement.lang = current();
  window.dispatchEvent(new Event("antenna-language"));
}
export function t(text) {
  if (typeof text !== "string") return text;
  text = text.replace(/^Error invoking remote method '[^']+': Error: /, "");
  if (current() === "en") return text;
  if (Object.hasOwn(pt, text)) return pt[text];
  const patterns = [
    [/^Playback failed: (.+)$/, "Falha na reprodução: $1"],
    [/^Playback engine could not start: (.+) — check antivirus\/SmartScreen$/, "Não foi possível iniciar o player: $1"],
    [/^Playback engine rejected a command \((.+)\)$/, "O player não conseguiu executar o comando ($1)"],
    [/^Stream failed to load \(HTTP (\d+)\)$/, "Falha ao carregar o vídeo (HTTP $1)"],
    [/^Stream failed to play \(decode error: (.+)\)$/, "Falha ao reproduzir o vídeo (erro de decodificação: $1)"],
    [/^Stream unavailable or failed to load \((.+)\)$/, "Vídeo indisponível ou falha ao carregar ($1)"],
    [/^Failed to load stream \((.+)\)$/, "Não foi possível carregar o vídeo ($1)"],

    [
      /^OpenSubtitles request failed \((\d+)\)\.$/,
      "Falha na requisição ao OpenSubtitles ($1).",
    ],
    [
      /^Subtitle download failed \((\d+)\)\.$/,
      "Falha ao baixar a legenda ($1).",
    ],
    [/^Search in (.+)…$/, "Buscar em $1…"],
    [/^(\d+) saved$/, "$1 salvas"],
    [/^(\d+) items saved$/, "$1 itens salvos"],
    [/^(\d+) items tracked$/, "$1 itens no histórico"],
    [/^Season (\d+)$/, "Temporada $1"],
    [/^Episode (\d+)$/, "Episódio $1"],
    [/^OpenSubtitles: (.+)$/, "OpenSubtitles: $1"],
  ];
  for (const [pattern, replacement] of patterns)
    if (pattern.test(text)) return text.replace(pattern, replacement);
  return text;
}
document.documentElement.lang = current();

export function formatRating(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(current(), { maximumFractionDigits: 1 }).format(
        number,
      )
    : value;
}
