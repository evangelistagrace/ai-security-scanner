import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class ScanService {
  private apiUrl = `http://localhost:3000/api`;
  
  constructor(private http: HttpClient) {}

  hello(target: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/hello`, {
      params: {
        target: target,
      },
    });
  }

  runFullScan(target: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/scan/full/${encodeURIComponent(target)}`
    );
  }

  runWebScan(target: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/scan/web/${encodeURIComponent(target)}`
    );
  }

  runNetworkScan(target: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/scan/network/${encodeURIComponent(target)}`
    );
  }
}
