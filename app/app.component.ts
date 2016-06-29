import { Component } from '@angular/core';

import { NavComponent, PuppyListComponent } from './shared';

@Component({
  selector: 'puppy-app',
  template: `
    <app-nav>
      <a href="http://goo.gl/yrb58I">Pictures</a>
      <a href="http://goo.gl/o5QNin">Wiki</a>
    </app-nav>
    <puppy-list>
    </puppy-list>
  `,
  directives: [NavComponent, PuppyListComponent]
})
export class AppComponent {}

