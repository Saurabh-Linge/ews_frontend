import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EwsApiService } from '../../services/ews-api.service';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';

@Component({
  selector: 'app-loan-config',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, TableComponent],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="card p-4">
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold" style="color: var(--text-color, #102a43); font-weight: 700;">Loan Category Config</h5>
      </div>

      <app-table
        [data]="summary()"
        [columns]="tableColumns"
        [loading]="loading()"
        [showRefreshButton]="true"
        [showAddButton]="false"
        [paginator]="true"
        [rows]="10"
        (onRefresh)="loadData()"
      ></app-table>
    </div>
  `,
})
export class LoanConfigComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  msg = inject(MessageService);
  loading = signal(true);

  summary = signal<any[]>([]);

  tableColumns: TableColumn[] = [
    { field: 'loan_type', header: 'LOAN TYPE', sortable: true },
    { field: 'always_y', header: 'ALWAYS (Y)', sortable: true, align: 'center' },
    { field: 'conditional_c', header: 'CONDITIONAL (C)', sortable: true, align: 'center' },
    { field: 'total_shown', header: 'TOTAL SHOWN TO RO', sortable: true, align: 'center' },
    { field: 'skipped_n', header: 'SKIPPED', sortable: true, align: 'center' },
    { field: 'est_q', header: 'EST. QUESTIONS', sortable: true, align: 'center' }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.ewsApi.getLoanTypeConfigSummary().subscribe({
      next: (d) => {
        if (d && d.length) this.summary.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
