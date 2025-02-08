import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { NbThemeService } from "@nebular/theme";
import { scan, takeWhile } from "rxjs/operators";
import { SolarData } from "../../@core/data/solar";
import { ScanReport } from "../../classes/ScanReport";
import { VulnerabilityTableItem } from "../../classes/VulnerabilityTableItem";
import { ScanService } from "../../services/scan.service";
import { ChatService } from "../../services/chat.service";
import { Message } from 'primeng/api';

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
  public scanTarget: string = "http://www.itsecgames.com/";
  public scanType: string = "full";
  public scanMessages: any[] = [];
  // scanMessages: ScanMessage[] = [];
  private destroy$ = new Subject<void>();
  public scanResults: any[] = [];
  messages: any[] = [];
  currentMessage: string = "";
  messages1: Message[] | undefined;
  summary: string = "";
  visible: boolean = false;

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
  //sample table data
  sampleResponse = {
    status: {
      currentStage: "network",
      stages: {
        spider: "completed",
        active: "completed",
        results: "completed",
        cve: "completed",
        network: "completed",
      },
    },
    target: "http://www.itsecgames.com/",
    timestamp: "2025-02-08T21:21:34.911Z",
    results: {
      webscan: {
        spiderScanId: "1",
        activeScanId: "1",
        vulnerabilities: [
          {
            name: "Content Security Policy (CSP) Header Not Set",
            risk: "Medium",
            confidence: "High",
            description:
              "Content Security Policy (CSP) is an added layer of security that helps to detect and mitigate certain types of attacks, including Cross Site Scripting (XSS) and data injection attacks. These attacks are used for everything from data theft to site defacement or distribution of malware. CSP provides a set of standard HTTP headers that allow website owners to declare approved sources of content that browsers should be allowed to load on that page — covered types are JavaScript, CSS, HTML frames, fonts, images and embeddable objects such as Java applets, ActiveX, audio and video files.",
            solution:
              "Ensure that your web server, application server, load balancer, etc. is configured to set the Content-Security-Policy header.",
            count: 7,
            cveKeyword: "Content Security Policy Header",
            cveIds: [
              "CVE-2011-2990",
              "CVE-2012-0451",
              "CVE-2016-5739",
              "CVE-2016-5135",
              "CVE-2017-7803",
              "CVE-2019-1955",
              "CVE-2019-12706",
              "CVE-2019-19002",
              "CVE-2020-26287",
              "CVE-2022-24814",
              "CVE-2023-27592",
              "CVE-2023-23602",
              "CVE-2023-43657",
              "CVE-2024-0310",
              "CVE-2024-32970",
              "CVE-2023-38122",
              "CVE-2023-38125",
              "CVE-2024-55888",
            ],
          },
          {
            name: "Missing Anti-clickjacking Header",
            risk: "Medium",
            confidence: "Medium",
            description:
              "The response does not protect against 'ClickJacking' attacks. It should include either Content-Security-Policy with 'frame-ancestors' directive or X-Frame-Options.",
            solution:
              "Modern Web browsers support the Content-Security-Policy and X-Frame-Options HTTP headers. Ensure one of them is set on all web pages returned by your site/app.\nIf you expect the page to be framed only by pages on your server (e.g. it's part of a FRAMESET) then you'll want to use SAMEORIGIN, otherwise if you never expect the page to be framed, you should use DENY. Alternatively consider implementing Content Security Policy's \"frame-ancestors\" directive.",
            count: 5,
            cveKeyword: "Anti-clickjacking Header",
            cveIds: [],
          },
          {
            name: "X-Content-Type-Options Header Missing",
            risk: "Low",
            confidence: "Medium",
            description:
              "The Anti-MIME-Sniffing header X-Content-Type-Options was not set to 'nosniff'. This allows older versions of Internet Explorer and Chrome to perform MIME-sniffing on the response body, potentially causing the response body to be interpreted and displayed as a content type other than the declared content type. Current (early 2014) and legacy versions of Firefox will use the declared content type (if one is set), rather than performing MIME-sniffing.",
            solution:
              "Ensure that the application/web server sets the Content-Type header appropriately, and that it sets the X-Content-Type-Options header to 'nosniff' for all web pages.\nIf possible, ensure that the end user uses a standards-compliant and modern web browser that does not perform MIME-sniffing at all, or that can be directed by the web application/web server to not perform MIME-sniffing.",
            count: 36,
            cveKeyword: "X-Content-Type-Options Header",
            cveIds: [
              "CVE-2019-11464",
              "CVE-2019-19089",
              "CVE-2023-36918",
              "CVE-2023-4338",
              "CVE-2024-43445",
            ],
          },
          {
            name: "Information Disclosure - Suspicious Comments",
            risk: "Informational",
            confidence: "Low",
            description:
              "The response appears to contain suspicious comments which may help an attacker. Note: Matches made within script blocks or files are against the entire content not only comments.",
            solution:
              "Remove all comments that return information that may help an attacker and fix any underlying problems they refer to.",
            count: 1,
            cveIds: [],
          },
        ],
      },
      networkscan: {
        host: "31.3.96.40",
        ports: [
          { port: 22, state: "open", service: "SSH", risk: "Medium" },
          { port: 53, state: "open", service: "DOMAIN", risk: "High" },
          { port: 80, state: "filtered", service: "HTTP", risk: "High" },
          { port: 443, state: "open", service: "HTTPS", risk: "Medium" },
        ],
      },
    },
  };

  dataTableItems = [];

  sampleSummary = `
  
  ### Web Vulnerabilities:
- **Content Security Policy (CSP) Header Not Set** (Risk Level: Medium)
  - Description: Lack of CSP header exposes the site to XSS and data injection attacks.
  - Affected Areas: Headers
  - Recommended Fix: Configure web server to set Content-Security-Policy header.

- **Missing Anti-clickjacking Header** (Risk Level: Medium)
  - Description: Vulnerable to ClickJacking attacks due to missing protection headers.
  - Affected Areas: Response headers
  - Recommended Fix: Implement Content-Security-Policy or X-Frame-Options headers.

- **X-Content-Type-Options Header Missing** (Risk Level: Low)
  - Description: Allows MIME-sniffing, potentially leading to content misinterpretation.
  - Affected Areas: Response headers
  - Recommended Fix: Set X-Content-Type-Options header to 'nosniff'.

### Network Risks:
- **Port 22 (SSH) - Risk: Medium**
  - Open SSH service vulnerable to brute-force attacks.
  - Recommended Fix: Restrict access via firewall rules or enforce strong authentication.

- **Port 53 - Risk: High**
  - Open port exposes DNS service, posing a significant security risk.
  - Recommended Fix: Investigate and secure the DNS service to prevent unauthorized access.

- **Port 80 - Risk: High**
  - Filtered port indicates potential firewall misconfiguration or blocking.
  - Recommended Fix: Verify firewall settings and ensure proper port access.

- **Port 443 - Risk: Medium**
  - Open port for HTTPS traffic, requiring secure configuration.
  - Recommended Fix: Implement SSL/TLS best practices and monitor for vulnerabilities.

### Conclusion & Next Steps:
Based on the scan results, immediate actions should focus on implementing missing security headers (CSP, Anti-clickjacking, X-Content-Type-Options) to mitigate web vulnerabilities. Additionally, securing open ports 53 and 80 is crucial to prevent unauthorized access and potential attacks. Further investigation is needed to address the network risks and ensure a robust security posture for the scanned target URL/IP.
  
  `

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
    private scanService: ScanService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.messages1 = [
      { severity: 'info', summary: 'Info', detail: 'Message Content' },
  ];
    this.scanResults = this.sampleResponse.results.webscan.vulnerabilities.map(
      (vuln) => ({
        name: vuln.name,
        risk: vuln.risk,
        confidence: vuln.confidence,
        description: vuln.description,
        solution: vuln.solution,
        count: vuln.count,
        cveIds: vuln.cveIds,
      })
    );

    // map network scan results to scanResults
    this.sampleResponse.results.networkscan.ports.forEach((port: any) => {
      this.scanResults.push({
        name: `Port ${port.port} ${port.state}`,
        risk: port.risk,
        confidence: "N/A",
        description: `Port ${port.port} is ${port.state}`,
        solution: "N/A",
        count: 1,
        cveIds: [],
      });
    });

    this.dataTableItems = this.scanResults.map(
      (a) =>
        <VulnerabilityTableItem>{
          risk: this.getHtmlCode(a.risk),
          riskText: a.risk,
          name: a.name,
          type: a.cveIds.length > 0 ? "Web" : "Network",
          count: a.count,
        }
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startScan() {
    this.scanService.runFullScan(this.scanTarget).subscribe({
      next: (response) => {
        console.log(response);
        this.scanMessages.push("Scan completed");
        this.scanResults = response.results.webscan.vulnerabilities.map(
          (vuln) => ({
            name: vuln.name,
            risk: vuln.risk,
            confidence: vuln.confidence,
            description: vuln.description,
            solution: vuln.solution,
            count: vuln.count,
            cveIds: vuln.cveIds,
          })
        );

        // map network scan results to scanResults
        response.results.networkscan.ports.forEach((port: any) => {
          this.scanResults.push({
            name: `Port ${port.port} ${port.state}`,
            risk: port.risk,
            confidence: "N/A",
            description: `Port ${port.port} is ${port.state}`,
            solution: "N/A",
            count: 1,
            cveIds: [],
          });
        });

        //get AI summary
        this.chatService.getSummary(this.scanTarget, response.timestamp, this.scanResults).subscribe({
          next: (response) => {
            console.log(response.response);
            this.summary = response.response;
            this.messages1 = [
              { severity: 'info', summary: 'Info', detail: response.response },
            ];

          },
        });
      },
    });
  }

  getSeverity(risk: string): string {
    switch (risk.toLowerCase()) {
      case "high":
        return "danger"; // Red tag for high risk
      case "medium":
        return "warning"; // Orange tag for medium risk
      case "low":
        return "info"; // Blue tag for low risk
      default:
        return "success"; // Green tag for no risk
    }
  }

  sendMessage() {
    if (!this.currentMessage.trim()) return;
  
    // Add user message to chat
    this.messages.push({
      text: this.currentMessage,
      sender: 'user',
      timestamp: new Date()
    });
  
    // Send to backend
    this.chatService.sendMessage(this.currentMessage, this.scanResults)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messages.push({
            text: response.response,
            sender: 'assistant',
            timestamp: new Date()
          });
        },
        error: (error) => {
          console.error('Chat error:', error);
        }
      });
  
    this.currentMessage = '';
  }

  showSummary() {
    this.visible = true;
  }
}
