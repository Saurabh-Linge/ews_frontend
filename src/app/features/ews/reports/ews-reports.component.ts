import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';

export interface EwsReportItem {
  srNo: number;
  title: string;
  desc: string;
  freq: string;
  category: string;
  slug: string;
}

@Component({
  selector: 'app-ews-reports',
  standalone: true,
  imports: [
    CommonModule, 
    ButtonModule, 
    RippleModule, 
    ToastModule, 
    TableComponent
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    
    <div class="card p-4">
      <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom-1 surface-border">
        <div>
          <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">
            EWS Master Reports Directory
          </h5>
          <p class="m-0 mt-1 text-sm text-gray-500">Access system reports, watch list analytics, and RBI compliance trails.</p>
        </div>
        <div class="flex align-items-center gap-2">
          <span class="px-3 py-1 font-bold text-xs border-round bg-blue-100 text-blue-700">
            {{ reports.length }} Reports Available
          </span>
        </div>
      </div>
      
      <div class="table-container">
        <app-table 
          [columns]="columns" 
          [data]="reports" 
          [showAddButton]="false" 
          [showRefreshButton]="false" 
          [showToolbar]="true" 
          [showSerialNumber]="false" 
          [paginator]="false" 
          [globalFilterFields]="['title', 'desc', 'category']" 
          rowGroupMode="subheader" 
          groupRowsBy="category" 
          [bodyTemplate]="rowTemplate">
          
          <ng-template #groupHeader let-rowData>
            <tr class="p-rowgroup-header bg-surface-100 border-bottom-1 surface-border">
              <td style="text-align: center; font-weight: bold; width: 4.5rem; color: var(--text-color-secondary);">#</td>
              <td colspan="2" class="category-header-title font-extrabold text-blue-600 text-base py-2.5">
                {{ getCategoryLabel(rowData.category) }} »
              </td>
            </tr>
          </ng-template>

          <ng-template #rowTemplate let-rowData let-rowIndex="rowIndex">
            <td class="col-sr text-center py-3 font-semibold text-500" style="width: 4.5rem;">{{ rowData.srNo }}</td>
            <td class="col-report font-medium py-3">
              <div class="font-bold text-base text-900 mb-1">{{ rowData.title }}</div>
              <div class="text-xs text-500">{{ rowData.desc }} &middot; <span class="font-semibold text-700">Frequency: {{ rowData.freq }}</span></div>
            </td>
            <td class="col-action text-center py-3" style="width: 6rem;">
              <button 
                pButton 
                pRipple 
                icon="pi pi-external-link" 
                class="reports-action-btn p-button-text p-button-rounded p-button-primary" 
                (click)="runReport(rowData)" 
                pTooltip="Open Report"
                tooltipPosition="left">
              </button>
            </td>
          </ng-template>
        </app-table>
      </div>
    </div>
  `
})
export class EwsReportsComponent implements OnInit {
  private router = inject(Router);
  private msg = inject(MessageService);

  columns: TableColumn[] = [
    {
      field: 'srNo',
      header: 'SR. NO.',
      width: '4.5rem',
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
    { field: 'title', header: 'REPORTS', align: 'left', headerAlign: 'left', sortable: false },
    {
      field: 'action',
      header: 'ACTION',
      width: '6rem',
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
  ];

  reports: EwsReportItem[] = [
    // Category 1: Master Reports
    { srNo: 1, slug: 'current-ews-watchlist', category: '1_master', title: 'Current EWS Watch List Report', desc: 'All active portfolio accounts on watch list with signal count, risk severity, and days on list.', freq: 'Daily' },
    { srNo: 2, slug: 'individual-borrower-ews', category: '1_master', title: 'Individual Borrower EWS Report', desc: 'Full signal history, Risk Officer assessment, and audit trail for a specific borrower.', freq: 'On demand' },
    { srNo: 3, slug: 'high-risk-priority', category: '1_master', title: 'High Risk Priority Action Report', desc: 'Critical High risk accounts requiring immediate Chief Risk Officer review.', freq: 'Weekly' },
    { srNo: 4, slug: 'signal-distribution', category: '1_master', title: 'Signal-wise Distribution Report', desc: 'Breakdown of firing EWS signals across CBS and manual questionnaires.', freq: 'Monthly' },

    // Category 2: Branch & Portfolio Reports
    { srNo: 5, slug: 'branch-risk-summary', category: '2_portfolio', title: 'Branch Risk Summary Report', desc: 'Per-branch flagged accounts, pending responses, and resolution efficiency rates.', freq: 'Monthly' },
    { srNo: 6, slug: 'bankwide-ews-health', category: '2_portfolio', title: 'Bank-wide EWS Health Report', desc: 'Overall EWS activity across all branches for Board and executive management.', freq: 'Monthly' },
    { srNo: 7, slug: 'period-trend-comparison', category: '2_portfolio', title: 'Period Trend & Comparison Report', desc: 'Month-over-month early warning trends and risk migration analytics.', freq: 'Quarterly' },

    // Category 3: Monitoring & Audit Reports
    { srNo: 8, slug: 'investigation-status-log', category: '3_monitoring', title: 'Investigation Status & Response Log', desc: 'All open investigations with branch response status and pending timelines.', freq: 'Weekly' },
    { srNo: 9, slug: 'overdue-branch-response', category: '3_monitoring', title: 'Overdue Branch Response Report', desc: 'Flagged accounts where branch managers have exceeded investigation deadlines.', freq: 'Daily' },
    { srNo: 10, slug: 'system-inspection-audit', category: '3_monitoring', title: 'System Inspection & Audit Trail', desc: 'Complete timestamped audit log of all system changes for RBI inspection.', freq: 'On demand' },
  ];

  ngOnInit() {}

  getCategoryLabel(cat: string): string {
    if (cat === '1_master') return 'Master Reports';
    if (cat === '2_portfolio') return 'Branch & Portfolio Reports';
    return 'Monitoring & Audit Reports';
  }

  runReport(report: EwsReportItem) {
    this.router.navigate(['/ews/reports', report.slug]);
  }
}
