importScripts(
    '/node_modules/reflect-metadata/Reflect.js',
    '/node_modules/systemjs/dist/system.js',
    './config.js');

var ngShellParser;

const SHELL_PARSER_CACHE_NAME = 'shell-cache';
const APP_SHELL_URL = '/shell.html';
const ROUTE_DEFINITIONS = [
      '/bar.html',
      '/index.html',
      '/profile/:id'
    ];

self.addEventListener('install', function (event) {
  const parser = System.import('@angular/app-shell')
    .then(module => {
      console.log(module);
      debugger;
      self.ngShellParser = module.shellParserFactory({
        APP_SHELL_URL,
        ROUTE_DEFINITIONS,
        SHELL_PARSER_CACHE_NAME
      });
      return ngShellParser;
    })
    .then(() => ngShellParser.fetchDoc())
    .then(res => ngShellParser.parseDoc(res))
    .then(strippedResponse => {
      return caches.open(SHELL_PARSER_CACHE_NAME)
        .then(cache => {
          return cache.put(APP_SHELL_URL, strippedResponse);
        });
    })
    .catch(e => {
      console.error(e);
    });
  event.waitUntil(parser);
});


self.addEventListener('fetch', function (event) {
  event.respondWith(
    ngShellParser.match(event.request)
      .then(response => {
        if (response) return response;
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            return fetch(event.request);
          })
      })
  );
});

