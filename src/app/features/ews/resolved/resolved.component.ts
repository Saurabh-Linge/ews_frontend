import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EwsApiService } from '../services/ews-api.service';
import { SignalsModalComponent } from '../components/signals-modal/signals-modal.component';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { HeroComponent } from '../../../shared/components/ui/hero/hero';

@Component({
  selector: 'app-resolved',
  standalone: true,
  imports: [CommonModule, SignalsModalComponent, TableModule, InputTextModule, HeroComponent],
  template: `
    <div class="mb-4">
      <h2 class="m-0 text-2xl font-bold text-gray-900" style="color: var(--text-color, #0f172a); font-size: 1.5rem; font-weight: 800;">Resolved Items</h2>
      <p class="mt-1 text-sm text-gray-500" style="color: var(--text-color-secondary, #64748b); font-size: 0.875rem; margin-top: 0.25rem;">Archive of resolved early warning items and closed investigations.</p>
    </div>
    <div class="ews-page">
      <div *ngIf="loading()" style="padding: 60px; text-align: center; color: var(--muted);">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem; margin-bottom: 16px"></i>
        <div>Loading resolved accounts...</div>
      </div>

      <div *ngIf="!loading()">
        <div class="stat-row">
          <div class="stat"><div class="stat-label">No risk / Removed</div><div class="stat-value" style="color:var(--green)">{{ stats().noRisk }}</div></div>
          <div class="stat"><div class="stat-label">Satisfactory response</div><div class="stat-value" style="color:var(--green)">{{ stats().satisfactory }}</div></div>
          <div class="stat"><div class="stat-label">Continued monitoring</div><div class="stat-value" style="color:var(--amber)">{{ stats().monitoring }}</div></div>
          <div class="stat"><div class="stat-label">Escalated to legal / other</div><div class="stat-value" style="color:var(--red)">{{ stats().escalated }}</div></div>
        </div>
      
      <div class="card">
        <div class="card-header" style="display:flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="margin: 0;">Resolved accounts</h3>
            <span class="tag tag-grn" style="margin-top: 4px; display: inline-block;">{{ resolved().length }} total</span>
          </div>
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input pInputText type="text" (input)="dt.filterGlobal($any($event.target).value, 'contains')" placeholder="Search resolved..." style="font-size: 12px; width: 250px" />
          </span>
        </div>
        <div style="padding: 0;">
          <p-table #dt [value]="resolved()" styleClass="p-datatable-sm p-datatable-striped" [paginator]="true" [rows]="10" [globalFilterFields]="['account_id', 'borrower_name', 'branch', 'resolution', 'removed_by']">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="account_id">Acc. <p-sortIcon field="account_id"></p-sortIcon></th>
                <th pSortableColumn="borrower_name">Borrower <p-sortIcon field="borrower_name"></p-sortIcon></th>
                <th pSortableColumn="branch">Branch <p-sortIcon field="branch"></p-sortIcon></th>
                <th pSortableColumn="added_at">Added <p-sortIcon field="added_at"></p-sortIcon></th>
                <th pSortableColumn="removed_at">Resolved <p-sortIcon field="removed_at"></p-sortIcon></th>
                <th pSortableColumn="days_on_list">Days <p-sortIcon field="days_on_list"></p-sortIcon></th>
                <th>Signals</th>
                <th pSortableColumn="resolution">Resolution <p-sortIcon field="resolution"></p-sortIcon></th>
                <th pSortableColumn="removed_by">Closed by <p-sortIcon field="removed_by"></p-sortIcon></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td style="font-weight:600">{{ r.account_id }}</td>
                <td>{{ r.borrower_name }}</td>
                <td>{{ r.branch }}</td>
                <td style="font-size:12px;color:var(--muted)">{{ r.added_at | date }}</td>
                <td style="font-size:12px;color:var(--muted)">{{ r.removed_at | date }}</td>
                <td>{{ r.days_on_list || 0 }}</td>
                <td>
                  <button class="btn btn-xs" style="background:transparent; border:1px solid var(--border); color:var(--primary); font-weight:600;" (click)="openSignalsModal(r.signals_data)">
                    <i class="pi pi-exclamation-triangle" style="margin-right:4px;" [style.color]="r.signal_count >= 3 ? 'var(--red)' : 'var(--amber)'"></i>
                    {{ r.signal_count || 0 }} Signals
                  </button>
                </td>
                <td>
                  <span class="tag tag-grn">{{ r.resolution || 'No risk' }}</span>
                </td>
                <td style="font-size:12px;color:var(--muted)">{{ r.removed_by || 'System' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="9" style="text-align: center; padding: 32px; color: var(--muted);">No resolved accounts.</td>
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
export class ResolvedComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  loading = signal(true);

  resolved = signal<any[]>([]);
  stats = signal({ noRisk: 0, satisfactory: 0, monitoring: 0, escalated: 0 });

  showSignalsModal = false;
  selectedSignalsData: any[] = [];

  ngOnInit() {
    this.ewsApi.getWatchList({ status: 'Resolved' }).subscribe({
      next: (d: any) => {
        if (d?.length) {
          this.resolved.set(d);
          let nR = 0, sat = 0, mon = 0, esc = 0;
          for (let r of d) {
            const res = (r.resolution || r.status || '').toLowerCase();
            if (res.includes('risk') || res.includes('false')) nR++;
            else if (res.includes('satisfactory') || res.includes('resolved')) sat++;
            else if (res.includes('monitor')) mon++;
            else if (res.includes('esc') || res.includes('legal')) esc++;
            else nR++; // Default bucket
          }
          this.stats.set({ noRisk: nR, satisfactory: sat, monitoring: mon, escalated: esc });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openSignalsModal(signalsData: any[]) {
    this.selectedSignalsData = signalsData || [];
    this.showSignalsModal = true;
  }
}
