import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EwsApiService } from '../services/ews-api.service';
import { SignalsModalComponent } from '../components/signals-modal/signals-modal.component';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';

@Component({
  selector: 'app-resolved',
  standalone: true,
  imports: [
    CommonModule, 
    ToastModule,
    SignalsModalComponent, 
    TableComponent
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>

    <!-- Main Card Panel -->
    <div class="card p-4">
      <!-- Title Header Row -->
      <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom-1 surface-border">
        <div>
          <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">
            Resolved Accounts Archive
          </h5>
          <p class="m-0 mt-1 text-sm text-gray-500">Archive of resolved early warning items and closed investigations.</p>
        </div>
        <div class="flex align-items-center gap-2">
          <span class="px-3 py-1 font-bold text-xs border-round bg-emerald-100 text-emerald-800">
            {{ resolved().length }} Total Resolved
          </span>
        </div>
      </div>

      <!-- 4 Clean Stat Metric Cards (Matching reference layout) -->
      <div class="grid formgrid m-0 mb-4" *ngIf="!loading()">
        <div class="col-12 sm:col-6 md:col-3 p-2">
          <div class="bg-white p-3 border-round-xl border-1 surface-border h-full flex flex-column justify-content-between">
            <div class="text-xs font-semibold text-600 mb-2">No risk / Removed</div>
            <div class="text-2xl font-extrabold text-emerald-600">{{ stats().noRisk }}</div>
          </div>
        </div>

        <div class="col-12 sm:col-6 md:col-3 p-2">
          <div class="bg-white p-3 border-round-xl border-1 surface-border h-full flex flex-column justify-content-between">
            <div class="text-xs font-semibold text-600 mb-2">Satisfactory response</div>
            <div class="text-2xl font-extrabold text-emerald-600">{{ stats().satisfactory }}</div>
          </div>
        </div>

        <div class="col-12 sm:col-6 md:col-3 p-2">
          <div class="bg-white p-3 border-round-xl border-1 surface-border h-full flex flex-column justify-content-between">
            <div class="text-xs font-semibold text-600 mb-2">Continued monitoring</div>
            <div class="text-2xl font-extrabold text-amber-600">{{ stats().monitoring }}</div>
          </div>
        </div>

        <div class="col-12 sm:col-6 md:col-3 p-2">
          <div class="bg-white p-3 border-round-xl border-1 surface-border h-full flex flex-column justify-content-between">
            <div class="text-xs font-semibold text-600 mb-2">Escalated to legal / other</div>
            <div class="text-2xl font-extrabold text-red-600">{{ stats().escalated }}</div>
          </div>
        </div>
      </div>

      <!-- Table Component -->
      <app-table
        [data]="formattedData()"
        [columns]="tableColumns"
        [loading]="loading()"
        [showAddButton]="false"
        [showRefreshButton]="true"
        [showExportButton]="true"
        [paginator]="true"
        [rows]="10"
        (onRefresh)="loadData()"
        (onActionClick)="handleActionClick($event)"
      ></app-table>
    </div>

    <app-signals-modal 
      [show]="showSignalsModal" 
      [signalsData]="selectedSignalsData" 
      (close)="showSignalsModal = false">
    </app-signals-modal>
  `
})
export class ResolvedComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  msg = inject(MessageService);

  loading = signal(true);
  resolved = signal<any[]>([]);
  stats = signal({ noRisk: 0, satisfactory: 0, monitoring: 0, escalated: 0 });

  showSignalsModal = false;
  selectedSignalsData: any[] = [];

  formattedData = computed(() => {
    return this.resolved().map(r => ({
      ...r,
      signals_btn: true,
      resolution: r.resolution || 'No risk',
      removed_by: r.removed_by || 'System'
    }));
  });

  tableColumns: TableColumn[] = [
    { field: 'account_id', header: 'ACC NO', sortable: true, width: '130px' },
    { field: 'borrower_name', header: 'BORROWER', sortable: true },
    { field: 'branch', header: 'BRANCH', sortable: true, width: '140px' },
    { field: 'added_at', header: 'ADDED', type: 'date', sortable: true, width: '120px' },
    { field: 'removed_at', header: 'RESOLVED', type: 'date', sortable: true, width: '120px' },
    { field: 'days_on_list', header: 'DAYS', sortable: true, width: '90px' },
    { 
      field: 'signals_btn', 
      header: 'SIGNALS', 
      type: 'boolean_action', 
      booleanActionTrueIcon: 'pi pi-bell', 
      booleanActionTrueLabel: '',
      booleanActionTrueClass: 'p-button-danger p-button-text text-red-600',
      actionName: 'view_signals',
      tooltip: 'View Signals',
      width: '90px',
      align: 'center',
      headerAlign: 'center'
    },
    { field: 'resolution', header: 'RESOLUTION', type: 'badge', sortable: true, width: '160px' },
    { field: 'removed_by', header: 'CLOSED BY', sortable: true, width: '130px' }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
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
        } else {
          this.resolved.set([]);
          this.stats.set({ noRisk: 0, satisfactory: 0, monitoring: 0, escalated: 0 });
        }
        this.loading.set(false);
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load resolved accounts' });
        this.loading.set(false);
      }
    });
  }

  handleActionClick(event: { name: string; row: any }) {
    if (event.name === 'view_signals') {
      this.openSignalsModal(event.row.signals_data);
    }
  }

  openSignalsModal(signalsData: any[]) {
    this.selectedSignalsData = signalsData || [];
    this.showSignalsModal = true;
  }
}
