// Task Ledger service worker — caches the app shell so it loads with no network.
// Bump CACHE_NAME on every deploy that changes cached files, so clients pick up the update.
var CACHE_NAME = "task-ledger-v1";
var SHELL_FILES = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Network-first for the app shell so a live update is picked up when online,
// falling back to the cached copy when offline. Everything else (Firebase,
// Google Fonts) just passes through to the network untouched.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  var isShellRequest = url.origin === self.location.origin &&
    (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/manifest.json"));
  if (!isShellRequest) return;

  event.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        return cached || caches.match("./index.html");
      });
    })
  );
});
