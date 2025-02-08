import {Component, OnDestroy} from '@angular/core';
import { NbThemeService } from '@nebular/theme';
import { takeWhile } from 'rxjs/operators' ;
import { SolarData } from '../../@core/data/solar';
import { ScanReport } from '../../classes/ScanReport';
import { VulnerabilityTableItem } from '../../classes/VulnerabilityTableItem';

interface CardSettings {
  title: string;
  iconClass: string;
  type: string;
}

@Component({
  selector: 'ngx-dashboard',
  styleUrls: ['./dashboard.component.scss'],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnDestroy {

  private alive = true;

  solarValue: number;
  lightCard: CardSettings = {
    title: 'Light',
    iconClass: 'nb-lightbulb',
    type: 'primary',
  };
  rollerShadesCard: CardSettings = {
    title: 'Roller Shades',
    iconClass: 'nb-roller-shades',
    type: 'success',
  };
  wirelessAudioCard: CardSettings = {
    title: 'Wireless Audio',
    iconClass: 'nb-audio',
    type: 'info',
  };
  coffeeMakerCard: CardSettings = {
    title: 'Coffee Maker',
    iconClass: 'nb-coffee-maker',
    type: 'warning',
  };

  statusCards: string;

  commonStatusCardsSet: CardSettings[] = [
    this.lightCard,
    this.rollerShadesCard,
    this.wirelessAudioCard,
    this.coffeeMakerCard,
  ];

  statusCardsByThemes: {
    default: CardSettings[];
    cosmic: CardSettings[];
    corporate: CardSettings[];
    dark: CardSettings[];
  } = {
    default: this.commonStatusCardsSet,
    cosmic: this.commonStatusCardsSet,
    corporate: [
      {
        ...this.lightCard,
        type: 'warning',
      },
      {
        ...this.rollerShadesCard,
        type: 'primary',
      },
      {
        ...this.wirelessAudioCard,
        type: 'danger',
      },
      {
        ...this.coffeeMakerCard,
        type: 'info',
      },
    ],
    dark: this.commonStatusCardsSet,
  };

  report: ScanReport = {
    status: {
      currentStage: "cve",
      stages: {
        spider: "completed",
        active: "completed",
        results: "completed",
        cve: "completed"
      }
    },
    target: "https://example.com",
    timestamp: "2025-02-08T11:52:37.542Z",
    results: {
      webScan: {
        spiderScanId: "12345",
        activeScanId: "67890",
        vulnerabilities: [
          {
            name: "SQL Injection",
            risk: "Medium",
            confidence: "Medium",
            description: "The response does not protect against 'ClickJacking' attacks. It should include either Content-Security-Policy with 'frame-ancestors' directive or X-Frame-Options.",
            solution: "Use parameterized queries",
            count: 1,
            cveIds: ["CVE-2022-1234"],
            cveKeyword: "Anti-clickjacking Header"
          }
        ]
      },
      networkScan: {
        host: "192.168.1.10",
        ports: [
          { "port": 22, "state": "filtered", "service": "SSH", risk: "Info" },
          { "port": 80, "state": "open", "service": "HTTP", risk: "High" }
        ],
        os: "Linux"
      }
    }
  };

  webVulnerabilities: VulnerabilityTableItem[] = this.report.results.webScan.vulnerabilities.map(a => <VulnerabilityTableItem>
    {
      risk: this.getHtmlCode(a.risk),
      riskText: a.risk,
      name: a.name,
      type: "Web",
      count: a.count
    }
  );

  networkVulnerabilities: VulnerabilityTableItem[] = this.report.results.networkScan.ports.map(a => <VulnerabilityTableItem>
    {
      risk: this.getHtmlCode(a.risk),
      riskText: a.risk,
      name: `Port ${a.port} opened`,
      type: "Network",
      count: 1
    }
  );

  dataTableItems = [
    ...this.webVulnerabilities,
    ...this.networkVulnerabilities
  ]

  getHtmlCode(text: string) {
    const code = text == "High" ? `<div class="d-flex justify-content-center"><div class="table-item high">${text}</div></div>` 
              : text == "Medium" ? `<div class="d-flex justify-content-center"><div class="table-item medium">${text}</div></div>`
              : text == "Low" ? `<div class="d-flex justify-content-center"><div class="table-item low">${text}</div></div>`
              : `<div class="d-flex justify-content-center"><div class="table-item info">${text}</div></div>`;
    return code;
  }

  constructor(private themeService: NbThemeService,
              private solarService: SolarData) {
    this.themeService.getJsTheme()
      .pipe(takeWhile(() => this.alive))
      .subscribe(theme => {
        this.statusCards = this.statusCardsByThemes[theme.name];
    });

    this.solarService.getSolarData()
      .pipe(takeWhile(() => this.alive))
      .subscribe((data) => {
        this.solarValue = data;
      });
  }

  ngOnDestroy() {
    this.alive = false;
  }
}
