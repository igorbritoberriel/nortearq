// Service worker mínimo: só torna o NorteArq instalável como aplicativo.
// Não guarda nada em cache: tudo vem sempre da internet, sempre atualizado.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
