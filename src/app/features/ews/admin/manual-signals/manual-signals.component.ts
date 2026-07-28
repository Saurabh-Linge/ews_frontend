import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EwsApiService } from '../../services/ews-api.service';
import { TableComponent, TableColumn, TableAction } from '../../../../shared/components/table/table.component';
import { SelectFieldComponent } from '../../../../shared/components/form/select-field/select-field.component';

@Component({
  selector: 'app-manual-signals',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ButtonModule, 
    ToastModule,
    TableComponent,
    SelectFieldComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="card p-4">
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold" style="color: var(--text-color, #102a43); font-weight: 700;">Manual EWS Risk Signals</h5>
        <div style="display: flex; gap: 0.5rem;">
          <p-button label="Enable All" severity="success" (onClick)="toggleAll(true)" />
          <p-button label="Disable All" [outlined]="true" severity="secondary" (onClick)="toggleAll(false)" />
        </div>
      </div>

      <app-table
        [data]="filtered()"
        [columns]="tableColumns"
        [loading]="loading()"
        [actions]="tableActions"
        [showRefreshButton]="true"
        [paginator]="true"
        [rows]="20"
        (onRefresh)="loadData()"
      >
        <div toolbar-actions class="flex align-items-center gap-3">
          <div style="width: 220px;">
            <app-select-field
              [field]="filterCat"
              [options]="categories"
              optionLabel="label"
              optionValue="value"
              placeholder="All Categories"
              [hideLabel]="true"
            ></app-select-field>
          </div>
        </div>
      </app-table>
    </div>
  `,
})
export class ManualSignalsComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  msg = inject(MessageService);
  loading = signal(true);

  filterCat = signal<string | null>(null);

  signalsList = signal<any[]>([]);

  categories = [
    { label: 'All Categories', value: null },
    { label: 'Credit Monitoring', value: 'Credit Monitoring' },
    { label: 'Payment Behaviour', value: 'Payment Behaviour' },
    { label: 'Account Conduct', value: 'Account Conduct' },
    { label: 'Financial Indicators', value: 'Financial Indicators' },
    { label: 'External Signals', value: 'External Signals' },
  ];

  tableColumns: TableColumn[] = [
    { field: 'number', header: '#', sortable: true, width: '4rem' },
    { field: 'name', header: 'SIGNAL', sortable: true },
    { field: 'category', header: 'CATEGORY', sortable: true, type: 'badge' },
    { field: 'default_risk', header: 'DEFAULT RISK', sortable: true, type: 'status' },
    { field: 'weight', header: 'WEIGHT', sortable: true, align: 'center' },
    { field: 'enabled', header: 'STATUS', sortable: true, type: 'boolean' }
  ];

  tableActions: TableAction[] = [
    {
      label: (row: any) => row.enabled ? 'Disable' : 'Enable',
      icon: (row: any) => row.enabled ? 'pi pi-times-circle' : 'pi pi-check-circle',
      command: (row: any) => this.toggle(row)
    }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.ewsApi.getManualSignals().subscribe({
      next: (data: any[]) => {
        if (data && data.length) this.signalsList.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filtered() {
    let list = this.signalsList();
    const cat = this.filterCat();
    if (cat) {
      list = list.filter((s) => s.category === cat);
    }
    return list;
  }

  toggle(s: any) {
    this.ewsApi.toggleSignal(s.id, !s.enabled).subscribe({
      next: () => {
        s.enabled = !s.enabled;
        this.msg.add({ severity: 'success', summary: 'Updated', detail: `Signal #${s.number} ${s.enabled ? 'enabled' : 'disabled'}` });
        this.loadData();
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to update signal state' }),
    });
  }

  toggleAll(enable: boolean) {
    this.ewsApi.toggleAllSignals(enable).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Updated', detail: `All signals ${enable ? 'enabled' : 'disabled'}` });
        this.loadData();
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed bulk update' }),
    });
  }
}
