const CACHE_NAME = 'spirit-to-all-v13';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './logo-header.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.allSettled(
        APP_SHELL.map(async url => {
          try {
            const response = await fetch(url, {cache:'reload'});
            if (response.ok) await cache.put(url, response);
          } catch (error) {
            console.warn('No se pudo precargar:', url);
          }
        })
      );
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key.startsWith('spirit-to-all-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const rutas = APP_SHELL.map(path => new URL(path, self.registration.scope).href);
  const documento = request.mode === 'navigate' && rutas.includes(url.origin + url.pathname);
  const recurso = rutas.includes(url.href);
  if (!documento && !recurso) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok && recurso) {
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      if (documento && (url.searchParams.has('code') || url.searchParams.has('error'))) {
        return Response.error();
      }
      return (await cache.match(request)) ||
        (documento && (await cache.match('./index.html') || await cache.match('./'))) ||
        Response.error();
    }
  })());
});

self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data
      ? event.data.json()
      : {};
  } catch (error) {
    console.error(
      'Push no válido:',
      error
    );
  }

  data = data && typeof data === 'object' ? data : {};

  const title =
    data.title || 'Spirit to All';

  const options = {
    body: data.body || '',
    icon:
      '/spirit-to-all-disponibilidad/icon-192.png',
    badge:
      '/spirit-to-all-disponibilidad/icon-192.png',
    vibrate: [120, 60, 120],
    data: {
      evento_id:
        data.evento_id || null,
      ensayo_id:
        data.ensayo_id || null,
      destino:
        data.destino || null
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

self.addEventListener(
  'notificationclick',
  event => {
    event.notification.close();

    const data =
      event.notification.data || {};

    const destino =
      data.destino || '';

    const eventoId =
      data.evento_id || null;

    const ensayoId =
      data.ensayo_id || null;

    const destinoUrl =
      new URL(
        './',
        self.registration.scope
      );

    if (destino === 'solicitudes') {
      destinoUrl.searchParams.set(
        'admin',
        'pendientes'
      );

      destinoUrl.searchParams.set(
        'push',
        '1'
      );

    } else if (
      destino === 'calendario'
    ) {
      destinoUrl.searchParams.set(
        'calendario',
        '1'
      );

      if (ensayoId) {
        destinoUrl.searchParams.set(
          'ensayo',
          String(ensayoId)
        );
      }

    } else if (
      destino === 'inicio'
    ) {
      destinoUrl.searchParams.set(
        'aprobado',
        '1'
      );

    } else if (eventoId) {
      destinoUrl.searchParams.set(
        'evento',
        String(eventoId)
      );
    }

    const url =
      destinoUrl.href;

    event.waitUntil(
      (async () => {
        const clientList =
          await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
          });

        for (
          const client of clientList
        ) {
          if (!client.url.startsWith(self.registration.scope)) continue;
          try {
            if ('navigate' in client) {
              const ventana = await client.navigate(url);
              if (ventana) return ventana.focus();
            }
          } catch (error) {
            console.error(
              'No se pudo reutilizar ventana:',
              error
            );
          }
        }

        if (
          self.clients.openWindow
        ) {
          return self.clients.openWindow(
            url
          );
        }
      })()
    );
  }
);
