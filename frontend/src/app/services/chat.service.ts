import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ChatService {
  private apiUrl = "http://localhost:3000/api";

  constructor(private http: HttpClient) {}

  sendMessage(message: string, scanResults: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/chat`, {
      message,
      scanResults,
    });
  }

  getSummary(
    target: string,
    timestamp: string,
    scanResults: any[]
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/summary`, {
      target,
      timestamp,
      scanResults,
    });
  }
}
