# Antenna

Sua tela. Suas histórias.

Antenna é um fork gratuito e de código aberto do [LiveBox](https://github.com/aimen08/livebox), com uma experiência de catálogo inspirada nos serviços de streaming. Não fornece canais, filmes ou credenciais: conecte sua própria conta Xtream Codes ou lista M3U.

- Início com destaques, Minha lista, Continue assistindo (filmes e séries), categorias e avaliações do seu catálogo.
- Português do Brasil por padrão; inglês disponível em **Configurações → Idioma**. A preferência é salva e a troca é imediata.
- Player integrado no macOS, com controles sobrepostos ao vídeo em tela cheia e PiP, sem faixa reservada. Os controles aparecem ao mover o mouse ou usar Tab e somem após 3 segundos, inclusive durante pausa. O PiP exibe apenas fechar, pausar e voltar à janela. Inclui linha do tempo e atalhos de 10 segundos. O instalador não abre um mpv externo.
- Menu de episódios no player, com seleção de temporada, indicação do episódio atual e progresso de reprodução.
- Prévias dos episódios aceitam os diferentes campos de imagem dos provedores; imagens indisponíveis usam a capa da série ou o número do episódio.
- Picture-in-Picture: um mini-player flutuante, redimensionável e sempre visível. Usa a mesma janela e sessão de reprodução, preservando a posição do vídeo e evitando uma segunda conexão ao provedor. Volte à janela pelo mesmo botão. Não é o PiP do AVKit; enquanto ativo, o catálogo fica oculto.
- OpenSubtitles: configure sua chave de API, os idiomas (`pt-br,en`) e sua conta em Configurações. No player, abra Legendas, busque o título e escolha um resultado. Séries incluem temporada e episódio na busca. Legendas são adicionadas à reprodução atual, inclusive ao mpv integrado no macOS.
- A chave e o token do OpenSubtitles são criptografados com o armazenamento seguro do sistema; a senha não é salva. A conta do serviço determina a cota de downloads. [Documentação da API](https://opensubtitles.stoplight.io/docs/opensubtitles-api).

## macOS

A implementação principal usa Electron + React e um player mpv integrado por um módulo nativo Objective-C++. O protótipo Swift herdado fica em `swift/`; os recursos descritos acima pertencem ao app principal.

O instalador de desenvolvimento atual é para Apple Silicon e macOS 26 ou posterior, devido às bibliotecas mpv compiladas nessa versão. O runtime do player é incluído no app: quem instala não precisa do Homebrew. O build local não é notarizado pela Apple.

```sh
npm ci
brew install mpv dylibbundler
npm run dist:mac
```

Para desenvolvimento: `npm run build:native` e `npm start`. Para testar a interface sem player nativo, `npx vite`. A chave também pode ser configurada com `ANTENNA_OPENSUBTITLES_KEY`; a variável anterior `LIVEBOX_OPENSUBTITLES_KEY` é aceita por compatibilidade.

```sh
npm test
# Teste real do Electron com perfil descartável e vídeo local:
ANTENNA_SMOKE_VIDEO=/caminho/absoluto/video.mp4 npx electron tests/smoke.cjs
# Após empacotar, testa o executável assinado, incluindo dyld e imagens inválidas:
ANTENNA_SMOKE_VIDEO=/caminho/absoluto/video.mp4 node tests/packaged-smoke.mjs
```

Os testes automatizados verificam credenciais, busca por episódio, cota de downloads, segurança dos redirecionamentos e restauração da janela PiP. O teste do Electron verifica idioma, catálogo, reprodução nativa, PiP e seleção da legenda baixada (API simulada). Downloads reais exigem uma chave e conta pessoais do OpenSubtitles.

## English

Antenna is a free, open-source fork of LiveBox. Bring your own Xtream Codes account or M3U playlist. It adds a cinematic home, floating Picture-in-Picture and OpenSubtitles search/downloads in the current player. Brazilian Portuguese is the default; switch to English in **Settings → Language**. PiP reuses the main window and playback session, so the catalog is hidden while the floating player is active.

The main app uses Electron/React with native embedded mpv on macOS. The inherited experimental Swift app is separate. The current local macOS build targets Apple Silicon and macOS 26+, bundles the player runtime, and is not Apple-notarized. OpenSubtitles requires your API key and account; its daily download quota applies.

## Licença e créditos / License and credits

GPL-3.0. Original LiveBox by [aimen08](https://github.com/aimen08/livebox). Antenna modifications by wesguirra. Original license and copyright notices are retained. Native embedded playback includes upstream work adapted from IPTVnator (MIT), with its existing attribution retained in the source.
