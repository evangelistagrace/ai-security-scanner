import { Component, OnDestroy, OnInit } from "@angular/core";
import { NbThemeService } from "@nebular/theme";
import { scan, takeWhile } from "rxjs/operators";
import { SolarData } from "../../@core/data/solar";
import { ScanReport } from "../../classes/ScanReport";
import { VulnerabilityTableItem } from "../../classes/VulnerabilityTableItem";
import { ScanService } from "../../services/scan.service";

interface CardSettings {
  title: string;
  iconClass: string;
  type: string;
}

@Component({
  selector: "ngx-dashboard",
  styleUrls: ["./dashboard.component.scss"],
  templateUrl: "./dashboard.component.html",
})
export class DashboardComponent implements OnInit, OnDestroy {
  private alive = true;
  // report: ScanReport = null;
  // dataTableItems: VulnerabilityTableItem[] = [];
  tableCount: number = 0;
  public scanTarget: string = "https://example.com";
  public scanType: string = "full";
  selectedCities: string[] = [];
  ingredient!: string;


  statusCards: string;


  report: ScanReport = {
    status: {
      currentStage: "cve",
      stages: {
        spider: "completed",
        active: "completed",
        results: "completed",
        cve: "completed",
      },
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
            risk: "High",
            confidence: "Medium",
            description:
              "The response does not protect against 'ClickJacking' attacks. It should include either Content-Security-Policy with 'frame-ancestors' directive or X-Frame-Options.",
            solution: null,
            count: 1,
            cveIds: ["CVE-2022-1234"],
            cveKeyword: "Anti-clickjacking Header",
          },
        ],
      },
      networkScan: {
        host: "192.168.1.10",
        ports: [
          { port: 22, state: "filtered", service: "SSH", risk: "Info" },
          { port: 80, state: "open", service: "HTTP", risk: "High" },
        ],
        os: "Linux",
      },
    },
  };

  webVulnerabilities: VulnerabilityTableItem[] =
    this.report.results.webScan.vulnerabilities.map(
      (a) =>
        <VulnerabilityTableItem>{
          risk: this.getHtmlCode(a.risk),
          riskText: a.risk,
          description: a.description,
          solution: a.solution,
          name: a.name,
          type: "Web",
          count: a.count,
        }
    );

  networkVulnerabilities: VulnerabilityTableItem[] =
    this.report.results.networkScan.ports.map(
      (a) =>
        <VulnerabilityTableItem>{
          risk: this.getHtmlCode(a.risk),
          riskText: a.risk,
          name: `Port ${a.port} opened`,
          type: "Network",
          count: 1,
        }
    );

  dataTableItems = [...this.webVulnerabilities, ...this.networkVulnerabilities];

  getHtmlCode(text: string) {
    const code =
      text == "High"
        ? `<div class="table-item high">${text}</div>`
        : text == "Medium"
        ? `<div class="table-item medium">${text}</div>`
        : text == "Low"
        ? `<div class="table-item low">${text}</div>`
        : `<div class="table-item info">${text}</div>`;
    return code;
  }

  constructor(
    private themeService: NbThemeService,
    private solarService: SolarData,
    private scanService: ScanService
  ) {
  }

  ngOnInit(): void {
    this.scanService.hello("edsf").subscribe({
      next: (response) => console.log(response.message),
    });
    //console.log(this.dataTableItems);
  }

  ngOnDestroy() {
    this.alive = false;
  }
}
