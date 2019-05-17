const staticAssets = [
    './',
    './manifest.webmanifest',
    './js/map.js',
    './css/drinkwater.css',
    './nls/strings.js',
    './nls/nl/strings.js',
    './images/BGW_40.png',
    './images/ic_menu_goto_red.png',
    './images/ic_menu_zoom.png',
    './images/favicon.ico',
    './images/icons/icon-57x57.png',
    './images/icons/icon-72x72.png',
    './images/icons/icon-76x76.png',
    './images/icons/icon-96x96.png',
    './images/icons/icon-114x114.png',
    './images/icons/icon-120x120.png',
    './images/icons/icon-128x128.png',
    './images/icons/icon-144x144.png',
    './images/icons/icon-152x152.png',
    './images/icons/icon-180x180.png',
    './images/icons/icon-192x192.png',
    './images/icons/icon-384x384.png',
    './images/icons/icon-512x512.png'
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