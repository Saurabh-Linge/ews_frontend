import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { EwsApiService } from '../services/ews-api.service';
import { EwsStateService } from '../services/ews-state.service';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import { SelectFieldComponent } from '../../../shared/components/form/select-field/select-field.component';

@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    ButtonModule,
    TableComponent,
    SelectFieldComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    
    <div class="card p-4">
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold" style="color: var(--text-color, #102a43); font-weight: 700;">System Audit Trail</h5>
        <button pButton pRipple label="Export Log" icon="pi pi-download" class="p-button-help p-button-outlined" (click)="export()"></button>
      </div>

      <app-table
        [data]="trail()"
        [columns]="tableColumns"
        [loading]="loading()"
        [showRefreshButton]="true"
        [showAddButton]="false"
        [paginator]="true"
        [rows]="15"
        (onRefresh)="loadData()"
      >
        <div toolbar-actions class="flex align-items-center gap-3">
          <div style="width: 200px;">
            <app-select-field
              [field]="selectedBranch"
              [options]="branchOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="All Branches"
              [hideLabel]="true"
              (onChange)="onBranchChange($event)"
            ></app-select-field>
          </div>
          <div style="width: 200px;">
            <app-select-field
              [field]="selectedAction"
              [options]="actionOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Action Types"
              [hideLabel]="true"
              (onChange)="onActionChange($event)"
            ></app-select-field>
          </div>
        </div>
      </app-table>
    </div>
  `
})
export class AuditTrailComponent implements OnInit {
  private ewsApi = inject(EwsApiService);
  ewsState = inject(EwsStateService);
  private msg = inject(MessageService);
  
  loading = signal(true);

  trail = signal<any[]>([
    { logged_at: '2026-06-04 10:32', account_id: '178', borrower_name: 'Suresh Patil', branch: 'Ajara', action: 'Added to watch list', performed_by: 'Auditor (auto)', remarks: 'Q14 answer triggered signal' },
    { logged_at: '2026-06-03 15:14', account_id: '178', borrower_name: 'Suresh Patil', branch: 'Ajara', action: 'Sent for investigation', performed_by: 'Risk Officer', remarks: 'DP lower than outstanding' },
    { logged_at: '2026-06-03 11:00', account_id: '425', borrower_name: 'Ravi Constructions', branch: 'Nesari', action: 'Branch response received', performed_by: 'Branch (Nesari)', remarks: 'Seasonal crop delay cited' },
    { logged_at: '2026-06-02 14:00', account_id: '199', borrower_name: 'Mahesh Traders', branch: 'Ajara', action: 'Added to watch list', performed_by: 'System (auto)', remarks: 'CBS upload — cash withdrawal' },
    { logged_at: '2026-06-01 09:15', account_id: '88', borrower_name: 'Ganesh Mill Works', branch: 'Uttur', action: 'Escalated to CRO', performed_by: 'Risk Officer', remarks: 'No branch response 7 days' },
    { logged_at: '2026-05-25 11:30', account_id: '290', borrower_name: 'Kiran Traders', branch: 'Gargoti', action: 'Removed from watch list', performed_by: 'Risk Officer', remarks: 'No risk identified' },
  ]);

  selectedBranch = signal<string | null>(null);
  selectedAction = signal<string | null>(null);

  branchOptions = signal<{ label: string; value: string | null }[]>([{ label: 'All Branches', value: null }]);
  actionOptions = [
    { label: 'All Actions', value: null },
    { label: 'Added to watch list', value: 'Added to watch list' },
    { label: 'Sent for investigation', value: 'Sent for investigation' },
    { label: 'Escalated to CRO', value: 'Escalated to CRO' },
    { label: 'Removed from watch list', value: 'Removed from watch list' },
    { label: 'Updated', value: 'Updated' },
    { label: 'Branch response received', value: 'Branch response received' }
  ];

  tableColumns: TableColumn[] = [
    { field: 'logged_at', header: 'DATE & TIME', sortable: true },
    { field: 'account_id', header: 'ACC NO', sortable: true },
    { field: 'borrower_name', header: 'BORROWER', sortable: true },
    { field: 'branch', header: 'BRANCH', sortable: true },
    { field: 'action', header: 'ACTION', sortable: true, type: 'status' },
    { field: 'performed_by', header: 'PERFORMED BY', sortable: true },
    { field: 'remarks', header: 'REMARKS', sortable: true }
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

  onBranchChange(val: string | null) {
    this.loadData();
  }

  onActionChange(val: string | null) {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    const filters: any = { limit: 50 };
    if (this.selectedBranch()) filters.branch = this.selectedBranch();

    this.ewsApi.getAuditTrail(filters).subscribe({
      next: (d: any[]) => {
        if (d && d.length) {
          const formatted = d.map(item => ({
            ...item,
            logged_at: item.logged_at || item.dt,
            performed_by: item.performed_by || item.by
          }));
          this.trail.set(formatted);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  export() {
    this.msg.add({ severity: 'success', summary: 'Export Started', detail: 'Downloading system audit log...' });
  }
}
