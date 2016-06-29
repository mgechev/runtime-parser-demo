## Introduction

In this section we're going to take a look at the App Shell Runtime Parser. This is a library which allows you to generate App Shell for your application, and cache it locally, in order to provide it instantly the next time your application is reloaded.

For instance, having the following HTML returned by the server:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Hello App Shell!</title>
</head>
<body>
  <header>
  </header>
</body>
</html>
```

Once the Runtime Parser process it, it will strip the elements marked with the attribute `shellNoRender` and produce the following output:

```html
...
```

Right after that the Runtime Parser will store the produced template locally, and provide it on each `GET` request where the requested resources matches a predefined set of routes.

## How it works?

This is especially useful when combined with the [App Shell](./app-shell.html) library and server-side rendering with [Universal](http://universal.angular.io). In a typical scenario, Universal will render the application with the `APP_SHELL_RUNTIME_PROVIDERS`. In such case all the directive `shellNoRender` will not strip the elements it is used on, but instead will only add `shellNoRender` attribute. Once the Runtime Parser gets a template where some of the elements are marked with `shellNoRender`, it will strip them and generate the actuall App Shell.

## Example

In order to get a better understanding of how everything actually works, lets take a look at the following example.

npm i @angular/core @angular/common @angular2-material/core @angular2-material/sidenav reflect-metadata systemjs rxjs@5.0.0-beta.6 zone.js@0.6.6
