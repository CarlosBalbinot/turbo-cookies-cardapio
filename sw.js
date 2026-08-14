var CACHE = 'tc-v4'
var ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './cardapio.json',
  './manifest.json',
  './assets/logo.svg',
  './assets/splash-logo.png',
  './assets/192x192.png',
  './assets/256x256.png',
  './assets/icon.ico',
  './assets/1200x630.png'
]

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS) })
  )
  self.skipWaiting()
})

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE })
          .map(function (k) { return caches.delete(k) })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request)
    })
  )
})
