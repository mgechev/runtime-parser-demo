System.config({
  defaultJSExtensions: true,
  map: {
    '@angular': '/node_modules/@angular',
    'rxjs': '/node_modules/rxjs'
  },
  packages: {
    './dist/shared': {
      main: './index',
      defaultExtension: 'js'
    },
    '@angular/core': {
      main: 'bundles/core.umd.js',
      defaultExtension: 'js'
    },
    '@angular/common': {
      main: 'bundles/common.umd.js',
      defaultExtension: 'js'
    },
    '@angular/compiler': {
      main: 'bundles/compiler.umd.js',
      defaultExtension: 'js'
    },
    '@angular/platform-browser': {
      main: 'bundles/platform-browser.umd.js',
      defaultExtension: 'js'
    },
    '@angular/platform-browser-dynamic': {
      main: 'bundles/platform-browser-dynamic.umd.js',
      defaultExtension: 'js'
    },
    '@angular/app-shell': {
      main: 'index.js',
      defaultExtension: 'js'
    },
    'rxjs': {
      defaultExtension: 'js'
    }
  }
});

