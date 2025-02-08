import { ReportStatus } from "./ReportStatus";
import { ScanResult } from "./ScanResult";

export interface ScanReport {
    status: ReportStatus,
    timestamp: string,
    target: string,
    results: ScanResult
}