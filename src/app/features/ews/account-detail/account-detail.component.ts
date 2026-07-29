import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { ApiVerificationModalComponent } from '../components/api-verification-modal/api-verification-modal.component';
import { EwsApiService } from '../services/ews-api.service';
import { EwsStateService } from '../services/ews-state.service';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../../../core/services/config/config.token';
import { HeroComponent } from '../../../shared/components/ui/hero/hero';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule,
    DialogModule, DrawerModule, ButtonModule, PanelModule, DividerModule,
    MessageModule, SelectModule, InputNumberModule, DatePickerModule, InputTextModule,
    ApiVerificationModalComponent,HeroComponent],
  providers: [MessageService],
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.scss'],
})
export class AccountDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ewsApi = inject(EwsApiService);
  private msg = inject(MessageService);
  ewsState = inject(EwsStateService);

  @ViewChild(ApiVerificationModalComponent) apiModal!: ApiVerificationModalComponent;
  showAssessmentDialog = false;

  private config = inject(APP_CONFIG);
  apiUrl = this.config.apiUrl;

  account = signal<any>(null);
  auditSignals = signal<any[]>([]);
  cbsSignals = signal<any[]>([]);
  timeline = signal<any[]>([]);
  disputes = signal<any[]>([]);
  questionnaire = signal<any[]>([]);
  accountQuestions = signal<any[]>([]);
  answersMap: { [key: number]: any } = {};  // plain object for ngModel two-way binding
  isSavingAnswers = false;

  get answeredQuestionsCount(): number {
    if (!this.answersMap) return 0;
    return Object.values(this.answersMap).filter(val => val !== undefined && val !== null && val !== '').length;
  }

  dumpId = signal<number | null>(null);
  loading = signal(true);
  isSending = false;
  isMarking = false;
  isEscalating = false;
  isSendingResponse = false;
  disputeLoading: { [key: number]: string } = {};
  selectedRisk = 'High';
  showDump = false;

  roRemarks = '';
  branchResponseText = '';
  resolutionStatus = 'Issue resolved — provide explanation';
  selectedFiles: File[] = [];
  activeInvestigation = signal<any>(null);
  activeEscalation = signal<any>(null);
  roGroupedSignals = signal<any[]>([]);
  croNotes = '';
  isDeciding = false;

  // Dispute state
  isRaisingDispute = false;
  disputeReason = '';
  disputeFiles: File[] = [];
  isSubmittingDispute = false;

  riskOptions = [

    { label: 'Risk: High', value: 'High' },
    { label: 'Risk: Medium', value: 'Medium' },
    { label: 'Risk: Low', value: 'Low' },
  ];

  cbsSearchText = '';

  formatKey(key: any): string {
    return String(key).replace(/_/g, ' ');
  }

  isLongValue(key: any, val: any): boolean {
    const k = String(key).toLowerCase();
    const v = String(val ?? '');
    return k.includes('address') || k.includes('remark') || k.includes('description') || k.includes('note') || v.length > 35;
  }

  getCbsEntries(): { key: string; value: any }[] {
    const dump = this.account()?.dump_data;
    if (!dump) return [];
    const entries = Object.keys(dump).map(key => ({ key, value: dump[key] }));
    if (!this.cbsSearchText.trim()) return entries;
    const query = this.cbsSearchText.toLowerCase();
    return entries.filter(e => 
      this.formatKey(e.key).toLowerCase().includes(query) || 
      String(e.value ?? '').toLowerCase().includes(query)
    );
  }

  isViewable(filename: string): boolean {
    if (!filename) return false;
    const lower = filename.toLowerCase();
    return lower.endsWith('.pdf') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg');
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    const type = this.route.snapshot.queryParamMap.get('type');
    
    // Fetch details
    const req = type === 'dump' ? this.ewsApi.getDumpAccountDetails(+id) : this.ewsApi.getAccountDetails(+id);

    req.subscribe({
      next: (details) => {
        this.account.set(details.account);
        this.selectedRisk = details.account?.risk_level || 'Medium';
        
        const signals = details.signals || [];
        
        this.auditSignals.set(signals.filter((s: any) => s.layer === 1).map((s: any) => ({
          question: s.details?.question || 'Audit Question',
          answer: s.details?.answer || 'Triggered',
          signal: `→ Signal #${s.signal_number || s.signal_id} (${s.signal_name || 'EWS Trigger'})`
        })));
        
        this.cbsSignals.set(signals.filter((s: any) => s.layer === 2 && s.details?.source !== 'RO Questionnaire').map((s: any) => ({
          rule: s.details?.rules ? `Triggered via Rule(s): ${s.details.rules.map((r:any) => r.name || r).join(', ')}` : `CBS auto-detection`,
          rules: s.details?.rules,
          result: s.details?.result || `Detected on ${new Date(s.triggered_at).toLocaleDateString()}`,
          signal: `→ Signal #${s.signal_number || s.signal_id} (${s.signal_name || 'EWS Trigger'})`
        })));

        const roSignalsList = signals.filter((s: any) => s.layer === 2 && s.details?.source === 'RO Questionnaire');
        const formattedSigs = new Map<number, any>();
        
        for (const s of roSignalsList) {
          const sigId = s.signal_id;
          if (!formattedSigs.has(sigId)) {
            formattedSigs.set(sigId, {
              signal_id: sigId,
              signal_number: s.signal_number || sigId,
              signal_name: s.signal_name || 'EWS Trigger',
              rules: []
            });
          }
          
          const sGroup = formattedSigs.get(sigId);
          
          let ruleObjs: any[] = s.details?.rules ? s.details.rules.map((r:any) => typeof r === 'string' ? { name: r, risk: 'Medium' } : { name: r.name, risk: r.risk || 'Medium' }) : [];
          
          for (const ro of ruleObjs) {
            const existing = sGroup.rules.find((x:any) => x.name === ro.name);
            if (!existing) {
               sGroup.rules.push(ro);
            }
          }
        }
        
        this.roGroupedSignals.set(Array.from(formattedSigs.values()));
        
        // Map timeline
        const timeline = details.timeline || [];
        this.timeline.set(timeline.map((t: any) => ({
          color: t.action.includes('resolved') || t.action.includes('removed') || t.action.includes('No risk') ? 'var(--green)' 
                 : t.action.includes('investigation') || t.action.includes('escalate') ? 'var(--amber)' 
                 : t.action.includes('Added') || t.action.includes('High risk') ? 'var(--red)' : 'var(--blue)',
          action: t.action,
          meta: `${t.performed_by} · ${new Date(t.logged_at).toLocaleDateString()} ${new Date(t.logged_at).toLocaleTimeString().slice(0,5)} \n${t.remarks}`,
          attachments: t.attachments || []
        })));
        
        this.disputes.set(details.disputes || []);
        
        // Find active branch investigation
        const invs = details.investigations || [];
        this.activeInvestigation.set(invs.find((i: any) => i.status === 'Pending') || null);
        
        // Fetch escalations if account is escalated
        if (details.account.status === 'Escalated') {
          this.ewsApi.getEscalations().subscribe({
            next: (escs: any[]) => {
              const esc = escs.find(e => e.watch_list_id === details.account.id && e.status === 'Pending CRO');
              if (esc) this.activeEscalation.set(esc);
            }
          });
        }
        
        // Fetch generic EWS RO Assessment questionnaire (if watch list exists)
        if (details.account?.id && !type) {
          this.ewsApi.getQuestionnaire(+id, details.account.loan_type).subscribe({
            next: (q) => {
              this.questionnaire.set(q);
            },
            error: () => console.error('Error loading questionnaire')
          });
        }

        // Determine account_id string and dump numeric id for question lookup
        const accountIdStr: string = details.account?.account_id || '';
        let currentDumpId: number | null = null;
        if (type === 'dump') {
          currentDumpId = +id;
        } else if (details.account?.dump_data?.id) {
          currentDumpId = details.account.dump_data.id;
        }
        this.dumpId.set(currentDumpId);

        // Fetch dynamic Account Questions for Rules (show to ro and cro)
        if (accountIdStr && this.ewsState.isRole('ro', 'cro', 'admin')) {
          this.ewsApi.getAccountQuestions(accountIdStr, currentDumpId).subscribe({
            next: (qList) => {
              this.accountQuestions.set(qList);
              this.answersMap = {};
              qList.forEach(q => {
                if (q.answer_value !== null && q.answer_value !== undefined) {
                  this.answersMap[q.id] = q.type === 'numeric' ? Number(q.answer_value) : q.answer_value;
                }
              });
              
              this.loading.set(false);
            },
            error: () => this.loading.set(false)
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load account details' });
        this.loading.set(false);
      }
    });
  }

  goBack() { this.router.navigate(['/ews/watch-list']); }

  openApiVerification() {
    this.apiModal.show();
  }

  onFilesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    this.selectedFiles = [...this.selectedFiles, ...files];
    // Reset input so the same file can be selected again if needed
    event.target.value = '';
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  // Dispute file handlers
  onDisputeFilesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    this.disputeFiles = [...this.disputeFiles, ...files];
    event.target.value = '';
  }

  removeDisputeFile(index: number) {
    this.disputeFiles.splice(index, 1);
  }

  toggleDisputeForm() {
    this.isRaisingDispute = !this.isRaisingDispute;
    if (this.isRaisingDispute) {
      this.disputeReason = '';
      this.disputeFiles = [];
    }
  }

  async submitDispute() {
    if (!this.account()?.id) return;
    this.isSubmittingDispute = true;
    
    try {
      let attachments: any[] = [];
      if (this.disputeFiles.length > 0) {
        attachments = await firstValueFrom(this.ewsApi.uploadFiles(this.disputeFiles));
      }

      await firstValueFrom(this.ewsApi.raiseDispute({
        watch_list_id: this.account().id,
        signal_id: null,
        branch: this.account().branch,
        reason: this.disputeReason,
        raised_by: `Branch Manager (${this.account().branch})`,
        attachments
      }));

      this.msg.add({ severity: 'success', summary: 'Dispute Raised', detail: 'Dispute submitted successfully.' });
      this.isSubmittingDispute = false;
      this.isRaisingDispute = false;
      this.ngOnInit(); // Refresh details
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Failed to raise dispute' });
      this.isSubmittingDispute = false;
    }
  }

  async sendForInvestigation() {
    if (!this.account()?.id) return;
    this.isSending = true;
    
    try {
      let attachments: any[] = [];
      if (this.selectedFiles.length > 0) {
        attachments = await firstValueFrom(this.ewsApi.uploadFiles(this.selectedFiles));
      }
      
      const fileNames = this.selectedFiles.map(f => f.name).join(', ');
      const evidenceNotes = fileNames ? `\n(Evidence attached: ${fileNames})` : '';

      await firstValueFrom(this.ewsApi.sendForInvestigation({ 
        watch_list_id: this.account().id, 
        sent_by: 'Risk Officer',
        notes: this.roRemarks + evidenceNotes,
        attachments
      }));

      this.msg.add({ severity: 'success', summary: 'Sent', detail: 'Sent for branch investigation. Branch notified.' });
      this.isSending = false;
      this.selectedFiles = [];
      this.roRemarks = '';
      this.ngOnInit();
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Failed to send' });
      this.isSending = false;
    }
  }

  markNoRisk() {
    if (!this.account()?.id) return;
    this.isMarking = true;
    this.ewsApi.removeFromWatchList(this.account().id, 'Risk Officer', 'No risk').subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Resolved', detail: 'Marked no risk. Removed from watch list.' });
        this.isMarking = false;
        this.router.navigate(['/ews/watch-list']);
      },
      error: (e) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Failed' });
        this.isMarking = false;
      }
    });
  }

  escalateToCro() {
    if (!this.account()?.id) return;
    this.isEscalating = true;
    this.ewsApi.escalate({
      watch_list_id: this.account().id,
      reason: this.roRemarks || 'Escalated by RO due to high risk assessment',
      ro_recommendation: this.selectedRisk || 'High',
      escalated_by: this.ewsState.user()?.full_name || 'Risk Officer'
    }).subscribe({
      next: () => {
        this.msg.add({ severity: 'warn', summary: 'Escalated', detail: 'Escalated to CRO.' });
        this.isEscalating = false;
        this.ngOnInit();
      },
      error: (e) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Failed' });
        this.isEscalating = false;
      }
    });
  }

  acceptDispute(d: any) {
    this.disputeLoading[d.id] = 'accept';
    this.ewsApi.resolveDispute(d.id || d.dispute_id, 'Accepted', 'Risk Officer').subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Accepted', detail: 'Dispute accepted. Signal removed.' });
        this.disputeLoading[d.id] = '';
        this.ngOnInit();
      },
      error: (e) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Failed' });
        this.disputeLoading[d.id] = '';
      }
    });
  }

  rejectDispute(d: any) {
    this.disputeLoading[d.id] = 'reject';
    this.ewsApi.resolveDispute(d.id || d.dispute_id, 'Rejected', 'Risk Officer').subscribe({
      next: () => {
        this.msg.add({ severity: 'warn', summary: 'Rejected', detail: 'Dispute rejected. Signal restored.' });
        this.disputeLoading[d.id] = '';
        this.ngOnInit();
      },
      error: (e) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Failed' });
        this.disputeLoading[d.id] = '';
      }
    });
  }

  async submitBranchResponse() {
    const inv = this.activeInvestigation();
    if (!inv) return;
    this.isSendingResponse = true;
    
    try {
      let attachments: any[] = [];
      if (this.selectedFiles.length > 0) {
        attachments = await firstValueFrom(this.ewsApi.uploadFiles(this.selectedFiles));
      }

      const fileNames = this.selectedFiles.map(f => f.name).join(', ');
      const evidenceNotes = fileNames ? `\n(Evidence attached: ${fileNames})` : '';

      await firstValueFrom(this.ewsApi.submitBranchResponse(inv.id, {
        branch_response: this.branchResponseText + evidenceNotes,
        response_by: `Branch Manager (${this.account().branch})`,
        resolution_status: this.resolutionStatus,
        attachments
      }));

      this.msg.add({ severity: 'success', summary: 'Response Submitted', detail: 'Your response has been sent to the RO.' });
      this.isSendingResponse = false;
      this.selectedFiles = [];
      this.branchResponseText = '';
      this.ngOnInit();
    } catch (e: any) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Failed' });
      this.isSendingResponse = false;
    }
  }

  saveAccountAnswers() {
    const currentDumpId = this.dumpId();

    if (!currentDumpId) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'Account ID missing. Cannot save.' });
      return;
    }

    this.isSavingAnswers = true;
    
    const answersToSave = Object.keys(this.answersMap).map(qid => ({
      question_id: +qid,
      answer_value: String(this.answersMap[+qid] ?? '')
    }));

    // Pass the actual dump ID as accountId
    this.ewsApi.saveAccountAnswers(currentDumpId, answersToSave, this.ewsState.user()?.full_name || 'RO').subscribe({
      next: (res: any) => {
        this.msg.add({ severity: 'success', summary: 'Saved', detail: 'Answers saved successfully.' });
        this.isSavingAnswers = false;
        this.ngOnInit();
      },
      error: (e) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Failed to save answers.' });
        this.isSavingAnswers = false;
      }
    });
  }

  decideEscalation(decision: string) {
    const esc = this.activeEscalation();
    if (!esc) return;
    this.isDeciding = true;
    this.ewsApi.decideEscalation(esc.id, decision, `CRO (${this.ewsState.user()?.full_name || 'Admin'})`, this.croNotes).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Decision Saved', detail: `Escalation decision: ${decision}` });
        this.isDeciding = false;
        this.ngOnInit();
      },
      error: (e) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Failed' });
        this.isDeciding = false;
      }
    });
  }

  getPendingDisputesCount(): number {
    return this.disputes().filter(d => d.status === 'Pending').length;
  }

  getQuestionText(r: any): string {
    const rName = typeof r === 'string' ? r : (r?.name || '');
    const match = rName.match(/RO Q([0-9.]+)/i);
    if (match && match[1]) {
      const ref = 'q' + match[1].replace(/\./g, '_');
      const matchedQ = this.accountQuestions().find((q:any) => q.reference_name === ref);
      if (matchedQ) {
        return `${matchedQ.question_desc} => ${rName.split('=').pop()?.trim() || 'Triggered'}`;
      }
    }
    return rName;
  }
}
