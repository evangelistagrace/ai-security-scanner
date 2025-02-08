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
import { ChartModule } from 'angular2-chartjs';
import { ChartComponent } from '../components/chart/chart.component';
import { SmartTableComponent } from '../components/smart-table/smart-table.component';
import { Ng2SmartTableModule } from 'ng2-smart-table';
import { TabViewModule } from 'primeng/tabview';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { MessagesModule } from 'primeng/messages';
import { DialogModule } from 'primeng/dialog';

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
    Ng2SmartTableModule,
    TabViewModule,
    RadioButtonModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    TagModule,
    MessagesModule,
    DialogModule,
    TableModule
  ],
  declarations: [
    DashboardComponent,
    ChartComponent,
    SmartTableComponent,
    
  ],
})
export class DashboardModule { }
