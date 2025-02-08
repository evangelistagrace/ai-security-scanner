import { NgModule } from '@angular/core';
import { NbLayoutModule, NbMenuModule } from '@nebular/theme';

import { ThemeModule } from '../@theme/theme.module';
import { ProjectPagesRoutingModule } from './project-pages-routing.module';
import { ProjectPagesComponent } from './project-pages.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DashboardModule } from './dashboard/dashboard.module';
import { HeaderComponent } from './components/header/header.component';

const COMPONENTS = [
  ProjectPagesComponent,
  HeaderComponent
];

@NgModule({
  imports: [
    NbLayoutModule,
    ProjectPagesRoutingModule,
    ThemeModule,
    DashboardModule
  ],
  declarations: [
    [...COMPONENTS]
  ],
})
export class ProjectPagesModule {
}
