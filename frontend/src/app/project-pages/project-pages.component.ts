import { Component } from '@angular/core';

@Component({
  selector: 'ngx-project-pages',
  styleUrls: ['project-pages.component.scss'],
  template: `
  <nb-layout windowMode>
    <nb-layout-header fixed>
      <ngx-project-header></ngx-project-header>
    </nb-layout-header>

    <nb-layout-column>
      <router-outlet></router-outlet>
    </nb-layout-column>
  </nb-layout>
  `,
})
export class ProjectPagesComponent {
}
