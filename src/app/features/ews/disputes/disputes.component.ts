import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EwsApiService } from '../services/ews-api.service';
import { EwsStateService } from '../services/ews-state.service';
import { SignalsModalComponent } from '../components/signals-modal/signals-modal.component';
import { TableComponent, TableColumn, TableAction } from '../../../shared/components/table/table.component';

@Component({
  selector: 'app-disputes',
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

    <div class="card p-4">
      <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom-1 surface-border">
        <div>
          <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">
            Disputes {{ ewsState.isRole('cro') ? '— Bank-wide' : '' }}
          </h5>
          <p class="m-0 mt-1 text-sm text-gray-500">Branch risk flagging disputes and reviews.</p>
        </div>
        <div class="flex align-items-center gap-2">
          <span class="px-3 py-1 font-bold text-xs border-round bg-amber-100 text-amber-800">
            {{ disputes().length }} Pending Disputes
          </span>
        </div>
      </div>

      <app-table
        [data]="formattedData()"
        [columns]="tableColumns"
        [loading]="loading()"
        [actions]="tableActions"
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
export class DisputesComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  ewsState = inject(EwsStateService);
  router = inject(Router);
  msg = inject(MessageService);

  loading = signal(true);
  disputes = signal<any[]>([]);

  showSignalsModal = false;
  selectedSignalsData: any[] = [];

  formattedData = computed(() => {
    return this.disputes().map(d => ({
      ...d,
      signals_btn: true,
      disputed_signal: d.signal_number ? `Signal #${d.signal_number} - ${d.signal_name}` : (d.signal_name || 'Account Level Dispute')
    }));
  });

  tableColumns: TableColumn[] = [
    { field: 'account_id', header: 'ACC NO', sortable: true, width: '130px' },
    { field: 'borrower_name', header: 'BORROWER', sortable: true },
    { field: 'branch', header: 'BRANCH', sortable: true, width: '140px' },
    { field: 'disputed_signal', header: 'DISPUTED SIGNAL', sortable: true },
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
    { field: 'reason', header: 'REASON', sortable: true },
    { field: 'status', header: 'STATUS', sortable: true, type: 'badge', width: '140px' }
  ];

  tableActions: TableAction[] = [
    { 
      name: 'view',
      label: 'Review', 
      icon: 'pi pi-eye', 
      command: (row: any) => this.view(row)
    }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.ewsApi.getDisputes('Pending').subscribe({
      next: (d) => {
        this.disputes.set(d || []);
        this.loading.set(false);
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load disputes' });
        this.loading.set(false);
      }
    });
  }

  handleActionClick(event: { name: string; row: any }) {
    if (event.name === 'view') {
      this.view(event.row);
    } else if (event.name === 'view_signals') {
      this.openSignalsModal(event.row.signals_data);
    }
  }

  openSignalsModal(signalsData: any[]) {
    this.selectedSignalsData = signalsData || [];
    this.showSignalsModal = true;
  }

  view(d: any) {
    this.router.navigate(['/ews/account', d.watch_list_id]);
  }
}
