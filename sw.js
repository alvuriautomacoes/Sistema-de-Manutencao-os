const CACHE_NAME = 'nezur-v1';

// Arquivos que ficam em cache (shell do app)
const SHELL_FILES = [
  '/',
  '/manifest.json'
];

// ── INSTALL: salva shell em cache ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpa caches antigos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: network first, fallback offline ──
self.addEventListener('fetch', event => {
  // Ignora requisições não-GET e chamadas ao Supabase (sempre precisam de rede)
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('supabase.co')
  ) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Salva página principal em cache se vier da rede
        if (event.request.url === self.location.origin + '/') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sem internet — retorna cache ou página offline
        return caches.match(event.request).then(cached => {
          if (cached) return cached;

          // Página offline inline
          return new Response(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
              <title>NEZUR — Sem conexão</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                  font-family: 'IBM Plex Sans', sans-serif;
                  background: #0c2a4f;
                  color: #fff;
                  min-height: 100vh;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  gap: 16px;
                  padding: 32px;
                  text-align: center;
                }
                .icon { font-size: 56px; margin-bottom: 8px; }
                .title { font-size: 22px; font-weight: 700; }
                .sub { font-size: 14px; color: rgba(255,255,255,0.55); line-height: 1.6; max-width: 280px; }
                .btn {
                  margin-top: 16px;
                  padding: 12px 28px;
                  background: #3d7ab8;
                  color: #fff;
                  border: none;
                  font-size: 14px;
                  font-weight: 700;
                  cursor: pointer;
                  font-family: inherit;
                }
                .btn:hover { background: #2d62a0; }
              </style>
            </head>
            <body>
              <div class="icon">🔌</div>
              <div class="title">Sem conexão</div>
              <div class="sub">O NEZUR precisa de internet para funcionar. Verifique sua conexão e tente novamente.</div>
              <button class="btn" onclick="location.reload()">↺ Tentar novamente</button>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        });
      })
  );
});
