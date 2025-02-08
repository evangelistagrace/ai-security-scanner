import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';

import { NotFoundComponent } from '../pages/miscellaneous/not-found/not-found.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProjectPagesComponent } from './project-pages.component';

const routes: Routes = [{
    path: '',
    component: ProjectPagesComponent,
    children: [    {
        path: 'dashboard',
        component: DashboardComponent,
      },]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectPagesRoutingModule {
}
