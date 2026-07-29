import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { EwsStateService } from '../services/ews-state.service';
import { EwsApiService } from '../services/ews-api.service';
import { SignalsModalComponent } from '../components/signals-modal/signals-modal.component';

@Component({
  selector: 'app-escalations',
  standalone: true,
  imports: [
    CommonModule, 
    ToastModule, 
    ButtonModule, 
    SignalsModalComponent
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>

    <div class="card p-4">
      
      <!-- Header Row -->
      <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom-1 surface-border">
        <div>
          <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">
            Escalations {{ ewsState.isRole('cro') ? '— Chief Risk Officer Approval' : '' }}
          </h5>
          <p class="m-0 mt-1 text-sm text-gray-500">Accounts requiring approval or override before action proceeds.</p>
        </div>
        <div class="flex align-items-center gap-2">
          <span class="px-3 py-1 font-bold text-xs border-round bg-red-100 text-red-700">
            {{ escalations().length }} Pending Approval
          </span>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="p-6 text-center">
        <i class="pi pi-spin pi-spinner text-3xl text-indigo-500 mb-3 block"></i>
        <div class="text-600 font-medium">Loading escalations...</div>
      </div>

      <!-- Escalations List -->
      <div *ngIf="!loading()">
        
        <div *ngFor="let esc of escalations()" class="bg-white border-1 surface-border border-round-xl p-4 mb-4 border-left-4 border-red-500 shadow-1">
          
          <!-- Card Top Info -->
          <div class="flex flex-column sm:flex-row justify-content-between align-items-start gap-3 mb-3 pb-3 border-bottom-1 surface-border">
            <div>
              <h4 class="m-0 text-lg font-bold text-900">{{ esc.borrower_name }}</h4>
              <div class="flex flex-wrap gap-2 align-items-center mt-2 text-xs text-600">
                <span class="px-2.5 py-1 font-semibold text-700 bg-surface-100 border-1 surface-border border-round-lg">
                  Acc: {{ esc.account_id }}
                </span>
                <span class="px-2.5 py-1 font-semibold text-700 bg-surface-100 border-1 surface-border border-round-lg">
                  <i class="pi pi-building text-xs mr-1"></i>{{ esc.branch }} Branch
                </span>
                <span class="px-2.5 py-1 font-semibold text-700 bg-surface-100 border-1 surface-border border-round-lg">
                  Escalated by {{ esc.escalated_by }}
                </span>
                <span class="px-2 py-0.5 text-500">
                  <i class="pi pi-clock text-xs mr-1"></i>{{ esc.days_since_escalation || 0 }}d ago
                </span>
              </div>
            </div>

            <div class="flex align-items-center gap-2">
              <span class="px-3 py-1.5 font-bold text-xs border-round-lg inline-flex align-items-center gap-1.5"
                    [ngClass]="{
                      'bg-red-50 text-red-700 border-1 border-red-200': esc.risk_level === 'High',
                      'bg-amber-50 text-amber-700 border-1 border-amber-200': esc.risk_level === 'Medium',
                      'bg-emerald-50 text-emerald-700 border-1 border-emerald-200': esc.risk_level === 'Low'
                    }">
                <i class="pi pi-shield text-xs"></i>
                {{ esc.risk_level }} Risk
              </span>

              <button 
                pButton 
                pRipple 
                [label]="esc.signal_count + ' Signals'" 
                icon="pi pi-exclamation-triangle" 
                class="p-button-outlined p-button-danger p-button-sm"
                (click)="openSignalsModal(esc.signals_data)">
              </button>

              <span class="px-3 py-1.5 font-bold text-xs border-round-lg"
                    [ngClass]="{
                      'bg-red-100 text-red-800': esc.status === 'Pending CRO',
                      'bg-emerald-100 text-emerald-800': esc.status === 'Approved',
                      'bg-amber-100 text-amber-800': esc.status === 'Downgraded',
                      'bg-gray-100 text-gray-800': esc.status === 'Sent back'
                    }">
                {{ esc.status }}
              </span>
            </div>
          </div>

          <!-- Escalation Note Box -->
          <div class="bg-red-50 border-1 border-red-200 border-round-xl p-3 mb-3 text-xs text-red-900 leading-normal font-semibold">
            <i class="pi pi-info-circle text-red-600 mr-1.5"></i>
            {{ esc.note }}
          </div>

          <!-- Card Actions Row -->
          <div class="flex flex-wrap align-items-center justify-content-between gap-2 pt-2">
            <div class="flex flex-wrap gap-2">
              <button 
                pButton 
                pRipple 
                label="Approve" 
                icon="pi pi-check" 
                class="p-button-success p-button-sm" 
                (click)="approve(esc)">
              </button>
              
              <button 
                pButton 
                pRipple 
                label="Send Back" 
                icon="pi pi-refresh" 
                class="p-button-outlined p-button-info p-button-sm" 
                (click)="sendBack(esc)">
              </button>
              
              <button 
                pButton 
                pRipple 
                label="Downgrade" 
                icon="pi pi-eye" 
                class="p-button-warning p-button-sm" 
                (click)="downgrade(esc)">
              </button>
              
              <button 
                pButton 
                pRipple 
                label="Force Escalate" 
                icon="pi pi-exclamation-triangle" 
                class="p-button-danger p-button-sm" 
                (click)="forceEscalate(esc)">
              </button>
            </div>

            <button 
              pButton 
              pRipple 
              label="View Full Detail" 
              icon="pi pi-arrow-right" 
              iconPos="right" 
              class="p-button-text p-button-secondary p-button-sm" 
              (click)="view(esc)">
            </button>
          </div>

        </div>

        <!-- Empty State -->
        <div *ngIf="escalations().length === 0" class="p-6 text-center border-1 border-dashed surface-border border-round-xl bg-surface-50">
          <i class="pi pi-shield text-4xl text-emerald-500 mb-2 block"></i>
          <div class="text-900 font-bold text-lg mb-1">No Pending Escalations</div>
          <div class="text-600 text-sm">All escalated accounts have been reviewed and processed.</div>
        </div>

      </div>
    </div>

    <app-signals-modal 
      [show]="showSignalsModal" 
      [signalsData]="selectedSignalsData" 
      (close)="showSignalsModal = false">
    </app-signals-modal>
  `
})
export class EscalationsComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  ewsState = inject(EwsStateService);
  router = inject(Router);
  msg = inject(MessageService);

  loading = signal(true);
  escalations = signal<any[]>([]);

  showSignalsModal = false;
  selectedSignalsData: any[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.ewsApi.getEscalations('Pending CRO').subscribe({
      next: (d: any) => { 
        this.escalations.set(d || []); 
        this.loading.set(false); 
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load escalations' });
        this.loading.set(false);
      }
    });
  }

  openSignalsModal(signalsData: any[]) {
    this.selectedSignalsData = signalsData || [];
    this.showSignalsModal = true;
  }

  view(esc: any) { 
    this.router.navigate(['/ews/account', esc.watch_list_id]); 
  }
  
  approve(esc: any) {
    this.ewsApi.decideEscalation(esc.id, 'Approve', 'Chief Risk Officer', 'Escalation approved. Legal team notified.').subscribe({
      next: () => { 
        this.msg.add({ severity: 'success', summary: 'Approved', detail: 'Escalation approved. Legal team notified.' });
        this.loadData(); 
      },
      error: (e: any) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Server Error' });
      }
    });
  }

  sendBack(esc: any) {
    this.ewsApi.decideEscalation(esc.id, 'Send Back', 'Chief Risk Officer', 'Sent back to RO for re-investigation.').subscribe({
      next: () => { 
        this.msg.add({ severity: 'info', summary: 'Sent Back', detail: 'Sent back to RO for re-investigation.' });
        this.loadData(); 
      },
      error: (e: any) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Server Error' });
      }
    });
  }

  downgrade(esc: any) {
    this.ewsApi.decideEscalation(esc.id, 'Downgrade', 'Chief Risk Officer', 'Downgraded. Continue monitoring.').subscribe({
      next: () => { 
        this.msg.add({ severity: 'warn', summary: 'Downgraded', detail: 'Downgraded. Continue monitoring.' });
        this.loadData(); 
      },
      error: (e: any) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Server Error' });
      }
    });
  }

  forceEscalate(esc: any) {
    this.ewsApi.decideEscalation(esc.id, 'Force Escalate', 'Chief Risk Officer', 'Force escalated to legal.').subscribe({
      next: () => { 
        this.msg.add({ severity: 'error', summary: 'Force Escalated', detail: 'Force escalated to legal.' });
        this.loadData(); 
      },
      error: (e: any) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: e.error?.message || 'Server Error' });
      }
    });
  }
}
