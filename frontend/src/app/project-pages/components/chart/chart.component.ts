import { Component, Input, OnDestroy } from '@angular/core';
import { NbThemeService } from '@nebular/theme';
import { VulnerabilityTableItem } from '../../../classes/VulnerabilityTableItem';

@Component({
  selector: 'ngx-chart',
  styleUrls: ['./chart.component.scss'],
  template: `
    <chart type="pie" [data]="data" [options]="options"></chart>
  `,
})
export class ChartComponent implements OnDestroy {
  data: any;
  options: any;
  themeSubscription: any;

  @Input() items: VulnerabilityTableItem[] = [];

  constructor(private theme: NbThemeService) {
  }

  ngOnChanges() {
    this.themeSubscription = this.theme.getJsTheme().subscribe(config => {

      const colors: any = config.variables;
      const chartjs: any = config.variables.chartjs;

      this.data = {
        labels: [...this.items.map(a => a.riskText)],
        datasets: [{
          data: [300, 500, 100],
          backgroundColor: [colors.primaryLight, colors.infoLight, colors.successLight],
        }],
      };

      this.options = {
        maintainAspectRatio: false,
        responsive: true,
        scales: {
          xAxes: [
            {
              display: false,
            },
          ],
          yAxes: [
            {
              display: false,
            },
          ],
        },
        legend: {
          labels: {
            fontColor: chartjs.textColor,
          },
        },
      };
    });
  }

  ngOnDestroy(): void {
    this.themeSubscription.unsubscribe();
  }
}
