const staticAssets = [
    './',
    './js/map.js',
    './css/drinkwater.css'
];

self.addEventListener('install', async event => {
    const cache = await caches.open('drinkwater-static');
    cache.addAll(staticAssets);
});

self.addEventListener('fetch', event => {
    const request = event.request;
    event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || fetch(request);
}