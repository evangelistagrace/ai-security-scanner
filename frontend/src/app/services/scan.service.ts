import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, interval, of, throwError } from "rxjs";
import {
  switchMap,
  takeWhile,
  catchError,
  map,
  takeUntil,
} from "rxjs/operators";
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

//   runFullScan(target: string): Observable<any> {
//     return this.http
//       .get<any>(`${this.apiUrl}/scan/full/${encodeURIComponent(target)}`)
//       .pipe(
//         switchMap((response: any) => {
//           return interval(1000).pipe(
//             switchMap(() => this.getScanStatus(response.scanId)),
//             takeWhile((response: any) =>
//               !response.some((msg: any) =>
//                 msg.message.includes("Network Scan Completed")
//               )
//             )
//           );
//         }),
//         catchError((error: any) =>
//           throwError(() => new Error(`Scan failed: ${error.message}`))
//         )
//       );
//   }

//   private getScanStatus(scanId: string): Observable<any> {
//     return this.http.get<any>(`${this.apiUrl}/scan/status/${scanId}`);
//   }

// runFullScan(target: string): Observable<any> {
//     return this.http.get<{ id: string }>(`${this.apiUrl}/scan/full/${encodeURIComponent(target)}`).pipe(
//       switchMap(response => this.pollScanStatus(response.id))
//     );
//   }

  private pollScanStatus(scanId: string): Observable<any> {
    return interval(1000).pipe(
      switchMap(() => this.http.get<any>(`${this.apiUrl}/scan/status/${scanId}`)),
      catchError(err => {
        // Check if the error indicates that the scan is complete.
        if (err.status === 404) {
          // Instead of erroring out, emit a final "scan complete" message.
          return of({
            message: 'Scan complete',
            timestamp: new Date(),
            type: 'success'
          } as any);
        }
        // Propagate any other errors.
        return throwError(err);
      })
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
