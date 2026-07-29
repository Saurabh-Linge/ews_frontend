import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EwsStateService } from '../services/ews-state.service';
import { EwsApiService } from '../services/ews-api.service';
import { SignalsModalComponent } from '../components/signals-modal/signals-modal.component';
import { TableComponent, TableColumn, TableAction } from '../../../shared/components/table/table.component';

@Component({
  selector: 'app-investigations',
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
            Active Investigations {{ ewsState.isRole('cro') ? '— Bank-wide' : '' }}
          </h5>
          <p class="m-0 mt-1 text-sm text-gray-500">Monitor accounts currently under investigation and branch responses.</p>
        </div>
        <div class="flex align-items-center gap-2">
          <span class="px-3 py-1 font-bold text-xs border-round bg-blue-100 text-blue-700">
            {{ investigations().length }} Active Accounts
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
export class InvestigationsComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  ewsState = inject(EwsStateService);
  router = inject(Router);
  msg = inject(MessageService);

  loading = signal(true);
  investigations = signal<any[]>([]);

  showSignalsModal = false;
  selectedSignalsData: any[] = [];

  formattedData = computed(() => {
    return this.investigations().map(inv => ({
      ...inv,
      signals_btn: true
    }));
  });

  tableColumns: TableColumn[] = [
    { field: 'account_id', header: 'ACC NO', sortable: true, width: '140px' },
    { field: 'borrower_name', header: 'BORROWER', sortable: true },
    { field: 'branch', header: 'BRANCH', sortable: true, width: '160px' },
    { field: 'sent_at', header: 'SENT ON', sortable: true, type: 'date', width: '130px' },
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
    { field: 'status', header: 'BRANCH RESPONSE', sortable: true, type: 'badge', width: '170px' },
    { field: 'days_open', header: 'DAYS', sortable: true, width: '100px' }
  ];

  tableActions: TableAction[] = [
    {
      label: 'Escalate',
      icon: 'pi pi-angle-double-up',
      styleClass: 'p-button-danger',
      visible: (row) => this.ewsState.isRole('ro') && (row.days_open > 7 || row.status === 'Overdue'),
      command: (row) => this.forceEscalate(row)
    },
    {
      label: 'Remind',
      icon: 'pi pi-bell',
      styleClass: 'p-button-warning',
      visible: (row) => this.ewsState.isRole('ro') && row.status === 'Pending' && !(row.days_open > 7),
      command: (row) => this.remind(row)
    },
    {
      label: 'Review',
      icon: 'pi pi-eye',
      styleClass: 'p-button-primary',
      command: (row) => this.view(row)
    }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.ewsApi.getInvestigations().subscribe({
      next: (d: any) => { 
        if (d && Array.isArray(d)) {
          this.investigations.set(d); 
        } else {
          this.investigations.set([]);
        }
        this.loading.set(false); 
      },
      error: () => {
        this.investigations.set([]);
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

  view(inv: any) { 
    this.router.navigate(['/ews/account', inv.watch_list_id || inv.account_id]); 
  }
  
  forceEscalate(inv: any) {
    if (!confirm(`Are you sure you want to force escalate account ${inv.account_id} to CRO?`)) return;
    this.ewsApi.escalate({
      watch_list_id: inv.watch_list_id,
      reason: 'Force escalated by RO due to prolonged inactivity or high risk',
      escalated_by: 'Risk Officer'
    }).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Escalated', detail: `Account ${inv.account_id} force escalated to CRO.` });
        this.loadData();
      },
      error: (e: any) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to escalate: ' + (e.error?.message || 'Server Error') });
      }
    });
  }

  remind(inv: any) {
    this.ewsApi.sendReminder(inv.investigation_id || inv.id, 'Risk Officer').subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Reminder Sent', detail: `Reminder sent to ${inv.branch} Branch for account ${inv.account_id}.` });
      },
      error: (e: any) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to send reminder: ' + (e.error?.message || 'Server Error') });
      }
    });
  }
}
