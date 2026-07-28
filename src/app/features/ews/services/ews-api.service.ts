import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/services/config/config.token';

@Injectable({ providedIn: 'root' })
export class EwsApiService {
  private http = inject(HttpClient);
  private config = inject(APP_CONFIG);

  private get base(): string {
    return this.config.apiUrl + '/api/ews';
  }

  // ── Accounts ──────────────────────────────────────────────────
  getAllAccounts(params?: { page?: number; limit?: number; search?: string; branch?: string; flagged?: string }): Observable<{ total: number; data: any[] }> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<{ total: number; data: any[] }>(`${this.base}/accounts`, { params: httpParams });
  }
  updateAccountData(accountId: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/accounts/${accountId}`, data);
  }

  // ── Signals ──────────────────────────────────────────────────
  getSignals(params?: { category?: string; enabled?: boolean }): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/signals`, { params: params as any });
  }
  getManualSignals(params?: { category?: string; enabled?: boolean }): Observable<any[]> {
    return this.getSignals(params);
  }
  updateSignal(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.base}/signals/${id}`, data);
  }
  toggleSignal(id: number, enabled: boolean): Observable<any> {
    return this.updateSignal(id, { enabled });
  }
  toggleAllSignals(enabled: boolean): Observable<any> {
    return this.http.patch(`${this.base}/signals/toggle-all`, { enabled });
  }
  getQuestionSignalMappings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/loan-questions`);
  }
  // ── Masters ───────────────────────────────────────────────────
  getBranches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/branches`);
  }
  createBranch(data: any): Observable<any> {
    return this.http.post(`${this.base}/branches`, data);
  }
  updateBranch(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.base}/branches/${id}`, data);
  }
  deleteBranch(id: number): Observable<any> {
    return this.http.delete(`${this.base}/branches/${id}`);
  }

  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/roles`);
  }
  createRole(data: any): Observable<any> {
    return this.http.post(`${this.base}/roles`, data);
  }
  updateRole(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.base}/roles/${id}`, data);
  }
  deleteRole(id: number): Observable<any> {
    return this.http.delete(`${this.base}/roles/${id}`);
  }

  getLoanQuestions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/loan-questions`);
  }
  
  createLoanQuestion(data: any): Observable<any> {
    return this.http.post(`${this.base}/loan-questions`, data);
  }
  
  updateLoanQuestion(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/loan-questions/${id}`, data);
  }

  deleteLoanQuestion(id: number): Observable<any> {
    return this.http.delete(`${this.base}/loan-questions/${id}`);
  }

  getAccountQuestions(accountId: string, dumpId?: number | null): Observable<any[]> {
    // Use account_id string via query param to avoid route collision with :id
    let params = new HttpParams().set('account_id', accountId);
    return this.http.get<any[]>(`${this.base}/loan-questions/for-account`, { params });
  }

  saveAccountAnswers(dumpId: number, answers: any[], answeredBy: string): Observable<any> {
    return this.http.post(`${this.base}/loan-questions/answers/${dumpId}`, { answers, answered_by: answeredBy });
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/users`);
  }
  createUser(data: any): Observable<any> {
    return this.http.post(`${this.base}/users`, data);
  }
  updateUser(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.base}/users/${id}`, data);
  }
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.base}/users/${id}`);
  }

  // ── Watch List ────────────────────────────────────────────────
  getWatchList(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => v && (params = params.set(k, v as string)));
    return this.http.get<any[]>(`${this.base}/watch-list`, { params });
  }
  getAccountDetails(id: number): Observable<any> {
    return this.http.get(`${this.base}/watch-list/${id}/details`);
  }
  getDumpAccountDetails(id: number): Observable<any> {
    return this.http.get(`${this.base}/watch-list/dump/${id}/details`);
  }
  getWatchListStats(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => v && (params = params.set(k, v as string)));
    return this.http.get(`${this.base}/watch-list/stats`, { params });
  }
  getBranchStats(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => v && (params = params.set(k, v as string)));
    return this.http.get<any[]>(`${this.base}/watch-list/branch-stats`, { params });
  }
  addToWatchList(data: any): Observable<any> {
    return this.http.post(`${this.base}/watch-list`, data);
  }
  updateWatchListStatus(id: number, status: string, updatedBy: string, remarks?: string): Observable<any> {
    return this.http.patch(`${this.base}/watch-list/${id}/status`, { status, updated_by: updatedBy, remarks });
  }
  removeFromWatchList(id: number, removedBy: string, resolution: string): Observable<any> {
    return this.http.patch(`${this.base}/watch-list/${id}/remove`, { removed_by: removedBy, resolution });
  }

  // ── CBS Rules ─────────────────────────────────────────────────
  getCbsRules(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/cbs-rules`);
  }
  createCbsRule(data: any): Observable<any> {
    return this.http.post(`${this.base}/cbs-rules`, data);
  }
  updateCbsRule(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.base}/cbs-rules/${id}`, data);
  }
  deleteCbsRule(id: number): Observable<any> {
    return this.http.delete(`${this.base}/cbs-rules/${id}`);
  }
  validateCbsExpression(expression: string): Observable<any> {
    return this.http.post(`${this.base}/cbs-rules/validate`, { expression });
  }
  simulateCbsRules(payload: { rules: { name: string; expression: string }[]; minMatchCount?: number; page?: number; limit?: number; branchCode?: string; watchListFilter?: 'all' | 'flagged' | 'new' }): Observable<any> {
    return this.http.post(`${this.base}/cbs-rules/simulate`, payload);
  }
  applyAllRules(): Observable<any> {
    return this.http.post(`${this.base}/cbs-rules/apply-rules`, {});
  }
  applySingleRule(id: number): Observable<any> {
    return this.http.post(`${this.base}/cbs-rules/apply-rules/${id}`, {});
  }

  // ── Manual Flags ──────────────────────────────────────────────────
  getLastUpload(): Observable<any> {
    return this.http.get(`${this.base}/cbs-upload/last`);
  }
  getUploadResults(uploadId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/cbs-upload/${uploadId}/results`);
  }
  processUpload(rows: any[], uploadedBy: string): Observable<any> {
    return this.http.post(`${this.base}/cbs-upload/process`, { rows, uploaded_by: uploadedBy });
  }
  getRawCbsData(accountId?: string, branchCode?: string): Observable<any[]> {
    const params: any = {};
    if (accountId) params['account_id'] = accountId;
    if (branchCode) params['branch_code'] = branchCode;
    return this.http.get<any[]>(`${this.base}/cbs-upload/raw-data`, { params });
  }
  getRawCbsDataByAccount(accountId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/cbs-upload/raw-data/${accountId}`);
  }
  clearLoanData(): Observable<any> {
    return this.http.post(`${this.base}/cbs-upload/clear-data`, {});
  }

  // ── Investigations ────────────────────────────────────────────
  uploadFiles(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return this.http.post(`${this.base}/upload`, formData);
  }
  getInvestigations(filters?: { branch?: string; status?: string }): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/investigations`, { params: filters as any });
  }
  sendForInvestigation(data: any): Observable<any> {
    return this.http.post(`${this.base}/investigations/send`, data);
  }
  submitBranchResponse(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.base}/investigations/${id}/respond`, data);
  }
  sendReminder(id: number, sentBy: string): Observable<any> {
    return this.http.patch(`${this.base}/investigations/${id}/remind`, { sent_by: sentBy });
  }

  // ── Escalations ───────────────────────────────────────────────
  getEscalations(status?: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/escalations`, { params: status ? { status } : {} });
  }
  escalate(data: any): Observable<any> {
    return this.http.post(`${this.base}/escalations`, data);
  }
  decideEscalation(id: number, decision: string, decidedBy: string, notes?: string): Observable<any> {
    return this.http.patch(`${this.base}/escalations/${id}/decide`, { decision, decided_by: decidedBy, notes });
  }

  // ── RO Assessment ─────────────────────────────────────────────
  getRoAssessment(watchListId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/ro-assessment/watch-list/${watchListId}`);
  }
  getQuestionnaire(watchListId: number, loanType: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/ro-assessment/questionnaire`, {
      params: { watch_list_id: watchListId, loan_type: loanType },
    });
  }
  saveAnswer(data: any): Observable<any> {
    return this.http.post(`${this.base}/ro-assessment/answer`, data);
  }

  // ── Disputes ──────────────────────────────────────────────────
  getDisputes(status?: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/disputes`, { params: status ? { status } : {} });
  }
  raiseDispute(data: any): Observable<any> {
    return this.http.post(`${this.base}/disputes`, data);
  }
  resolveDispute(id: number, decision: string, resolvedBy: string, notes?: string): Observable<any> {
    return this.http.patch(`${this.base}/disputes/${id}/resolve`, { decision, resolved_by: resolvedBy, notes });
  }

  // ── Audit Trail ───────────────────────────────────────────────
  getAuditTrail(filters?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/audit-trail`, { params: filters ?? {} });
  }

  // ── Risk Config ───────────────────────────────────────────────
  getRiskConfig(): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(`${this.base}/risk-config`);
  }
  saveRiskConfig(configs: Record<string, string>, changedBy: string): Observable<any> {
    return this.http.post(`${this.base}/risk-config`, { configs, changed_by: changedBy });
  }
  getConfigChangelog(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/risk-config/changelog`);
  }

  // ── Loan Type Config ──────────────────────────────────────────
  getLoanTypeConfigSummary(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/loan-type-config/summary`);
  }
  getLoanTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/loan-type-config/loan-types`);
  }

  // ── Reports ───────────────────────────────────────────────────
  getReport(type: string): Observable<any> {
    return this.http.get(`${this.base}/reports/${type}`);
  }
}
