# Introduction

Now we're going to take a look at another part of the Angular Mobile Toolkit - the App Shell Runtime Parser. The Runtime Parser is a library which automatically generates the App Shell of our application and caches it locally. This way once the user navigates to a page in our application she will instantly get a minimum working UI. You can find more about the application shell concept in the context of PWA on the [following link](https://developers.google.com/web/updates/2015/11/app-shell?hl=en).

# Introduction to the Runtime Parser

The Angular App Shell Runtime Parser works in together with the App Shell directives, described in the [previous section](https://mobile.angular.io/guides/app-shell.html), and [Angular Universal](https://universal.angular.io).

Now lets explore the basic features of the parser!

First, lets suppose we have the following "Hello Mobile" component:

```ts
import { Component } from '@angular/core';
import { APP_SHELL_DIRECTIVES } from '@angular/app-shell';
import { MdToolbar } from '@angular2-material/toolbar';
import { MdSpinner } from '@angular2-material/progress-circle';

@Component({
  moduleId: module.id,
  selector: 'hello-mobile-app',
  template: `
    <md-toolbar>
      <div class="icon ng"></div>
      {{title}}
    </md-toolbar>
    <md-spinner *shellRender></md-spinner>
    <h1 *shellNoRender>App is Fully Rendered</h1>
  `,
  styles: [`
    md-spinner {
      margin: 24px auto 0;
    }
    .icon {
      width: 40px;
      height: 40px;
      display: inline-block;
    }
    .icon.ng {
      background-image: url(./images/angular.png);
    }
  `],
  directives: [APP_SHELL_DIRECTIVES, MdToolbar, MdSpinner]
})
export class HelloMobileAppComponent {
  title = 'Hello Mobile';
}
```

And in Universal, we bootstrap our application in the following way:

```ts
import { provide } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { APP_SHELL_RUNTIME_PROVIDERS } from '@angular/app-shell';
import { HelloMobileAppComponent } from './app/';
import {
  REQUEST_URL,
  ORIGIN_URL
} from 'angular2-universal';

export const options = {
  directives: [
    // The component that will become the main App Shell
    HelloMobileAppComponent
  ],
  platformProviders: [
    APP_SHELL_BUILD_PROVIDERS,
    provide(ORIGIN_URL, {
      useValue: ''
    })
  ],
  providers: [
    // What URL should Angular be treating the app as if navigating
    provide(APP_BASE_HREF, {useValue: '/'}),
    provide(REQUEST_URL, {useValue: '/'})
  ],
  async: false,
  preboot: false
};
```

In the example above, we prerender the component using Universal and the `APP_SHELL_RUNTIME_PROVIDERS`. Once the user opens the our application she will see the following:

![](/images/prerendered-universal.png)

This is how the app will look once it has been completely rendered as well. However, for our App Shell we want to use only the minimal UI which shows that the app is actually working, and initializing. One way to do this is by using the `APP_SHELL_BUILD_PROVIDERS` instead of `APP_SHELL_RUNTIME_PROVIDERS`. This way Universal will strip the content marked with the `shellNoRender` directive and output only the part of the application that is intended to be visualized as part of the Application Shell.

Unfortunately, this way we introduce the following problems:

- We cannot reuse the given page as App Shell for other routes in our application.
- We must annotate each individual page in our application with `shellRender` and `shellNoRender` directives.

On top of that if the final App Shell has references to an external images users with slow Internet connection will not have the best experience possible. For instance, in the example above the Angular logo in the header is an external resource which needs to be fetched through the network.

By using the Angular Runtime App Shell Parser in a Service Worker we can solve all of these issues! Now lets see how we can enhance the experience of our users!

# Exploring the Runtime Parser

Lets take a look at a sample Service Worker which uses the Runtime Parser:

```ts
importScripts(
  '/node_modules/reflect-metadata/Reflect.js',
  '/node_modules/systemjs/dist/system.js',
  './system-config.js'
);

let ngShellParser: any;

const SHELL_PARSER_CACHE_NAME = 'app-shell:cache';
const APP_SHELL_URL = '/shell.html';
const ROUTE_DEFINITIONS = [
      '/home',
      '/about/:id',
    ];
const INLINE_IMAGES: string[] = ['png', 'svg', 'jpg'];

self.addEventListener('install', function (event: any) {
  const parser = System.import('@angular/app-shell')
    .then(module => {
      ngShellParser = module.shellParserFactory({
        APP_SHELL_URL,
        ROUTE_DEFINITIONS,
        INLINE_IMAGES
      });
      return ngShellParser;
    })
    .then(() => ngShellParser.fetchDoc())
    .then(res => ngShellParser.parseDoc(res))
    .then(strippedResponse => {
      return (<any>self).caches.open(SHELL_PARSER_CACHE_NAME)
        .then((cache: any) => cache.put(APP_SHELL_URL, strippedResponse));
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
```

Since there's quite a logic in the snippet above, lets explore it step-by-step:

## Step 1 - Configuration

```ts
let ngShellParser: any;

const SHELL_PARSER_CACHE_NAME = 'app-shell:cache';
const APP_SHELL_URL = '/shell.html';
const ROUTE_DEFINITIONS = [
      '/home',
      '/about/:id',
    ];
const INLINE_IMAGES: string[] = ['png', 'svg', 'jpg'];
```

First, we declare a global variable called `ngShellParser`. As its value we are going to set the instance of the App Shell Runtime Parser once it has been loaded.

The `SHELL_PARSER_CACHE_NAME` is the name of the cache which we are going to use in order to store the App Shell once it has been generated.

The `APP_SHELL_URL` is the page that we are going to generate our App Shell from.

As next step of the declarations above we set of routes that we want to be handled by the parser. For instance, once the user visits the page `/home` the first thing that we're going to do is to render the cached App Shell. Right after the page has been initialized and all the associated to it external resources are available its content will be rendered on the place of the app shell. As we can see from the route `/about/:id`, the `ROUTE_DEFINITIONS` support wildcard, similarly to the Angular's router.

Since our final goal is to render the App Shell as quickly as possible, we want to inline all the referenced within its elements resources. The final step of our declarations is the `INLINE_IMAGES` array. It provides a list of extensions of images that we want to be inlined automatically.

## Step 2 - Handling the install event

As next step, lets see how we are going to handle the Service Worker's `install` event:

```ts
self.addEventListener('install', function (event: any) {
  const parser = System.import('@angular/app-shell')
    .then(module => {
      ngShellParser = module.shellParserFactory({
        APP_SHELL_URL,
        ROUTE_DEFINITIONS,
        INLINE_IMAGES
      });
      return ngShellParser;
    })
    .then(() => ngShellParser.fetchDoc())
    .then(res => ngShellParser.parseDoc(res))
    .then(strippedResponse => {
      return (<any>self).caches.open(SHELL_PARSER_CACHE_NAME)
        .then((cache: any) => cache.put(APP_SHELL_URL, strippedResponse));
    })
    .catch(e => {
      console.error(e);
    });
  event.waitUntil(parser);
});
```

Once the Service Worker's install event has been triggered, we load the Runtime Parser using SystemJS and instantiate it with the `shellParserFactory` method. Notice that as arguments to the factory method we pass an object literal with the constants that we defined above.

Right after we instantiate the Runtime Parser, we invoke its `fetchDoc` method. The `fetchDoc` method is going to make an HTTP GET request to the `APP_SHELL_URL` that we declared above.

Once we've successfully fetched the page that is intended to be used as an App Shell, we invoke the `parseDoc` method. This method will perform all the required transformations over the fetched template, in order to generate the final application shell.

Finally, when the `parseDoc`'s execution completes, we cache the app shell locally.

### Template Transformations

In order to get a better understanding of what is going on behind the scene, lets take a look at the response that Universal is going to return once we make a request to `APP_SHELL_URL`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title></title>
  <style>
    md-spinner[_ngcontent-vkb-1] {
      margin: 24px auto 0;
    }
    .icon[_ngcontent-vkb-1] {
      width: 40px;
      height: 40px;
      display: inline-block;
      margin-right: 5px;
      background-size: 40px 40px;
    }
    .icon.ng[_ngcontent-vkb-1] {
      background-image: url(./assets/angular.png);
    }
  </style>
  <style>
  </style>
  /* Angular 2 mobile styles */
  <style>
  /* Angular 2 mobile styles */
  </style>
</head>
<body>
  <hello-mobile-app _nghost-vkb-1="">
    <md-toolbar _ngcontent-vkb-1=""><div class="md-toolbar-layout"> <md-toolbar-row>
      <div _ngcontent-vkb-1="" class="icon ng"></div>
      Hello Mobile
     </md-toolbar-row>  </div></md-toolbar>
    <!--template bindings={}--><!--shellRender(<md-spinner _ngcontent-vkb-1="" mode="indeterminate" role="progressbar" _nghost-vkb-3=""> <svg _ngcontent-vkb-3="" preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 100"> <path _ngcontent-vkb-3=""></path> </svg> </md-spinner>)-->
    <!--template bindings={}--><h1 _ngcontent-vkb-1="" shellNoRender="">App is Fully Rendered</h1>
  </hello-mobile-app>
</body>
</html>
```

We can notice the following things:

- Inside the `hello-mobile-app` element the app shell of the application is wrapped inside `<!--shellRender(...)-->`.
- The part of the template which should not be part of the application shell is annotated with the `shellNoRender` attribute.

Once we invoke the `parseDoc` method of the Runtime Parser with a response with body the HTML above, the following actions will be performed:

- All the referenced within the template images that match any of the extensions defined in `INLINE_IMAGES` will be inlined as base64 strings.
- All the elements annotated with `shellNoRender` attribute will be stripped.
- The content of all `<!--shellRender(...)-->` comments will be used as part of the application shell.

## Step 3 - Handling the Fetch Event

As final step, lets see how our Service Worker is going to handles the `fetch` event:

```html
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
```

Once the `fetch` event is triggered, we match the request using the `match` method of the Runtime Parser. In case the URL of the request matches any of the routes defined in `ROUTE_DEFINITIONS`, as response we are going to get the App Shell from the cache. Otherwise, we are going to fallback to the network.

## Example

Lets suppose the user navigates to `/about/42`. This action will trigger the `fetch` method of the App Shell Service Worker, which will invoke the callback that we've registered above. Inside of it, we'll pass the target request to the `match` method of the Runtime Parser. Since in the `ROUTE_DEFINITIONS` we have the route definition `/about/:id` the request will be matched and the Runtime Parser will return a response with body the application cached from the cache with name `SHELL_PARSER_CACHE_NAME`.

