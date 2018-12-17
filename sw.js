(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

const staticCacheName = 'mws-restaurant-static-v5';
const contentImgsCache = 'mws-restaurant-content-imgs';
const allCaches = [staticCacheName, contentImgsCache];
const urlsToCache = [
    '/',
    '/restaurant.html',
    'css/styles.css',
    'dist/utils.js',
    'dist/dbhelper.js',
    'dist/main.js',
    'dist/restaurant_info.js',
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon-2x.png',
    'https://unpkg.com/leaflet@1.3.1/dist/images/marker-shadow.png',
    'http://localhost:1337/restaurants'
];

self.addEventListener('install', function (event) {
    event.waitUntil(caches.open(staticCacheName).then(function (cache) {
        return cache.addAll(urlsToCache);
    }));
});

self.addEventListener('activate', function (event) {
    event.waitUntil(caches.keys().then(function (cacheNames) {
        return Promise.all(cacheNames.filter(function (cacheName) {
            return cacheName.startsWith('mws-restaurant-') && !allCaches.includes(cacheName);
        }).map(function (cacheName) {
            return caches['delete'](cacheName);
        }));
    }));
});

self.addEventListener('fetch', function (event) {
    const requestUrl = new URL(event.request.url);
    const server = new URL('http://localhost:1337/');

    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname.startsWith('/img/')) {
            event.respondWith(serveImage(event.request));
            return;
        }

        if(requestUrl.pathname.startsWith('/restaurant.html')) {
            event.respondWith(serveRestaurant(event.request));
            return;
        }
    }

    if (requestUrl.origin === server.origin) {
        const storageUrl = event.request.url.replace(/(restaurants)\/?\d+$/, '');
        console.log('Server storage URL: ', storageUrl);

        if(requestUrl.pathname.startsWith('/restaurants/')) {
            console.log('Server Origin: ', server, ', request url: ', requestUrl);
        }
    }

    event.respondWith(caches.match(event.request).then(function (response) {
        return response || fetch(event.request);
    }));
});

function serveImage(request) {
    const storageUrl = request.url.replace(/(_sm)?\.jpg$/, '');

    return caches.open(contentImgsCache).then(function (cache) {
        return cache.match(storageUrl).then(function (response) {
            if (response) return response;

            return fetch(request).then(function (networkResponse) {
                cache.put(storageUrl, networkResponse.clone());
                return networkResponse;
            });
        });
    });
}

function serveRestaurant(request) {
    const pageUrl = request.url;

    return caches.open(staticCacheName).then(function (cache) {
        return cache.match(pageUrl).then(function (response) {
            if (response) return response;

            return fetch(request).then(function (networkResponse) {
                cache.put(pageUrl, networkResponse.clone());
                return networkResponse;
            });
        });
    });
}

self.addEventListener('message', function (event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

},{}],2:[function(require,module,exports){
"use strict";

var r = FetchEvent.prototype.respondWith;
FetchEvent.prototype.respondWith = function () {
    return new URL(this.request.url).search.endsWith("bypass-sw") ? void 0 : r.apply(this, arguments);
};

},{}]},{},[1,2]);