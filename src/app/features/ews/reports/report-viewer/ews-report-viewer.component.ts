import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { RippleModule } from 'primeng/ripple';
import { SelectModule } from 'primeng/select';
import { EwsApiService } from '../../services/ews-api.service';
import { ExportService } from '../../../../core/services/export/export.service';

export interface ReportColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'date' | 'status' | 'badge';
}

export interface ReportFilter {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date';
  options?: { label: string; value: any }[];
}

export interface ReportDefinition {
  slug: string;
  title: string;
  category: string;
  desc: string;
  columns: ReportColumn[];
  filters: ReportFilter[];
  defaultFilters: Record<string, any>;
}

@Component({
  selector: 'app-ews-report-viewer',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ButtonModule, 
    TagModule, 
    RippleModule, 
    SelectModule
  ],
  template: `
    <div class="report-viewer">
      <!-- Title, Category and Actions Header (Hidden on Print) -->
      <header class="report-titlebar no-print">
        <div>
          <span>{{ definition()?.category || 'EWS Reports' }}</span>
          <h1>{{ definition()?.title || 'Report' }}</h1>
        </div>
        <button 
          pButton 
          type="button" 
          icon="pi pi-arrow-left" 
          label="Reports" 
          severity="secondary" 
          [outlined]="true" 
          (click)="goBack()">
        </button>
      </header>

      <!-- Filter Panel (Hidden on Print) -->
      <div class="filter-panel no-print" *ngIf="definition() && definition()!.filters.length > 0">
        <ng-container *ngFor="let filter of definition()?.filters">
          <div class="field">
            <label>{{ filter.label }}</label>
            
            <!-- Searchable Select Dropdown -->
            <p-select 
              *ngIf="filter.type === 'select'"
              [options]="filter.options" 
              [(ngModel)]="filters()[filter.key]" 
              optionLabel="label" 
              optionValue="value" 
              [filter]="(filter.options?.length || 0) > 5" 
              filterBy="label" 
              placeholder="Select..."
              appendTo="body"
              styleClass="w-full report-search-dropdown">
            </p-select>

            <!-- Date Input -->
            <input *ngIf="filter.type === 'date'" type="date" [(ngModel)]="filters()[filter.key]" />

            <!-- Text Input -->
            <input *ngIf="filter.type === 'text'" type="text" [(ngModel)]="filters()[filter.key]" placeholder="Search..." />
          </div>
        </ng-container>

        <!-- Filter Actions -->
        <div class="filter-actions">
          <button pButton type="button" icon="pi pi-search" label="Find" [loading]="loading()" (click)="findReport()"></button>
          <button pButton type="button" icon="pi pi-refresh" label="Reset" severity="secondary" [outlined]="true" (click)="reset()"></button>
          <button pButton type="button" icon="pi pi-print" label="Print" severity="secondary" [outlined]="true" [disabled]="rows().length === 0" (click)="print()"></button>
          <button pButton type="button" icon="pi pi-file-excel" label="Excel" severity="success" [outlined]="true" [disabled]="rows().length === 0" (click)="exportExcel()"></button>
        </div>
      </div>

      <!-- Error / Alert Message -->
      <div *ngIf="error()" class="report-alert no-print">
        <i class="pi pi-exclamation-triangle mr-1"></i> {{ error() }}
      </div>

      <!-- Official Print Sheet Container -->
      <div class="official-report-sheet">
        
        <!-- Official Print Header (Visible ONLY when printing, exact CompliancePro format) -->
        <div class="official-report-header print-only">
          <div class="official-report-brand-row">
            <div class="official-report-logo">
              <i class="pi pi-shield"></i>
              <span>EWS</span>
            </div>
            <div class="official-report-bank">
              <p><strong>Report Date:</strong> {{ fullDateTime }}</p>
              <p><strong>Bank:</strong> RAJARSHI SHAHU SAHAKARI BANK LTD.</p>
            </div>
          </div>
          <div class="official-report-meta">
            <p><strong>Report:</strong> {{ definition()?.title }}</p>
            <p><strong>Report Run Date:</strong> {{ fullDateTime }}</p>
          </div>
        </div>

        <!-- Official Report Data Table -->
        <div class="official-report-table-wrap overflow-x-auto" *ngIf="rows().length > 0">
          <table class="official-report-table w-full border-collapse">
            <thead>
              <tr class="bg-surface-100 text-700 font-bold border-bottom-2 surface-border">
                <th *ngFor="let col of definition()?.columns" 
                    [style.width]="col.width || null"
                    [class.text-center]="col.align === 'center'"
                    [class.text-right]="col.align === 'right'"
                    class="p-3 text-xs uppercase tracking-wide font-extrabold">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of rows(); let idx = index" class="border-bottom-1 surface-border hover:bg-surface-50">
                <td *ngFor="let col of definition()?.columns"
                    [class.text-center]="col.align === 'center'"
                    [class.text-right]="col.align === 'right'"
                    class="p-3 text-sm text-800">
                  
                  <ng-container [ngSwitch]="col.type">
                    <!-- Status / Risk Badge -->
                    <ng-container *ngSwitchCase="'status'">
                      <span class="status-print-badge px-2.5 py-1 text-xs font-bold border-round-lg inline-flex align-items-center gap-1"
                            [ngClass]="statusSeverity(row[col.key])">
                        {{ row[col.key] || '—' }}
                      </span>
                    </ng-container>

                    <ng-container *ngSwitchCase="'badge'">
                      <span class="status-print-badge px-2.5 py-1 text-xs font-bold border-round-lg bg-surface-100 text-700 border-1 surface-border">
                        {{ row[col.key] || '—' }}
                      </span>
                    </ng-container>
                    
                    <!-- Date Field -->
                    <ng-container *ngSwitchCase="'date'">
                      {{ formatDate(row[col.key]) }}
                    </ng-container>

                    <!-- Default Column -->
                    <ng-container *ngSwitchDefault>
                      {{ row[col.key] ?? '—' }}
                    </ng-container>
                  </ng-container>

                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div *ngIf="rows().length === 0 && !loading()" class="empty-state p-6 text-center text-500">
          <i class="pi pi-inbox text-4xl text-400 mb-2 block"></i>
          <div class="font-bold text-base text-900 mb-1">No Report Data Found</div>
          <div class="text-xs">Adjust your search filters above and click 'Find' to generate the report dataset.</div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading()" class="p-6 text-center text-500">
          <i class="pi pi-spin pi-spinner text-3xl text-indigo-500 mb-2 block"></i>
          <div class="font-medium text-sm">Generating report dataset...</div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .report-viewer {
      display: flex;
      flex-direction: column;
      gap: .75rem;
    }

    .report-titlebar,
    .filter-panel,
    .official-report-sheet,
    .empty-state,
    .report-alert {
      border: 1px solid #d7e1eb;
      border-radius: 6px;
      background: #fff;
    }

    .report-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: .85rem 1rem;

      span {
        display: block;
        color: #1f5f93;
        font-size: .72rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      h1 {
        margin: .1rem 0 0;
        color: #09233d;
        font-size: 1.25rem;
        font-weight: 800;
      }
    }

    .filter-panel {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: .55rem .65rem;
      padding: .75rem;
      align-items: start;
    }

    .field {
      display: flex;
      flex-direction: column;
      grid-column: span 3;
      gap: .22rem;

      label {
        color: #36516a;
        font-size: .72rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      select,
      input {
        width: 100%;
        min-height: 2.25rem;
        border: 1px solid #cbd8e5;
        border-radius: 5px;
        background: #fff;
        color: #102a43;
        padding: .3rem .5rem;
        font: inherit;
        box-sizing: border-box;
      }
    }

    .filter-actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
      gap: .4rem;
      flex-wrap: wrap;
      margin-top: .25rem;
    }

    .report-alert {
      padding: .75rem .9rem;
      color: #b42318;
      background: #fff4f2;
      border-color: #ffd3cc;
      font-weight: 700;
    }

    .official-report-sheet {
      padding: 1rem;
    }

    @page {
      size: portrait;
      margin: 8mm 10mm;
    }

    .print-only {
      display: none;
    }

    ::ng-deep {
      @media print {
        /* Hide shell layout topbar, sidebar, hamburger icon completely */
        app-topbar,
        app-sidebar,
        app-breadcrumb,
        app-footer,
        .layout-topbar,
        .layout-sidebar,
        .layout-breadcrumb,
        .layout-menu-button,
        .layout-topbar-button,
        .layout-topbar-action,
        .p-ripple,
        .pi-bars,
        .no-print {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
        }

        body, html {
          background: #ffffff !important;
          color: #000000 !important;
          font-family: "Inter", -apple-system, sans-serif !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .layout-main-container,
        .layout-main,
        .report-viewer,
        .card,
        .official-report-sheet {
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .print-only {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        .official-report-header {
          margin-bottom: 12px !important;
          display: block !important;
        }

        .official-report-brand-row {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-end !important;
          border-bottom: 1px solid #cbd8e5 !important;
          padding-bottom: 6px !important;
          margin-bottom: 8px !important;
        }

        .official-report-logo {
          background-color: #09233d !important;
          color: #ffffff !important;
          padding: 6px 14px !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          filter: none !important;
          backdrop-filter: none !important;
          box-shadow: none !important;
          opacity: 1 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;

          i {
            font-size: 1.25rem !important;
            color: #ffffff !important;
            filter: none !important;
            opacity: 1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          span {
            color: #ffffff !important;
            font-weight: 800 !important;
            font-size: 1.15rem !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            line-height: 1 !important;
            display: block !important;
            filter: none !important;
            opacity: 1 !important;
          }
        }

        .official-report-bank {
          text-align: right !important;
          font-size: 0.75rem !important;
          color: #1e293b !important;
          p {
            margin: 2px 0 !important;
          }
        }

        .official-report-meta {
          display: flex !important;
          flex-direction: column !important;
          gap: 2px !important;
          font-size: 0.75rem !important;
          color: #1e293b !important;
          margin-bottom: 12px !important;
          p {
            margin: 0 !important;
          }
        }

        .official-report-table-wrap {
          border: 1px solid #cbd8e5 !important;
          border-radius: 0 !important;
          width: 100% !important;
          overflow: visible !important;
        }

        .official-report-table {
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          border-radius: 0 !important;

          th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000000 !important;
            border: 1px solid #cbd8e5 !important;
            border-radius: 0 !important;
            font-size: 0.65rem !important;
            font-weight: 800 !important;
            padding: 0.3rem 0.4rem !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }

          td {
            color: #000000 !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 0 !important;
            font-size: 0.6rem !important;
            padding: 0.25rem 0.4rem !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            line-height: 1.2 !important;
          }

          .status-print-badge {
            font-size: 0.55rem !important;
            padding: 1px 4px !important;
            border-radius: 0px !important;
            font-weight: 700 !important;
            display: inline-block !important;
          }
        }
      }
    }
  `]
})
export class EwsReportViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ewsApi = inject(EwsApiService);
  private exportService = inject(ExportService);

  reportSlug = signal<string>('');
  definition = signal<ReportDefinition | null>(null);
  filters = signal<Record<string, any>>({});
  rows = signal<any[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  get fullDateTime(): string {
    const d = new Date();
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dateStr} ${timeStr}`;
  }

  private reportRegistry: Record<string, ReportDefinition> = {
    'current-ews-watchlist': {
      slug: 'current-ews-watchlist',
      title: 'Current EWS Watch List Report',
      category: 'Master Reports',
      desc: 'All active portfolio accounts on watch list with signal count, risk severity, and days on list.',
      defaultFilters: { branch: 'all', risk_level: 'all', search: '' },
      filters: [
        { key: 'branch', label: 'Branch', type: 'select', options: [{ label: 'All Branches', value: 'all' }] },
        { key: 'risk_level', label: 'Risk Level', type: 'select', options: [{ label: 'All Risks', value: 'all' }, { label: 'High', value: 'High' }, { label: 'Medium', value: 'Medium' }, { label: 'Low', value: 'Low' }] },
        { key: 'search', label: 'Search Account / Borrower', type: 'text' }
      ],
      columns: [
        { key: 'account_id', label: 'Acc No', width: '100px' },
        { key: 'borrower_name', label: 'Borrower Name' },
        { key: 'branch', label: 'Branch', width: '110px' },
        { key: 'loan_type', label: 'Loan Type', width: '120px' },
        { key: 'risk_level', label: 'Risk Level', type: 'status', width: '100px', align: 'center' },
        { key: 'signal_count', label: 'Signals', width: '80px', align: 'center' },
        { key: 'status', label: 'Status', type: 'status', width: '120px', align: 'center' }
      ]
    },
    'individual-borrower-ews': {
      slug: 'individual-borrower-ews',
      title: 'Individual Borrower EWS Report',
      category: 'Master Reports',
      desc: 'Full signal history, Risk Officer assessment, and audit trail for a specific borrower.',
      defaultFilters: { search: '' },
      filters: [
        { key: 'search', label: 'Borrower Account ID or Name', type: 'text' }
      ],
      columns: [
        { key: 'account_id', label: 'Acc No', width: '100px' },
        { key: 'borrower_name', label: 'Borrower Name' },
        { key: 'branch', label: 'Branch', width: '110px' },
        { key: 'risk_level', label: 'Risk Level', type: 'status', width: '100px', align: 'center' },
        { key: 'sanction_amount', label: 'Sanction Amt', width: '120px', align: 'right' },
        { key: 'outstanding', label: 'Outstanding', width: '120px', align: 'right' },
        { key: 'status', label: 'Status', type: 'status', width: '120px', align: 'center' }
      ]
    },
    'high-risk-priority': {
      slug: 'high-risk-priority',
      title: 'High Risk Priority Action Report',
      category: 'Master Reports',
      desc: 'Critical High risk accounts requiring immediate Chief Risk Officer review.',
      defaultFilters: { branch: 'all' },
      filters: [
        { key: 'branch', label: 'Branch', type: 'select', options: [{ label: 'All Branches', value: 'all' }] }
      ],
      columns: [
        { key: 'account_id', label: 'Acc No', width: '100px' },
        { key: 'borrower_name', label: 'Borrower Name' },
        { key: 'branch', label: 'Branch', width: '110px' },
        { key: 'loan_type', label: 'Loan Type', width: '120px' },
        { key: 'risk_level', label: 'Risk Level', type: 'status', width: '100px', align: 'center' },
        { key: 'added_by', label: 'Flagged By', width: '120px' },
        { key: 'status', label: 'Status', type: 'status', width: '120px', align: 'center' }
      ]
    },
    'signal-distribution': {
      slug: 'signal-distribution',
      title: 'Signal-wise Distribution Report',
      category: 'Master Reports',
      desc: 'Breakdown of firing EWS signals across CBS and manual questionnaires.',
      defaultFilters: { category: 'all' },
      filters: [
        { key: 'category', label: 'Signal Category', type: 'select', options: [{ label: 'All Categories', value: 'all' }, { label: 'CBS Auto', value: 'CBS' }, { label: 'AuditPro', value: 'AuditPro' }] }
      ],
      columns: [
        { key: 'number', label: 'Signal #', width: '80px', align: 'center' },
        { key: 'name', label: 'Signal Name' },
        { key: 'category', label: 'Category', width: '120px' },
        { key: 'weight', label: 'Weight Score', width: '90px', align: 'center' },
        { key: 'enabled', label: 'Status', type: 'badge', width: '90px', align: 'center' }
      ]
    },
    'branch-risk-summary': {
      slug: 'branch-risk-summary',
      title: 'Branch Risk Summary Report',
      category: 'Branch & Portfolio Reports',
      desc: 'Per-branch flagged accounts, pending responses, and resolution efficiency rates.',
      defaultFilters: { branch: 'all' },
      filters: [
        { key: 'branch', label: 'Branch', type: 'select', options: [{ label: 'All Branches', value: 'all' }] }
      ],
      columns: [
        { key: 'branch', label: 'Branch Name' },
        { key: 'total_flagged', label: 'Total Flagged', width: '110px', align: 'center' },
        { key: 'high_risk', label: 'High Risk', width: '95px', align: 'center' },
        { key: 'medium_risk', label: 'Medium Risk', width: '95px', align: 'center' },
        { key: 'low_risk', label: 'Low Risk', width: '95px', align: 'center' },
        { key: 'pending_inv', label: 'Pending Inv.', width: '110px', align: 'center' }
      ]
    },
    'bankwide-ews-health': {
      slug: 'bankwide-ews-health',
      title: 'Bank-wide EWS Health Report',
      category: 'Branch & Portfolio Reports',
      desc: 'Overall EWS activity across all branches for Board and executive management.',
      defaultFilters: { status: 'all' },
      filters: [
        { key: 'status', label: 'Account Status', type: 'select', options: [{ label: 'All Statuses', value: 'all' }, { label: 'Under investigation', value: 'Under investigation' }, { label: 'Escalated', value: 'Escalated' }, { label: 'Normal', value: 'Normal' }] }
      ],
      columns: [
        { key: 'account_id', label: 'Acc No', width: '100px' },
        { key: 'borrower_name', label: 'Borrower Name' },
        { key: 'branch', label: 'Branch', width: '110px' },
        { key: 'risk_level', label: 'Risk Level', type: 'status', width: '100px', align: 'center' },
        { key: 'source', label: 'Source', width: '110px' },
        { key: 'status', label: 'Status', type: 'status', width: '120px', align: 'center' }
      ]
    },
    'period-trend-comparison': {
      slug: 'period-trend-comparison',
      title: 'Period Trend & Comparison Report',
      category: 'Branch & Portfolio Reports',
      desc: 'Month-over-month early warning trends and risk migration analytics.',
      defaultFilters: { search: '' },
      filters: [
        { key: 'search', label: 'Filter Keyword', type: 'text' }
      ],
      columns: [
        { key: 'account_id', label: 'Acc No', width: '100px' },
        { key: 'borrower_name', label: 'Borrower Name' },
        { key: 'branch', label: 'Branch', width: '110px' },
        { key: 'risk_level', label: 'Risk Level', type: 'status', width: '100px', align: 'center' },
        { key: 'added_at', label: 'Added On', type: 'date', width: '110px' },
        { key: 'status', label: 'Current Status', type: 'status', width: '120px', align: 'center' }
      ]
    },
    'investigation-status-log': {
      slug: 'investigation-status-log',
      title: 'Investigation Status & Response Log',
      category: 'Monitoring & Audit Reports',
      desc: 'All open investigations with branch response status and pending timelines.',
      defaultFilters: { branch: 'all' },
      filters: [
        { key: 'branch', label: 'Branch', type: 'select', options: [{ label: 'All Branches', value: 'all' }] }
      ],
      columns: [
        { key: 'account_id', label: 'Acc No', width: '100px' },
        { key: 'borrower_name', label: 'Borrower Name' },
        { key: 'branch', label: 'Branch', width: '110px' },
        { key: 'sent_at', label: 'Sent On', type: 'date', width: '110px' },
        { key: 'status', label: 'Branch Response', type: 'status', width: '140px', align: 'center' }
      ]
    },
    'overdue-branch-response': {
      slug: 'overdue-branch-response',
      title: 'Overdue Branch Response Report',
      category: 'Monitoring & Audit Reports',
      desc: 'Flagged accounts where branch managers have exceeded investigation deadlines.',
      defaultFilters: { branch: 'all' },
      filters: [
        { key: 'branch', label: 'Branch', type: 'select', options: [{ label: 'All Branches', value: 'all' }] }
      ],
      columns: [
        { key: 'account_id', label: 'Acc No', width: '100px' },
        { key: 'borrower_name', label: 'Borrower Name' },
        { key: 'branch', label: 'Branch', width: '110px' },
        { key: 'sent_at', label: 'Sent On', type: 'date', width: '110px' },
        { key: 'days_open', label: 'Overdue Days', width: '100px', align: 'center' },
        { key: 'status', label: 'Status', type: 'status', width: '120px', align: 'center' }
      ]
    },
    'system-inspection-audit': {
      slug: 'system-inspection-audit',
      title: 'System Inspection & Audit Trail',
      category: 'Monitoring & Audit Reports',
      desc: 'Complete timestamped audit log of all system changes for RBI inspection.',
      defaultFilters: { search: '' },
      filters: [
        { key: 'search', label: 'Search Action or User', type: 'text' }
      ],
      columns: [
        { key: 'action', label: 'Action Executed' },
        { key: 'meta', label: 'Audit Metadata' },
        { key: 'created_at', label: 'Timestamp', type: 'date', width: '140px' }
      ]
    }
  };

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('reportSlug') || 'current-ews-watchlist';
      this.reportSlug.set(slug);
      this.loadBranchesAndReport(slug);
    });
  }

  loadBranchesAndReport(slug: string) {
    this.loading.set(true);
    const def = this.reportRegistry[slug] || this.reportRegistry['current-ews-watchlist'];
    
    this.ewsApi.getBranches().subscribe({
      next: (branches: any[]) => {
        const branchOpts = [{ label: 'All Branches', value: 'all' }, ...(branches || []).map(b => ({ label: b.name, value: b.name }))];
        def.filters.forEach(f => {
          if (f.key === 'branch') f.options = branchOpts;
        });
        this.definition.set(def);
        this.filters.set({ ...def.defaultFilters });
        this.loadReportData();
      },
      error: () => {
        this.definition.set(def);
        this.filters.set({ ...def.defaultFilters });
        this.loadReportData();
      }
    });
  }

  loadReportData() {
    const slug = this.reportSlug();
    const activeFilters = this.filters();
    this.loading.set(true);
    this.error.set(null);

    if (slug === 'signal-distribution') {
      this.ewsApi.getSignals().subscribe({
        next: (signals: any[]) => {
          let filtered = signals || [];
          if (activeFilters['category'] && activeFilters['category'] !== 'all') {
            filtered = filtered.filter(s => (s.category || '').toLowerCase().includes(activeFilters['category'].toLowerCase()));
          }
          this.rows.set(filtered.map(s => ({
            ...s,
            enabled: s.enabled ? 'ACTIVE' : 'DISABLED'
          })));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to retrieve signal distribution data.');
          this.loading.set(false);
        }
      });
    } else if (slug === 'system-inspection-audit') {
      this.ewsApi.getAuditTrail().subscribe({
        next: (trail: any[]) => {
          let filtered = trail || [];
          if (activeFilters['search']) {
            const q = activeFilters['search'].toLowerCase();
            filtered = filtered.filter(t => (t.action || '').toLowerCase().includes(q) || (t.meta || '').toLowerCase().includes(q));
          }
          this.rows.set(filtered);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to retrieve audit trail logs.');
          this.loading.set(false);
        }
      });
    } else if (slug === 'investigation-status-log' || slug === 'overdue-branch-response') {
      this.ewsApi.getInvestigations().subscribe({
        next: (inv: any[]) => {
          let filtered = inv || [];
          if (activeFilters['branch'] && activeFilters['branch'] !== 'all') {
            filtered = filtered.filter(i => i.branch === activeFilters['branch']);
          }
          if (slug === 'overdue-branch-response') {
            filtered = filtered.filter(i => (i.days_open || 0) > 3);
          }
          this.rows.set(filtered);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to retrieve investigation report data.');
          this.loading.set(false);
        }
      });
    } else {
      this.ewsApi.getWatchList().subscribe({
        next: (wl: any[]) => {
          let filtered = wl || [];
          if (slug === 'high-risk-priority') {
            filtered = filtered.filter(r => r.risk_level === 'High');
          }
          if (activeFilters['branch'] && activeFilters['branch'] !== 'all') {
            filtered = filtered.filter(r => r.branch === activeFilters['branch']);
          }
          if (activeFilters['risk_level'] && activeFilters['risk_level'] !== 'all') {
            filtered = filtered.filter(r => r.risk_level === activeFilters['risk_level']);
          }
          if (activeFilters['search']) {
            const q = activeFilters['search'].toLowerCase();
            filtered = filtered.filter(r => (r.account_id || '').toLowerCase().includes(q) || (r.borrower_name || '').toLowerCase().includes(q));
          }
          
          if (slug === 'branch-risk-summary') {
            const summaryMap = new Map<string, any>();
            filtered.forEach(r => {
              const bName = r.branch || 'Unknown';
              if (!summaryMap.has(bName)) {
                summaryMap.set(bName, { branch: bName, total_flagged: 0, high_risk: 0, medium_risk: 0, low_risk: 0, pending_inv: 0 });
              }
              const item = summaryMap.get(bName);
              item.total_flagged++;
              if (r.risk_level === 'High') item.high_risk++;
              else if (r.risk_level === 'Medium') item.medium_risk++;
              else if (r.risk_level === 'Low') item.low_risk++;
              if (r.status === 'Under investigation') item.pending_inv++;
            });
            this.rows.set(Array.from(summaryMap.values()));
          } else {
            this.rows.set(filtered);
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to retrieve watch list report data.');
          this.loading.set(false);
        }
      });
    }
  }

  findReport() {
    this.loadReportData();
  }

  reset() {
    const def = this.definition();
    if (def) {
      this.filters.set({ ...def.defaultFilters });
      this.loadReportData();
    }
  }

  print() {
    window.print();
  }

  exportExcel() {
    const data = this.rows();
    const def = this.definition();
    if (data.length && def) {
      const cols = def.columns.map(c => ({ field: c.key, header: c.label.toUpperCase() }));
      const fileName = `${this.reportSlug()}_${new Date().getTime()}`;
      const headers = ['RAJARSHI SHAHU SAHAKARI BANK LTD. - EWS PLATFORM', def.title.toUpperCase(), `REPORT RUN DATE: ${this.fullDateTime.toUpperCase()}`];
      this.exportService.exportToExcel(data, cols, fileName, headers);
    }
  }

  goBack() {
    this.router.navigate(['/ews/reports']);
  }

  formatDate(val: any): string {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(val);
    }
  }

  statusSeverity(val: string): string {
    const v = (val || '').toLowerCase();
    if (v.includes('high') || v.includes('npa') || v.includes('overdue')) return 'bg-red-50 text-red-700 border-1 border-red-200';
    if (v.includes('medium') || v.includes('pending')) return 'bg-amber-50 text-amber-700 border-1 border-amber-200';
    if (v.includes('low') || v.includes('resolved') || v.includes('normal') || v.includes('active')) return 'bg-emerald-50 text-emerald-700 border-1 border-emerald-200';
    if (v.includes('investigation')) return 'bg-blue-50 text-blue-700 border-1 border-blue-200';
    return 'bg-surface-100 text-700 border-1 surface-border';
  }
}
