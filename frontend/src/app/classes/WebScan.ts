import { Vulnerability } from "./Vulnerability"

export interface WebScan {
    spiderScanId: string,
    activeScanId: string,
    vulnerabilities: Vulnerability[]
}