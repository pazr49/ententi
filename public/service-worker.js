const CACHE_NAME = 'ententi-cache-v1';
const urlsToCache = [
  '/', // Cache the root page
  '/manifest.json', // Cache the manifest
  // Add other essential assets if known, e.g.:
  // '/styles/globals.css',
  // '/icons/icon-192x192.png',
  // '/icons/icon-512x512.png'
  // Note: Next.js static assets often have hashes, making pre-caching them tricky here.
  // We will rely on the fetch handler to cache them dynamically.
];

// Install: Opens the cache and adds assets to it
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // AddAll can fail if any URL fails to fetch
        // Consider using cache.add() individually if some URLs might be optional
        return cache.addAll(urlsToCache).catch(err => {
          console.error('Failed to cache urls:', urlsToCache, err);
        });
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
  );
});

// Activate: Cleans up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tell the active service worker to take control of the page immediately.
      return self.clients.claim();
    })
  );
});

// Fetch: Intercepts requests and serves from cache or network
self.addEventListener('fetch', (event) => {
  // Strategy: Network-First for Navigation Requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Optional: Cache the successful navigation response
          // Be careful caching POST requests or responses that vary
          if (response.ok && event.request.method === 'GET') {
             const responseClone = response.clone();
             caches.open(CACHE_NAME)
                   .then(cache => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Network failed, try to serve from cache (e.g., the root '/')
          console.log('Network request failed for navigation, serving fallback from cache.');
          // Attempt to serve the root page as a fallback
          return caches.match('/')
                 .then(cachedResponse => cachedResponse || Response.error()); // Respond with error if not even root is cached
        })
    );
    return; // Don't process further for navigation
  }

  // Strategy: Cache-First for other requests (CSS, JS, Images, etc.)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if found
        if (cachedResponse) {
          // console.log('Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // If not in cache, fetch from network
        // console.log('Fetching from network:', event.request.url);
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
             // Don't cache error responses or opaque responses (like from CDNs without CORS)
             return networkResponse;
          }
          
          // Clone the response because it can only be consumed once
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              // console.log('Caching new resource:', event.request.url);
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        }).catch(error => {
          console.error('Fetch failed for non-navigation request:', event.request.url, error);
          // Optional: Return a fallback response for specific asset types if needed
          // For example, a placeholder image for failed image requests
          // return new Response('Offline'); // Generic fallback
        });
      })
  );
}); 