import { NetworkScan } from "./NetworkScan";
import { WebScan } from "./WebScan";

export interface ScanResult {
    webScan: WebScan,
    networkScan: NetworkScan
}