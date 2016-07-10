importScripts(
  '/node_modules/reflect-metadata/Reflect.js',
  '/node_modules/systemjs/dist/system.js',
  './system-config.js'
);

let ngShellParser: any;

const SHELL_PARSER_CACHE_NAME = 'shell-cache';
const APP_SHELL_URL = '/shell.html';
const ROUTE_DEFINITIONS = [
      '/bar.html',
      '/index.html',
      '/profile/:id'
    ];
const INLINE_IMAGES: string[] = ['png', 'svg', 'jpg'];

self.addEventListener('install', function (event: any) {
  const parser = System.import('@angular/app-shell')
    .then(module => {
      ngShellParser = module.shellParserFactory({
        APP_SHELL_URL,
        ROUTE_DEFINITIONS,
        SHELL_PARSER_CACHE_NAME,
        INLINE_IMAGES
      });
      return ngShellParser;
    })
    .then(() => ngShellParser.fetchDoc())
    .then(res => {
      return ngShellParser.parseDoc(res);
    })
    .then(strippedResponse => {
      strippedResponse.clone()
        .text()
        .then((t: string) => console.log(t));
      return (<any>self).caches.open(SHELL_PARSER_CACHE_NAME)
        .then((cache: any) => {
          strippedResponse
            .clone()
            .text()
            .then((txt: string) => console.log(txt));
          return cache.put(APP_SHELL_URL, strippedResponse);
        });
    })
    .catch(e => {
      console.error(e);
    });
  event.waitUntil(parser);
});


self.addEventListener('fetch', function (event: any) {
  event.respondWith(
    ngShellParser.match(event.request)
      .then((response: any) => {
        if (response) return response;
        return (<any>self).caches.match(event.request)
          .then((response: any) => {
            if (response) {
              return response;
            }
            return (<any>self).fetch(event.request);
          })
      })
  );
});

