// KidGoals Service Worker
// Cache version will be dynamically set from version.js
let CACHE_VERSION = 'kidgoals-v2'; // Fallback version
let CACHE_NAME = `${CACHE_VERSION}-${Date.now()}`; // Unique cache name for each update

// Try to get cache version from the main app
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SET_CACHE_VERSION') {
        CACHE_VERSION = event.data.cacheVersion;
        CACHE_NAME = `${CACHE_VERSION}-${Date.now()}`;
        console.log('Service Worker cache version updated:', CACHE_VERSION);
    }
});

const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/version.js'
];

// Install event - cache resources and skip waiting
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    // Skip waiting to activate immediately
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('All resources cached successfully');
            })
            .catch(error => {
                console.error('Cache installation failed:', error);
            })
    );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && cacheName.startsWith('kidgoals-')) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Claim all clients immediately
            self.clients.claim()
        ]).then(() => {
            console.log('Service Worker activated and claimed clients');
            
            // Notify all clients about the update
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        cacheVersion: CACHE_VERSION,
                        cacheName: CACHE_NAME
                    });
                });
            });
        })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http requests
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version if available
                if (response) {
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Cache the response for future use
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        // Return a fallback response for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        throw error;
                    });
            })
    );
});

// Handle messages from the main app
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('Received skip waiting message');
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            type: 'VERSION_INFO',
            cacheVersion: CACHE_VERSION,
            cacheName: CACHE_NAME
        });
    }
});

// Background sync for offline functionality
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

function doBackgroundSync() {
    // Implement background sync logic here
    console.log('Performing background sync...');
    return Promise.resolve();
} 