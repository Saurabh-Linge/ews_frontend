import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { EwsApiService } from '../../services/ews-api.service';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';

@Component({
  selector: 'app-signal-mapping',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ToastModule,
    TagModule,
    TableComponent
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="card p-4">
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold" style="color: var(--text-color, #102a43); font-weight: 700;">Signal Mapping</h5>
        <p-tag value="44 Mapped Rules" severity="success" styleClass="p-2 text-sm" />
      </div>

      <app-table
        [data]="mappings()"
        [columns]="tableColumns"
        [showRefreshButton]="true"
        [showAddButton]="false"
        [paginator]="true"
        [rows]="15"
        (onRefresh)="loadData()"
      ></app-table>
    </div>
  `,
})
export class SignalMappingComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  msg = inject(MessageService);

  mappings = signal<any[]>([
    { question: 'Is Drawing Power ≥ Outstanding Balance?', trigger_answer: 'No', risk_area: 'Credit Monitoring', signal_name: '#14 — DP lower than outstanding', risk: 'High' },
    { question: 'Are outstanding dues paid on time?', trigger_answer: 'No — overdue', risk_area: 'Payment Behaviour', signal_name: '#4 — Delay in payment of dues', risk: 'High' },
    { question: 'Are there any cheque bounces in the account?', trigger_answer: 'Yes', risk_area: 'Payment Behaviour', signal_name: '#2 — Bouncing of high-value cheques', risk: 'High' },
    { question: 'Are funds from other sources used for repayment?', trigger_answer: 'Yes', risk_area: 'Account Conduct', signal_name: '#9 — Funds from other sources used for repayment', risk: 'High' },
    { question: 'Are BG / LC invocations observed?', trigger_answer: 'Yes', risk_area: 'Trade Finance', signal_name: '#5 — BG/LC invocation', risk: 'High' },
    { question: 'Is account cash withdrawal > ₹1L in single day?', trigger_answer: 'Yes', risk_area: 'Account Conduct', signal_name: '#1 — Abnormal cash withdrawals', risk: 'High' },
    { question: 'Has debtors turnover declined significantly?', trigger_answer: 'Yes', risk_area: 'Financial Indicators', signal_name: '#7 — Declining turnover', risk: 'Medium' },
    { question: 'Is stock statement not submitted on time?', trigger_answer: 'Yes', risk_area: 'Credit Monitoring', signal_name: '#6 — Non-submission of stock statement', risk: 'Medium' },
    { question: 'Is frequency of overdraft increasing?', trigger_answer: 'Yes', risk_area: 'Account Conduct', signal_name: '#3 — Frequent overdrafts', risk: 'High' },
    { question: 'Are there frequent requests for loan restructuring?', trigger_answer: 'Yes', risk_area: 'Credit Monitoring', signal_name: '#10 — Frequent restructuring requests', risk: 'High' },
  ]);

  tableColumns: TableColumn[] = [
    { field: 'question', header: 'QUESTION', sortable: true },
    { field: 'trigger_answer', header: 'TRIGGER ANSWER', sortable: true },
    { field: 'risk_area', header: 'RISK AREA', sortable: true, type: 'badge' },
    { field: 'signal_name', header: 'SIGNAL', sortable: true },
    { field: 'risk', header: 'SIGNAL RISK', sortable: true, type: 'status' }
  ];

  ngOnInit() {
    // Static mapping data — no API endpoint for signal mapping
  }

  loadData() {
    // Refresh uses static data — no change needed
  }
}
