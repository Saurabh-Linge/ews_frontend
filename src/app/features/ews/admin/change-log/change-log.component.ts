import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EwsApiService } from '../../services/ews-api.service';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';

@Component({
  selector: 'app-change-log',
  standalone: true,
  imports: [CommonModule, ButtonModule, ToastModule, TableComponent],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="card p-4">
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold" style="color: var(--text-color, #102a43); font-weight: 700;">Configuration Change Log</h5>
        <button pButton pRipple label="Export Log" icon="pi pi-download" class="p-button-help p-button-outlined" (click)="export()"></button>
      </div>

      <app-table
        [data]="log()"
        [columns]="tableColumns"
        [showRefreshButton]="true"
        [showAddButton]="false"
        [paginator]="true"
        [rows]="20"
        (onRefresh)="loadData()"
      ></app-table>
    </div>
  `,
})
export class ChangeLogComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  msg = inject(MessageService);

  log = signal<any[]>([
    { date: '2026-06-01', by: 'Admin', section: 'CBS Rules', action: 'Added', detail: 'Cheque bounce > ₹1L → Signal #2' },
    { date: '2026-05-28', by: 'Admin', section: 'Signal Mapping', action: 'Added', detail: 'Q14 Answer=No → Signal #14 (DP lower than outstanding)' },
    { date: '2026-05-25', by: 'Admin', section: 'CBS Rules', action: 'Edited', detail: 'Cash withdrawal threshold changed ₹2L → ₹1L' },
    { date: '2026-05-20', by: 'Admin', section: 'Risk Weights', action: 'Edited', detail: 'Very High threshold changed from 6 to 10' },
    { date: '2026-05-15', by: 'Admin', section: 'Manual Signals', action: 'Disabled', detail: 'Signal #19 — temporarily inactive' },
  ]);

  tableColumns: TableColumn[] = [
    { field: 'date', header: 'DATE', sortable: true },
    { field: 'by', header: 'CHANGED BY', sortable: true },
    { field: 'section', header: 'SECTION', sortable: true, type: 'badge' },
    { field: 'action', header: 'ACTION', sortable: true, type: 'status' },
    { field: 'detail', header: 'DETAILS', sortable: true }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.ewsApi.getConfigChangelog().subscribe({
      next: (d: any[]) => {
        if (d && d.length) this.log.set(d);
      },
      error: () => {},
    });
  }

  export() {
    this.msg.add({ severity: 'info', summary: 'Exporting', detail: 'Downloading configuration change log...' });
  }
}
