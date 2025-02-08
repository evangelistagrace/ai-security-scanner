import { NgModule } from '@angular/core';
import {
  NbActionsModule,
  NbButtonModule,
  NbCardModule,
  NbTabsetModule,
  NbUserModule,
  NbRadioModule,
  NbSelectModule,
  NbListModule,
  NbIconModule,
} from '@nebular/theme';
import { NgxEchartsModule } from 'ngx-echarts';

import { ThemeModule } from '../../@theme/theme.module';
import { DashboardComponent } from './dashboard.component';
import { FormsModule } from '@angular/forms';
import { ChartjsPieComponent } from '../../pages/charts/chartjs/chartjs-pie.component';
import { ChartModule } from 'angular2-chartjs';
import { ChartComponent } from '../components/chart/chart.component';
import { SmartTableComponent } from '../components/smart-table/smart-table.component';
import { Ng2SmartTableModule } from 'ng2-smart-table';

@NgModule({
  imports: [
    FormsModule,
    ThemeModule,
    NbCardModule,
    NbUserModule,
    NbButtonModule,
    NbTabsetModule,
    NbActionsModule,
    NbRadioModule,
    NbSelectModule,
    NbListModule,
    NbIconModule,
    NbButtonModule,
    NgxEchartsModule,
    ChartModule,
    Ng2SmartTableModule
  ],
  declarations: [
    DashboardComponent,
    ChartComponent,
    SmartTableComponent,
    
  ],
})
export class DashboardModule { }
