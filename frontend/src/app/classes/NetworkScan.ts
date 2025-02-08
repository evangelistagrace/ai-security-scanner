import { Port } from "./Port";

export interface NetworkScan {
    host: string,
    ports: Port[],
    os: string
}