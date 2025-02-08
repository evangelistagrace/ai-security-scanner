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
      const chartjs: any = config.variables.chartjs;

      const colorMap: Record<string, string> = {
        "High": "#f13637",
        "Medium": "#fd8e39",
        "Low": "#f3bb1b",
        "Info": "#3f66fb"
      };    
      
      const mappedData = this.items.reduce((acc, item) => {
        if (!acc[item.riskText]) {
            acc[item.riskText] = { count: 0, color: colorMap[item.riskText] || "#3f66fb" };
        }
        acc[item.riskText].count += 1;
        return acc;
      }, {} as Record<string, { count: number; color: string }>);

      this.data = {
        labels: Object.keys(mappedData),
        datasets: [{
          data: Object.keys(mappedData).map(label => mappedData[label].count),
          backgroundColor: Object.keys(mappedData).map(label => mappedData[label].color),
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
