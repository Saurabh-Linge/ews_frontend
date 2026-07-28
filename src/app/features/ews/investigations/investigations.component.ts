import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EwsStateService } from '../services/ews-state.service';
import { EwsApiService } from '../services/ews-api.service';
import { SignalsModalComponent } from '../components/signals-modal/signals-modal.component';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { HeroComponent } from '../../../shared/components/ui/hero/hero';

@Component({
  selector: 'app-investigations',
  standalone: true,
  imports: [CommonModule, SignalsModalComponent, TableModule, InputTextModule, HeroComponent],
  template: `
    <div class="mb-4">
      <h2 class="m-0 text-2xl font-bold text-gray-900" style="color: var(--text-color, #0f172a); font-size: 1.5rem; font-weight: 800;">Investigations</h2>
      <p class="mt-1 text-sm text-gray-500" style="color: var(--text-color-secondary, #64748b); font-size: 0.875rem; margin-top: 0.25rem;">Monitor accounts currently under investigation and branch responses.</p>
    </div>
    <div class="ews-page">
      <div *ngIf="loading()" style="padding: 60px; text-align: center; color: var(--muted);">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem; margin-bottom: 16px"></i>
        <div>Loading investigations...</div>
      </div>

      <div class="card" *ngIf="!loading()">
        <div class="card-header" style="display:flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="margin: 0;">Active investigations {{ ewsState.isRole('cro') ? '— bank-wide' : '' }}</h3>
            <span class="tag tag-blue" style="margin-top: 4px; display: inline-block;">{{ investigations().length }} accounts</span>
          </div>
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input pInputText type="text" (input)="dt.filterGlobal($any($event.target).value, 'contains')" placeholder="Search investigations..." style="font-size: 12px; width: 250px" />
          </span>
        </div>
        <div style="padding: 0;">
          <p-table #dt [value]="investigations()" styleClass="p-datatable-sm p-datatable-striped" [paginator]="true" [rows]="10" [globalFilterFields]="['account_id', 'borrower_name', 'branch', 'status']">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="account_id">Acc. <p-sortIcon field="account_id"></p-sortIcon></th>
                <th pSortableColumn="borrower_name">Borrower <p-sortIcon field="borrower_name"></p-sortIcon></th>
                <th pSortableColumn="branch">Branch <p-sortIcon field="branch"></p-sortIcon></th>
                <th pSortableColumn="sent_at">Sent on <p-sortIcon field="sent_at"></p-sortIcon></th>
                <th>Signals</th>
                <th pSortableColumn="status">Branch response <p-sortIcon field="status"></p-sortIcon></th>
                <th pSortableColumn="days_open">Days <p-sortIcon field="days_open"></p-sortIcon></th>
                <th style="width: 100px">Action</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-inv>
              <tr>
                <td style="font-weight:600">{{ inv.account_id }}</td>
                <td>{{ inv.borrower_name }}</td>
                <td>{{ inv.branch }}</td>
                <td style="font-size:12px;color:#6B7280">{{ inv.sent_at | date:'shortDate' }}</td>
                <td>
                  <button class="btn btn-xs" style="background:transparent; border:1px solid var(--border); color:var(--primary); font-weight:600;" (click)="openSignalsModal(inv.signals_data)">
                    <i class="pi pi-exclamation-triangle" style="margin-right:4px; color:var(--red);"></i>
                    View Signals
                  </button>
                </td>
                <td>
                  <span class="tag" [ngClass]="{
                    'tag-grn': inv.status === 'Branch responded',
                    'tag-amb': inv.status === 'Pending',
                    'tag-red': inv.status === 'Overdue'
                  }">{{ inv.status }}</span>
                </td>
                <td [style.color]="inv.days_open > 7 ? 'var(--red)' : ''" [style.font-weight]="inv.days_open > 7 ? '600' : 'normal'">
                  {{ inv.days_open || 0 }}d
                </td>
                <td>
                  @if (ewsState.isRole('ro') && inv.days_open > 7) {
                    <button class="btn btn-xs btn-red" (click)="forceEscalate(inv)">Escalate to CRO</button>
                  } @else if (ewsState.isRole('ro') && inv.status === 'Pending') {
                    <button class="btn btn-xs" (click)="remind(inv)">Remind</button>
                  } @else {
                    <button class="btn btn-xs btn-primary" (click)="view(inv)">Review</button>
                  }
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="8" style="text-align: center; padding: 32px; color: var(--muted);">No active investigations found.</td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>

      <app-signals-modal 
        [show]="showSignalsModal" 
        [signalsData]="selectedSignalsData" 
        (close)="showSignalsModal = false">
      </app-signals-modal>
    </div>
  `,
})
export class InvestigationsComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  ewsState = inject(EwsStateService);
  router = inject(Router);
  loading = signal(true);
  investigations = signal<any[]>([]);

  showSignalsModal = false;
  selectedSignalsData: any[] = [];

  ngOnInit() {
    this.ewsApi.getInvestigations().subscribe({
      next: (d: any) => { if (d.length) this.investigations.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openSignalsModal(signalsData: any[]) {
    this.selectedSignalsData = signalsData || [];
    this.showSignalsModal = true;
  }

  view(inv: any) { this.router.navigate(['/ews/account', inv.watch_list_id]); }
  
  forceEscalate(inv: any) {
    this.ewsApi.escalate({
      watch_list_id: inv.watch_list_id,
      reason: 'Force escalated by RO due to prolonged inactivity or high risk',
      escalated_by: 'Risk Officer'
    }).subscribe({
      next: () => {
        alert(`Account ${inv.account_id} force escalated to CRO.`);
        this.ngOnInit();
      },
      error: (e: any) => alert('Failed to escalate: ' + (e.error?.message || 'Server Error'))
    });
  }

  remind(inv: any) {
    this.ewsApi.sendReminder(inv.investigation_id || inv.id, 'Risk Officer').subscribe({
      next: () => alert(`Reminder sent to ${inv.branch} Branch for account ${inv.account_id}.`),
      error: (e: any) => alert('Failed to send reminder: ' + (e.error?.message || 'Server Error'))
    });
  }
}
