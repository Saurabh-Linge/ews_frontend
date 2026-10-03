import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';

export interface EwsReportItem {
  srNo: number;
  reportCode?: string;
  title: string;
  desc: string;
  freq: string;
  category: string;
  slug: string;
  roles: ('CRO' | 'RO')[];
}

@Component({
  selector: 'app-ews-reports',
  standalone: true,
  imports: [
    CommonModule, 
    ButtonModule, 
    RippleModule, 
    ToastModule, 
    TagModule,
    TableComponent
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    
    <div class="card p-4">
      <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom-1 surface-border">
        <div>
          <div class="flex align-items-center gap-2">
            <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">
              EWS Executive & Regulatory Reports
            </h5>
            <span class="px-2.5 py-0.5 text-xs font-bold border-round bg-blue-100 text-blue-800">CRO & RO Enabled</span>
          </div>
          <p class="m-0 mt-1 text-sm text-gray-500">Official portfolio risk summaries, RBI compliance analytics, and collateral monitoring reports with Excel and PDF export.</p>
        </div>
        <div class="flex align-items-center gap-2">
          <span class="px-3 py-1 font-bold text-xs border-round bg-slate-100 text-slate-700 border-1 surface-border">
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
          [globalFilterFields]="['title', 'desc', 'category', 'reportCode']" 
          rowGroupMode="subheader" 
          groupRowsBy="category" 
          [bodyTemplate]="rowTemplate">
          
          <ng-template #groupHeader let-rowData>
            <tr class="p-rowgroup-header bg-surface-100 border-bottom-1 surface-border">
              <td style="text-align: center; font-weight: bold; width: 4.5rem; color: var(--text-color-secondary);">#</td>
              <td colspan="2" class="category-header-title font-extrabold text-blue-700 text-base py-2.5">
                {{ getCategoryLabel(rowData.category) }} »
              </td>
            </tr>
          </ng-template>

          <ng-template #rowTemplate let-rowData let-rowIndex="rowIndex">
            <td class="col-sr text-center py-3 font-semibold text-500" style="width: 4.5rem;">
              {{ rowData.srNo }}
            </td>
            <td class="col-report font-medium py-3">
              <div class="flex align-items-center gap-2 mb-1 flex-wrap">
                <span *ngIf="rowData.reportCode" class="px-2 py-0.5 text-xs font-black border-round bg-indigo-50 text-indigo-700 border-1 border-indigo-200">
                  {{ rowData.reportCode }}
                </span>
                <span class="font-bold text-base text-900">{{ rowData.title }}</span>
                <span *ngFor="let r of rowData.roles" 
                      class="px-2 py-0.5 text-xs font-bold border-round"
                      [ngClass]="r === 'CRO' ? 'bg-red-50 text-red-700 border-1 border-red-200' : 'bg-blue-50 text-blue-700 border-1 border-blue-200'">
                  {{ r }}
                </span>
              </div>
              <div class="text-xs text-500">
                {{ rowData.desc }} &middot; 
                <span class="font-semibold text-700">Frequency: {{ rowData.freq }}</span>
              </div>
            </td>
            <td class="col-action text-center py-3" style="width: 7rem;">
              <button 
                pButton 
                pRipple 
                icon="pi pi-external-link" 
                label="Open"
                class="p-button-sm p-button-outlined p-button-primary" 
                (click)="runReport(rowData)" 
                pTooltip="Open and Filter Report"
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
      width: '7rem',
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
  ];

  reports: EwsReportItem[] = [
    // ────────────────────────────────────────────────────────────────────────
    // Category 1: Master Reports (Risk & Executive Intelligence)
    // ────────────────────────────────────────────────────────────────────────
    { 
      srNo: 1, 
      reportCode: 'REPORT 02',
      slug: 'account-signal-detail', 
      category: '1_master', 
      title: 'Account Signal Detail Report', 
      desc: 'Full breakdown of all triggered signals across flagged accounts, ranked by exposure with risk levels and IRAC staging.', 
      freq: 'Daily / On demand',
      roles: ['CRO', 'RO']
    },
    { 
      srNo: 2, 
      reportCode: 'REPORT 07',
      slug: 'cro-dashboard-report', 
      category: '1_master', 
      title: 'CRO Executive Dashboard Report', 
      desc: 'High-level portfolio snapshot metrics, flagged account risk tiers, and Top 30 Very-High-Risk accounts by exposure.', 
      freq: 'Weekly / Board',
      roles: ['CRO', 'RO']
    },
    { 
      srNo: 3, 
      reportCode: 'REPORT 05',
      slug: 'signal-wise-distribution', 
      category: '1_master', 
      title: 'Signal-Wise Distribution Report', 
      desc: 'Complete distribution of all 14 early warning signals across Very High, High, and Medium risk tiers with portfolio percentages.', 
      freq: 'Monthly',
      roles: ['CRO', 'RO']
    },
    { 
      srNo: 4, 
      reportCode: 'EWS-WL',
      slug: 'current-ews-watchlist', 
      category: '1_master', 
      title: 'Current EWS Watch List Report', 
      desc: 'All active portfolio accounts on the early warning watch list with days open, loan type, and risk severity.', 
      freq: 'Daily',
      roles: ['CRO', 'RO']
    },

    // ────────────────────────────────────────────────────────────────────────
    // Category 2: Branch & Portfolio Reports
    // ────────────────────────────────────────────────────────────────────────
    { 
      srNo: 5, 
      reportCode: 'REPORT 04',
      slug: 'branch-wise-summary', 
      category: '2_portfolio', 
      title: 'Branch-Wise EWS Summary Report', 
      desc: 'Portfolio summary across all 16 branches: Total Accounts, Principal Outstanding, Flagged Accounts, Risk Tiers, and NPA counts.', 
      freq: 'Monthly',
      roles: ['CRO', 'RO']
    },
    { 
      srNo: 6, 
      reportCode: 'REPORT 06',
      slug: 'loan-type-risk', 
      category: '2_portfolio', 
      title: 'Loan Type / Product Risk Report', 
      desc: 'Risk concentration across 49 loan products: Total accounts, exposure, flagged ratios, and Very High/High risk distribution.', 
      freq: 'Monthly',
      roles: ['CRO', 'RO']
    },
    { 
      srNo: 7, 
      reportCode: 'EWS-HLTH',
      slug: 'bankwide-ews-health', 
      category: '2_portfolio', 
      title: 'Bank-Wide EWS Health Report', 
      desc: 'Aggregated view of portfolio risk distribution and investigation workflow across the entire bank.', 
      freq: 'Monthly',
      roles: ['CRO', 'RO']
    },

    // ────────────────────────────────────────────────────────────────────────
    // Category 3: Monitoring & Regulatory Compliance Reports
    // ────────────────────────────────────────────────────────────────────────
    { 
      srNo: 8, 
      reportCode: 'REPORT 09',
      slug: 'rbi-compliance-report', 
      category: '3_monitoring', 
      title: 'RBI / IRAC Compliance Report', 
      desc: 'Asset classification under RBI IRAC norms (Standard, SMA 0/1/2, Sub-Standard, Doubtful 1/2/3) with illustrative provisioning calculations.', 
      freq: 'Quarterly / Audit',
      roles: ['CRO', 'RO']
    },
    { 
      srNo: 9, 
      reportCode: 'REPORT 10',
      slug: 'inspection-due-report', 
      category: '3_monitoring', 
      title: 'Stock & Security Inspection Due Report', 
      desc: 'Periodic inspection audit of Cash Credit and working capital facilities against hypothecated stock and security.', 
      freq: 'Monthly',
      roles: ['CRO', 'RO']
    },
    { 
      srNo: 10, 
      reportCode: 'REPORT 11',
      slug: 'insurance-renewal-report', 
      category: '3_monitoring', 
      title: 'Insurance Renewal Due Report', 
      desc: 'Collateral insurance tracking: LAPSED policies, renewals due in 30/90 days, insurer breakdown, and top exposure accounts.', 
      freq: 'Monthly',
      roles: ['CRO', 'RO']
    },
    { 
      srNo: 11, 
      reportCode: 'REPORT 12',
      slug: 'cersai-pendency-report', 
      category: '3_monitoring', 
      title: 'CERSAI Pendency Report', 
      desc: 'Immovable collateral & registered mortgage accounts pending CERSAI security interest registration by branch.', 
      freq: 'Monthly',
      roles: ['CRO', 'RO']
    },
    { 
      srNo: 12, 
      reportCode: 'AUDIT',
      slug: 'system-inspection-audit', 
      category: '3_monitoring', 
      title: 'System Inspection & Audit Trail Report', 
      desc: 'Immutable audit log of all system changes, risk decisions, user activities, and supervisory overrides for RBI inspection.', 
      freq: 'On demand',
      roles: ['CRO', 'RO']
    },
  ];

  ngOnInit() {}

  getCategoryLabel(cat: string): string {
    if (cat === '1_master') return 'Master Reports — Executive & Risk Intelligence';
    if (cat === '2_portfolio') return 'Branch & Portfolio Analysis Reports';
    return 'Monitoring & RBI Regulatory Compliance Reports';
  }

  runReport(report: EwsReportItem) {
    this.router.navigate(['/ews/reports', report.slug]);
  }
}
