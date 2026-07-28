import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/services/config/config.token';

@Injectable({ providedIn: 'root' })
export class ApiVerificationService {
  private http = inject(HttpClient);
  private config = inject(APP_CONFIG);

  private get base(): string {
    return this.config.apiUrl + '/api/ews/api-verification';
  }

  udyamVerification(id_number: string): Observable<any> {
    return this.http.post(`${this.base}/udyog-aadhaar`, { id_number });
  }

  gstVerification(id_number: string): Observable<any> {
    return this.http.post(`${this.base}/gstin-advanced`, { id_number });
  }

  getCinByName(company_name_search: string): Observable<any> {
    return this.http.post(`${this.base}/name-to-cin-list`, { company_name_search });
  }

  getCompanyDetails(id_number: string): Observable<any> {
    return this.http.post(`${this.base}/company-details`, { id_number });
  }

  getDinDetails(id_number: string): Observable<any> {
    return this.http.post(`${this.base}/din`, { id_number });
  }

  getDinToPhone(id_number: string): Observable<any> {
    return this.http.post(`${this.base}/director-phone`, { id_number });
  }

  getPanToCin(pan_number: string): Observable<any> {
    return this.http.post(`${this.base}/pan-to-cin`, { pan_number });
  }

  getPanToGstin(id_number: string): Observable<any> {
    return this.http.post(`${this.base}/gstin-by-pan`, { id_number });
  }

  getReraStateList(): Observable<any> {
    return this.http.get(`${this.base}/rera/state-list`);
  }

  getReraDetails(registration_number: string, registration_type: string, state_name: string): Observable<any> {
    return this.http.post(`${this.base}/rera/rera-v2`, { registration_number, registration_type, state_name });
  }

  getKarnatakaLandRecords(payload: any): Observable<any> {
    return this.http.post(`${this.base}/land-verification/karnataka`, payload);
  }

  getGujaratLandRecords(payload: any): Observable<any> {
    return this.http.post(`${this.base}/land-verification/gujarat`, payload);
  }
}
