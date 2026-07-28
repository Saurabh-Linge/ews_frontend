import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EwsStateService } from '../services/ews-state.service';
import { EwsApiService } from '../services/ews-api.service';
import { SignalsModalComponent } from '../components/signals-modal/signals-modal.component';
import { HeroComponent } from '../../../shared/components/ui/hero/hero';

@Component({
  selector: 'app-escalations',
  standalone: true,
  imports: [CommonModule, SignalsModalComponent, HeroComponent],
  template: `
    <div class="mb-4">
      <h2 class="m-0 text-2xl font-bold text-gray-900" style="color: var(--text-color, #0f172a); font-size: 1.5rem; font-weight: 800;">Escalations</h2>
      <p class="mt-1 text-sm text-gray-500" style="color: var(--text-color-secondary, #64748b); font-size: 0.875rem; margin-top: 0.25rem;">Accounts requiring approval or override before action proceeds.</p>
    </div>
    <div class="ews-page">
      <div *ngIf="loading()" style="padding: 60px; text-align: center; color: var(--muted);">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem; margin-bottom: 16px"></i>
        <div>Loading escalations...</div>
      </div>

      <div *ngIf="!loading()">
        <p style="color:var(--muted);font-size:13px;margin-bottom:16px">These accounts require your approval or override before action proceeds.</p>
        
      @for (esc of escalations(); track esc.account_id) {
        <div class="esc-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div>
              <div style="font-size:17px;font-weight:700">{{ esc.borrower_name }} — Acc. {{ esc.account_id }}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:3px">{{ esc.branch }} Branch · Escalated by {{ esc.escalated_by }} · {{ esc.days_since_escalation || 0 }}d since sent</div>
              <div style="margin-top:8px;display:flex;gap:6px">
                <span class="tag" [ngClass]="{
                  'tag-grn': esc.risk_level === 'Low',
                  'tag-amb': esc.risk_level === 'Medium',
                  'tag-red': esc.risk_level === 'High'
                }">{{ esc.risk_level }} Risk</span>
                <span class="tag tag-red" style="cursor:pointer;" (click)="openSignalsModal(esc.signals_data)">
                  <i class="pi pi-exclamation-triangle" style="margin-right:4px;"></i>
                  {{ esc.signal_count }} signals
                </span>
              </div>
            </div>
            <span class="tag" [ngClass]="{
              'tag-red': esc.status === 'Pending CRO',
              'tag-grn': esc.status === 'Approved',
              'tag-amb': esc.status === 'Downgraded',
              'tag-gray': esc.status === 'Sent back'
            }">{{ esc.status }}</span>
          </div>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:var(--radius-sm);padding:12px;font-size:13px;color:#7F1D1D">
            {{ esc.note }}
          </div>
          <div class="esc-actions">
            <button class="btn btn-green btn-sm" (click)="approve(esc)"><i class="pi pi-check" style="font-size:12px;margin-right:4px"></i> Approve</button>
            <button class="btn btn-sm" style="border-color:var(--blue);color:var(--blue)" (click)="sendBack(esc)"><i class="pi pi-refresh" style="font-size:12px;margin-right:4px"></i> Send back</button>
            <button class="btn btn-amber btn-sm" (click)="downgrade(esc)"><i class="pi pi-eye" style="font-size:12px;margin-right:4px"></i> Downgrade</button>
            <button class="btn btn-red btn-sm" (click)="forceEscalate(esc)"><i class="pi pi-exclamation-triangle" style="font-size:12px;margin-right:4px"></i> Force escalate</button>
            <button class="btn btn-xs" style="margin-left:auto;background:transparent;border:none;box-shadow:none;color:var(--primary)" (click)="view(esc)">View full detail →</button>
          </div>
        </div>
      }
      
      @if (escalations().length === 0 && !loading()) {
        <div style="padding: 30px; text-align: center; color: var(--muted); background: white; border-radius: 12px; border: 1px solid var(--border);">
          No pending escalations.
        </div>
      }
      </div>

      <app-signals-modal 
        [show]="showSignalsModal" 
        [signalsData]="selectedSignalsData" 
        (close)="showSignalsModal = false">
      </app-signals-modal>
    </div>
  `,
  styles: [`
    .ews-esc-card { background: #fff; border: 1.5px solid #DC2626; border-radius: 10px; padding: 18px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .ews-esc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .ews-esc-note { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 12px; font-size: 13px; color: #7F1D1D; margin-bottom: 14px; }
    .ews-esc-actions { display: flex; gap: 8px; flex-wrap: wrap; padding-top: 14px; border-top: 1px solid #E2E4E9; }
  `],
})
export class EscalationsComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  ewsState = inject(EwsStateService);
  router = inject(Router);
  loading = signal(true);
  escalations = signal<any[]>([]);

  showSignalsModal = false;
  selectedSignalsData: any[] = [];

  ngOnInit() {
    this.ewsApi.getEscalations('Pending CRO').subscribe({
      next: (d: any) => { if (d.length) this.escalations.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openSignalsModal(signalsData: any[]) {
    this.selectedSignalsData = signalsData || [];
    this.showSignalsModal = true;
  }

  view(esc: any) { this.router.navigate(['/ews/account', esc.watch_list_id]); }
  
  approve(esc: any) {
    this.ewsApi.decideEscalation(esc.id, 'Approve', 'Chief Risk Officer', 'Escalation approved. Legal team notified.').subscribe({
      next: () => { alert('Escalation approved. Legal team notified.'); this.ngOnInit(); },
      error: (e: any) => alert('Error: ' + (e.error?.message || 'Server Error'))
    });
  }

  sendBack(esc: any) {
    this.ewsApi.decideEscalation(esc.id, 'Send Back', 'Chief Risk Officer', 'Sent back to RO for re-investigation.').subscribe({
      next: () => { alert('Sent back to RO for re-investigation.'); this.ngOnInit(); },
      error: (e: any) => alert('Error: ' + (e.error?.message || 'Server Error'))
    });
  }

  downgrade(esc: any) {
    this.ewsApi.decideEscalation(esc.id, 'Downgrade', 'Chief Risk Officer', 'Downgraded. Continue monitoring.').subscribe({
      next: () => { alert('Downgraded. Continue monitoring.'); this.ngOnInit(); },
      error: (e: any) => alert('Error: ' + (e.error?.message || 'Server Error'))
    });
  }

  forceEscalate(esc: any) {
    this.ewsApi.decideEscalation(esc.id, 'Force Escalate', 'Chief Risk Officer', 'Force escalated to legal.').subscribe({
      next: () => { alert('Force escalated to legal.'); this.ngOnInit(); },
      error: (e: any) => alert('Error: ' + (e.error?.message || 'Server Error'))
    });
  }
}
