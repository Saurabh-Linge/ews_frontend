import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EwsApiService } from '../services/ews-api.service';
import { EwsStateService } from '../services/ews-state.service';
import { SignalsModalComponent } from '../components/signals-modal/signals-modal.component';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { HeroComponent } from '../../../shared/components/ui/hero/hero';

@Component({
  selector: 'app-disputes',
  standalone: true,
  imports: [CommonModule, SignalsModalComponent, TableModule, InputTextModule, HeroComponent],
  template: `
    <div class="mb-4">
      <h2 class="m-0 text-2xl font-bold text-gray-900" style="color: var(--text-color, #0f172a); font-size: 1.5rem; font-weight: 800;">Disputes</h2>
      <p class="mt-1 text-sm text-gray-500" style="color: var(--text-color-secondary, #64748b); font-size: 0.875rem; margin-top: 0.25rem;">Branch risk flagging disputes and reviews.</p>
    </div>
    <div class="ews-page">
      <div *ngIf="loading()" style="padding: 60px; text-align: center; color: var(--muted);">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem; margin-bottom: 16px"></i>
        <div>Loading disputes...</div>
      </div>

      <div class="card" *ngIf="!loading()">
        <div class="card-header" style="display:flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="margin: 0;">Active disputes</h3>
            <span class="tag tag-amb" style="margin-top: 4px; display: inline-block;">{{ disputes().length }} pending</span>
          </div>
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input pInputText type="text" (input)="dt.filterGlobal($any($event.target).value, 'contains')" placeholder="Search disputes..." style="font-size: 12px; width: 250px" />
          </span>
        </div>
        <div style="padding: 0;">
          <p-table #dt [value]="disputes()" styleClass="p-datatable-sm p-datatable-striped" [paginator]="true" [rows]="10" [globalFilterFields]="['account_id', 'borrower_name', 'branch', 'signal_name', 'reason', 'status']">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="account_id">Acc. <p-sortIcon field="account_id"></p-sortIcon></th>
                <th pSortableColumn="borrower_name">Borrower <p-sortIcon field="borrower_name"></p-sortIcon></th>
                <th pSortableColumn="branch">Branch <p-sortIcon field="branch"></p-sortIcon></th>
                <th pSortableColumn="signal_name">Disputed Signal <p-sortIcon field="signal_name"></p-sortIcon></th>
                <th pSortableColumn="reason">Reason <p-sortIcon field="reason"></p-sortIcon></th>
                <th pSortableColumn="status">Status <p-sortIcon field="status"></p-sortIcon></th>
                <th style="width: 100px">Action</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-d>
              <tr>
                <td style="font-weight:600">{{ d.account_id }}</td>
                <td>{{ d.borrower_name }}</td>
                <td>{{ d.branch }}</td>
                <td>
                  <button class="btn btn-xs" style="background:transparent; border:1px solid var(--border); color:var(--primary); font-weight:600;" (click)="openSignalsModal(d.signals_data)">
                    <i class="pi pi-exclamation-triangle" style="margin-right:4px; color:var(--red);"></i>
                    Signal #{{ d.signal_number }} - {{ d.signal_name }}
                  </button>
                </td>
                <td style="font-size:13px; color:var(--text); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ d.reason }}
                </td>
                <td>
                  <span class="tag" [ngClass]="{
                    'tag-gray': d.status === 'Pending' || d.status === 'Pending RO',
                    'tag-grn': d.status === 'Accepted',
                    'tag-red': d.status === 'Rejected'
                  }">{{ d.status }}</span>
                </td>
                <td>
                  <button class="btn btn-xs btn-primary" (click)="view(d)">Review</button>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="7" style="text-align: center; padding: 32px; color: var(--muted);">No active disputes found.</td>
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
export class DisputesComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  ewsState = inject(EwsStateService);
  router = inject(Router);
  loading = signal(true);
  
  disputes = signal<any[]>([]);

  showSignalsModal = false;
  selectedSignalsData: any[] = [];

  ngOnInit() {
    this.ewsApi.getDisputes('Pending').subscribe({
      next: (d) => {
        this.disputes.set(d || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openSignalsModal(signalsData: any[]) {
    this.selectedSignalsData = signalsData || [];
    this.showSignalsModal = true;
  }

  view(d: any) {
    this.router.navigate(['/ews/account', d.watch_list_id]);
  }
}
