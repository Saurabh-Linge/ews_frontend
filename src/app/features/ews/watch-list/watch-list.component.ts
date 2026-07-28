import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { EwsApiService } from '../services/ews-api.service';
import { EwsStateService } from '../services/ews-state.service';
import { SignalsModalComponent } from '../components/signals-modal/signals-modal.component';
import { TableComponent, TableColumn, TableAction } from '../../../shared/components/table/table.component';
import { SelectFieldComponent } from '../../../shared/components/form/select-field/select-field.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-watch-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    ButtonModule,
    SignalsModalComponent,
    TableComponent,
    SelectFieldComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    
    <div class="card p-4">
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold" style="color: var(--text-color, #102a43); font-weight: 700;">Watch List</h5>
        <button pButton pRipple label="Export" icon="pi pi-download" class="p-button-help p-button-outlined" (click)="downloadExcel()"></button>
      </div>

      <app-table
        [data]="accounts()"
        [columns]="tableColumns"
        [loading]="loading()"
        [actions]="tableActions"
        [showRefreshButton]="true"
        [showAddButton]="false"
        [paginator]="true"
        [rows]="15"
        (onRefresh)="loadData()"
      >
        <div toolbar-actions class="flex align-items-center gap-3 flex-wrap">
          <div style="width: 170px;">
            <app-select-field
              [field]="filterBranch"
              [options]="branchOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="All Branches"
              [hideLabel]="true"
              (onChange)="onFilterChange()"
            ></app-select-field>
          </div>
          <div style="width: 150px;">
            <app-select-field
              [field]="filterRisk"
              [options]="riskOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Risk Levels"
              [hideLabel]="true"
              (onChange)="onFilterChange()"
            ></app-select-field>
          </div>
          <div style="width: 140px;">
            <app-select-field
              [field]="filterSource"
              [options]="sourceOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Sources"
              [hideLabel]="true"
              (onChange)="onFilterChange()"
            ></app-select-field>
          </div>
          <div style="width: 160px;">
            <app-select-field
              [field]="filterStatus"
              [options]="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Statuses"
              [hideLabel]="true"
              (onChange)="onFilterChange()"
            ></app-select-field>
          </div>
        </div>
      </app-table>
    </div>

    <app-signals-modal 
      [show]="showSignalsModal" 
      [signalsData]="selectedSignalsData" 
      (close)="showSignalsModal = false">
    </app-signals-modal>
  `
})
export class WatchListComponent implements OnInit {
  private ewsApi = inject(EwsApiService);
  ewsState = inject(EwsStateService);
  private router = inject(Router);
  private msg = inject(MessageService);

  accounts = signal<any[]>([]);
  loading = signal(true);

  filterBranch = signal<string | null>(null);
  filterRisk = signal<string | null>(null);
  filterSource = signal<string | null>(null);
  filterStatus = signal<string | null>(null);

  branchOptions = signal<{ label: string; value: string | null }[]>([{ label: 'All Branches', value: null }]);
  riskOptions = [
    { label: 'All Risk Levels', value: null },
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' }
  ];
  sourceOptions = [
    { label: 'All Sources', value: null },
    { label: 'CBS', value: 'CBS' },
    { label: 'Audit', value: 'Audit' },
    { label: 'Manual', value: 'Manual' }
  ];
  statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Pending review', value: 'Pending review' },
    { label: 'Under investigation', value: 'Under investigation' },
    { label: 'Escalated', value: 'Escalated' },
    { label: 'Resolved', value: 'Resolved' }
  ];

  showSignalsModal = false;
  selectedSignalsData: any = null;

  tableColumns: TableColumn[] = [
    { field: 'account_id', header: 'ACC NO', sortable: true },
    { field: 'borrower_name', header: 'BORROWER', sortable: true },
    { field: 'branch_name', header: 'BRANCH', sortable: true },
    { field: 'loan_type', header: 'LOAN TYPE', sortable: true },
    { field: 'signal_count', header: 'SIGNALS', sortable: true },
    { field: 'source', header: 'SOURCE', sortable: true, type: 'badge' },
    { field: 'risk_level', header: 'RISK', sortable: true, type: 'status' },
    { field: 'status', header: 'STATUS', sortable: true, type: 'status' },
    { field: 'days_on_list', header: 'DAYS', sortable: true }
  ];

  tableActions: TableAction[] = [
    { label: 'Review', icon: 'pi pi-eye', command: (row) => this.review(row) }
  ];

  ngOnInit() {
    this.ewsApi.getBranches().subscribe({
      next: (data) => {
        const opts = [{ label: 'All Branches', value: null }, ...data.map(b => ({ label: b.name, value: b.name }))];
        this.branchOptions.set(opts);
      }
    });
    this.loadData();
  }

  onFilterChange() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    const filters: any = {};
    if (this.filterBranch()) filters.branch = this.filterBranch();
    if (this.filterRisk()) filters.risk_level = this.filterRisk();
    if (this.filterSource()) filters.source = this.filterSource();
    if (this.filterStatus()) filters.status = this.filterStatus();

    this.ewsApi.getWatchList(filters).subscribe({
      next: (data: any[]) => {
        this.accounts.set(data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  review(acc: any) {
    this.router.navigate(['/ews/account', acc.id]);
  }

  openSignalsModal(data: any) {
    this.selectedSignalsData = data;
    this.showSignalsModal = true;
  }

  downloadExcel() {
    const data = this.accounts();
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Watch List');
    XLSX.writeFile(wb, 'Watch_List_Export.xlsx');
  }
}
