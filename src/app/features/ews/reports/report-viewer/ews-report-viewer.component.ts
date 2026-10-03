import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { RippleModule } from 'primeng/ripple';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { EwsApiService } from '../../services/ews-api.service';
import { ExportService } from '../../../../core/services/export/export.service';

export interface ReportColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'currency' | 'date' | 'status' | 'badge';
}

export interface ReportFilter {
  key: string;
  label: string;
  type: 'multiselect' | 'select' | 'text' | 'date' | 'number';
  options?: { label: string; value: any }[];
  placeholder?: string;
}

export interface ReportDefinition {
  slug: string;
  reportCode?: string;
  title: string;
  category: string;
  desc: string;
  orientation?: 'portrait' | 'landscape';
  columns: ReportColumn[];
  filters: ReportFilter[];
  defaultFilters: Record<string, any>;
  notes?: string[];
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
    SelectModule,
    MultiSelectModule
  ],
  template: `
    <div class="report-viewer">
      <!-- Title and Action Bar (Hidden on Print) -->
      <header class="report-titlebar no-print">
        <div class="flex align-items-center gap-2">
          <span *ngIf="definition()?.reportCode" class="px-2 py-0.5 text-xs font-bold border-round bg-blue-50 text-blue-700 border-1 border-blue-200">
            {{ definition()?.reportCode }}
          </span>
          <h1 class="m-0 text-lg font-bold text-900">{{ definition()?.title || 'Report' }}</h1>
        </div>
        <div class="flex align-items-center gap-2">
          <button 
            pButton 
            type="button" 
            icon="pi pi-arrow-left" 
            label="Back" 
            severity="secondary" 
            [outlined]="true" 
            (click)="goBack()">
          </button>
        </div>
      </header>

      <!-- Filter Panel (Hidden on Print) -->
      <div class="filter-panel no-print" *ngIf="definition() && definition()!.filters.length > 0">
        <ng-container *ngFor="let filter of definition()?.filters">
          <div class="field">
            <div class="flex align-items-center justify-content-between">
              <label>{{ filter.label }}</label>
              <span *ngIf="filter.type === 'multiselect' && filters()[filter.key]?.length > 0" class="filter-count-badge">
                {{ filters()[filter.key].length }} selected
              </span>
            </div>
            
            <!-- Multi-Select Dropdown with Checkboxes and Search -->
            <p-multiselect
              *ngIf="filter.type === 'multiselect'"
              [options]="filter.options || []" 
              [(ngModel)]="filters()[filter.key]" 
              optionLabel="label" 
              optionValue="value" 
              [filter]="(filter.options?.length || 0) > 4" 
              filterBy="label" 
              [placeholder]="filter.placeholder || 'All'"
              [maxSelectedLabels]="2"
              selectedItemsLabel="{0} selected"
              [showClear]="true"
              appendTo="body"
              styleClass="w-full report-multiselect">
            </p-multiselect>

            <!-- Single Select Dropdown -->
            <p-select 
              *ngIf="filter.type === 'select'"
              [options]="filter.options || []" 
              [(ngModel)]="filters()[filter.key]" 
              optionLabel="label" 
              optionValue="value" 
              [filter]="(filter.options?.length || 0) > 4" 
              filterBy="label" 
              placeholder="All"
              appendTo="body"
              styleClass="w-full report-search-dropdown">
            </p-select>

            <!-- Date Input -->
            <input *ngIf="filter.type === 'date'" type="date" [(ngModel)]="filters()[filter.key]" />

            <!-- Number Input -->
            <input *ngIf="filter.type === 'number'" type="number" [(ngModel)]="filters()[filter.key]" placeholder="Min amount..." />

            <!-- Text Input -->
            <input *ngIf="filter.type === 'text'" type="text" [(ngModel)]="filters()[filter.key]" placeholder="Search..." (keyup.enter)="findReport()" />
          </div>
        </ng-container>

        <!-- Filter Actions -->
        <div class="filter-actions">
          <button pButton type="button" icon="pi pi-search" label="Apply" [loading]="loading()" (click)="findReport()"></button>
          <button pButton type="button" icon="pi pi-refresh" label="Reset" severity="secondary" [outlined]="true" (click)="reset()"></button>
          <button pButton type="button" icon="pi pi-file-excel" label="Excel" severity="success" [disabled]="rows().length === 0 && !hasData()" (click)="exportExcel()"></button>
          <button pButton type="button" icon="pi pi-file-pdf" label="PDF" severity="danger" [disabled]="rows().length === 0 && !hasData()" (click)="exportPdf()"></button>
          <button pButton type="button" icon="pi pi-print" label="Print" severity="secondary" [outlined]="true" [disabled]="rows().length === 0 && !hasData()" (click)="print()"></button>
        </div>
      </div>

      <!-- Error / Alert Message -->
      <div *ngIf="error()" class="report-alert no-print">
        <i class="pi pi-exclamation-triangle mr-1"></i> {{ error() }}
      </div>

      <!-- Optional KPI Summary Cards -->
      <div *ngIf="summaryCards().length > 0" class="summary-cards-container">
        <div *ngFor="let card of summaryCards()" class="kpi-card">
          <div class="kpi-label">{{ card.label }}</div>
          <div class="kpi-value" [ngClass]="card.colorClass || 'text-900'">{{ card.value }}</div>
          <div *ngIf="card.subtext" class="kpi-subtext">{{ card.subtext }}</div>
        </div>
      </div>

      <!-- Optional Secondary / Summary Table -->
      <div *ngIf="secondaryTable() && secondaryTable()!.rows.length > 0" class="official-report-sheet mb-3">
        <div class="flex align-items-center justify-content-between mb-2">
          <h6 class="m-0 font-bold text-sm text-900">{{ secondaryTable()?.title }}</h6>
        </div>
        <div class="official-report-table-wrap overflow-x-auto">
          <table class="official-report-table w-full border-collapse">
            <thead>
              <tr class="bg-surface-100 text-700 font-bold border-bottom-2 surface-border">
                <th *ngFor="let col of secondaryTable()?.columns"
                    [class.text-center]="col.align === 'center'"
                    [class.text-right]="col.align === 'right'"
                    class="p-2.5 text-xs uppercase tracking-wide font-extrabold">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of secondaryTable()?.rows" class="border-bottom-1 surface-border hover:bg-surface-50">
                <td *ngFor="let col of secondaryTable()?.columns"
                    [class.text-center]="col.align === 'center'"
                    [class.text-right]="col.align === 'right'"
                    class="p-2.5 text-xs text-800">
                  <ng-container [ngSwitch]="col.type">
                    <ng-container *ngSwitchCase="'currency'">
                      {{ formatCurrency(r[col.key]) }}
                    </ng-container>
                    <ng-container *ngSwitchCase="'status'">
                      <span class="status-print-badge px-2 py-0.5 text-xs font-bold border-round" [ngClass]="statusSeverity(r[col.key])">
                        {{ r[col.key] || '—' }}
                      </span>
                    </ng-container>
                    <ng-container *ngSwitchDefault>
                      {{ r[col.key] ?? '—' }}
                    </ng-container>
                  </ng-container>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Official Report Sheet Container -->
      <div class="official-report-sheet">
        
        <!-- Official Print Header (Visible ONLY when printing) -->
        <div class="official-report-header print-only">
          <div class="official-report-brand-row">
            <div class="official-report-logo">
              <i class="pi pi-shield"></i>
              <span>EWS</span>
            </div>
            <div class="official-report-bank">
              <p><strong>Bank:</strong> RAJARSHI SHAHU SAHAKARI BANK LTD. PUNE</p>
              <p><strong>Report:</strong> {{ definition()?.title }}</p>
            </div>
          </div>
          <div class="official-report-meta">
            <p><strong>Run Date & Time:</strong> {{ fullDateTime }} | <strong>Source:</strong> CBS Loan Extract As of 31-May-2026</p>
          </div>
        </div>

        <div *ngIf="tableTitle" class="flex align-items-center justify-content-between mb-2">
          <h6 class="m-0 font-bold text-sm text-900">{{ tableTitle }}</h6>
          <span class="text-xs text-500 font-medium">{{ rows().length }} records</span>
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
                    class="p-2.5 text-xs uppercase tracking-wide font-extrabold">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of rows(); let idx = index" 
                  class="border-bottom-1 surface-border hover:bg-surface-50"
                  [ngClass]="{'bg-surface-100 font-bold': isTotalRow(row)}">
                <td *ngFor="let col of definition()?.columns"
                    [class.text-center]="col.align === 'center'"
                    [class.text-right]="col.align === 'right'"
                    class="p-2.5 text-xs text-800">
                  
                  <ng-container [ngSwitch]="col.type">
                    <!-- Status / Risk Badge -->
                    <ng-container *ngSwitchCase="'status'">
                      <span class="status-print-badge px-2 py-0.5 text-xs font-bold border-round inline-flex align-items-center gap-1"
                            [ngClass]="statusSeverity(row[col.key])">
                        {{ row[col.key] || '—' }}
                      </span>
                    </ng-container>

                    <ng-container *ngSwitchCase="'badge'">
                      <span class="status-print-badge px-2 py-0.5 text-xs font-bold border-round bg-blue-50 text-blue-700 border-1 border-blue-200">
                        {{ row[col.key] || '0' }}
                      </span>
                    </ng-container>
                    
                    <!-- Currency Amount (₹) -->
                    <ng-container *ngSwitchCase="'currency'">
                      <span class="font-semibold">{{ formatCurrency(row[col.key]) }}</span>
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
        <div *ngIf="rows().length === 0 && !loading()" class="empty-state p-5 text-center text-500">
          <i class="pi pi-inbox text-3xl text-300 mb-2 block"></i>
          <div class="font-bold text-sm text-800 mb-1">No Records Found</div>
          <div class="text-xs text-400">Try adjusting your filters and click Apply.</div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading()" class="p-5 text-center text-500">
          <i class="pi pi-spin pi-spinner text-2xl text-blue-500 mb-2 block"></i>
          <div class="text-xs text-500">Loading data...</div>
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
      border-radius: 8px;
      background: #fff;
    }

    .report-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: .85rem 1.25rem;

      .report-category-tag {
        display: block;
        color: #1f5f93;
        font-size: .72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
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
      gap: .65rem .75rem;
      padding: 1rem;
      align-items: end;
      background: #f8fafc;
    }

    .field {
      display: flex;
      flex-direction: column;
      grid-column: span 3;
      gap: .25rem;

      label {
        color: #334155;
        font-size: .72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .filter-count-badge {
        font-size: 0.65rem;
        font-weight: 700;
        color: #2563eb;
        background: #eff6ff;
        padding: 1px 6px;
        border-radius: 4px;
      }

      select,
      input {
        width: 100%;
        min-height: 2.35rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #fff;
        color: #0f172a;
        padding: .35rem .6rem;
        font: inherit;
        font-size: 0.85rem;
        box-sizing: border-box;
      }

      input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6;
      }
    }

    @media (max-width: 991px) {
      .field {
        grid-column: span 6;
      }
    }

    @media (max-width: 640px) {
      .field {
        grid-column: span 12;
      }
    }

    .filter-actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
      gap: .5rem;
      flex-wrap: wrap;
      margin-top: .4rem;
      padding-top: .6rem;
      border-top: 1px dashed #e2e8f0;
    }

    .summary-cards-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: .75rem;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: .75rem .9rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);

      .kpi-label {
        font-size: .68rem;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 2px;
      }

      .kpi-value {
        font-size: 1.15rem;
        font-weight: 800;
      }

      .kpi-subtext {
        font-size: .65rem;
        color: #94a3b8;
        margin-top: 2px;
      }
    }

    .report-alert {
      padding: .75rem .9rem;
      color: #b42318;
      background: #fff4f2;
      border-color: #ffd3cc;
      font-weight: 700;
    }

    .official-report-sheet {
      padding: 1.25rem;
    }

    .official-report-table-wrap {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .official-report-table {
      font-size: 0.85rem;

      th {
        background-color: #f8fafc;
        border-bottom: 1px solid #cbd5e1;
      }

      td {
        border-bottom: 1px solid #f1f5f9;
      }
    }

    @page {
      size: landscape;
      margin: 8mm 10mm;
    }

    .print-only {
      display: none;
    }

    ::ng-deep {
      .report-multiselect {
        width: 100% !important;
        .p-multiselect {
          width: 100% !important;
          min-height: 2.35rem !important;
          border-radius: 6px !important;
          border-color: #cbd5e1 !important;
          background: #ffffff !important;
        }
        .p-multiselect-label {
          padding: 0.35rem 0.6rem !important;
          font-size: 0.85rem !important;
        }
      }

      @media print {
        app-topbar,
        app-sidebar,
        app-breadcrumb,
        app-footer,
        .layout-topbar,
        .layout-sidebar,
        .layout-breadcrumb,
        .no-print {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
        }

        body, html {
          background: #ffffff !important;
          color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .layout-main-container,
        .layout-main,
        .report-viewer,
        .official-report-sheet {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .print-only {
          display: block !important;
        }

        .official-report-header {
          margin-bottom: 12px !important;
        }

        .official-report-brand-row {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-end !important;
          border-bottom: 2px solid #0f172a !important;
          padding-bottom: 6px !important;
          margin-bottom: 6px !important;
        }

        .official-report-logo {
          background-color: #09233d !important;
          color: #ffffff !important;
          padding: 6px 12px !important;
          font-weight: 800 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .official-report-bank {
          text-align: right !important;
          font-size: 0.75rem !important;
          p { margin: 2px 0 !important; }
        }

        .official-report-meta {
          font-size: 0.7rem !important;
          color: #475569 !important;
          margin-bottom: 8px !important;
          p { margin: 1px 0 !important; }
        }

        .official-report-table {
          width: 100% !important;
          border-collapse: collapse !important;
          th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            border: 1px solid #cbd5e1 !important;
            font-size: 0.65rem !important;
            padding: 3px 5px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          td {
            border: 1px solid #e2e8f0 !important;
            font-size: 0.6rem !important;
            padding: 2.5px 5px !important;
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
  summaryCards = signal<any[]>([]);
  secondaryTable = signal<{ title: string; rows: any[]; columns: ReportColumn[] } | null>(null);
  tableTitle = '';
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  get fullDateTime(): string {
    const d = new Date();
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
  }

  hasData(): boolean {
    return this.rows().length > 0 || (this.secondaryTable()?.rows?.length || 0) > 0 || this.summaryCards().length > 0;
  }

  isTotalRow(row: any): boolean {
    return (
      row.number === 'TOTAL' ||
      row.branch_code === 'TOTAL' ||
      row.irac_classification === 'TOTAL' ||
      row.product_code === 'TOTAL' ||
      row.status === 'TOTAL'
    );
  }

  private reportRegistry: Record<string, ReportDefinition> = {
    // REPORT 02
    'account-signal-detail': {
      slug: 'account-signal-detail',
      reportCode: 'REPORT 02',
      title: 'Account Signal Detail',
      category: 'Master Reports',
      orientation: 'landscape',
      desc: 'Full breakdown of flagged accounts ranked by exposure with risk levels, IRAC staging, and triggering EWS signals.',
      defaultFilters: { branch: [], risk_level: [], search: '', min_amount: null },
      filters: [
        { key: 'branch', label: 'Branch', type: 'multiselect', placeholder: 'All Branches', options: [] },
        { 
          key: 'risk_level', 
          label: 'Risk Level', 
          type: 'multiselect', 
          placeholder: 'All Risk Levels',
          options: [
            { label: 'VERY HIGH', value: 'VERY HIGH' },
            { label: 'HIGH', value: 'HIGH' },
            { label: 'MEDIUM', value: 'MEDIUM' }
          ] 
        },
        { key: 'search', label: 'Search', type: 'text' },
        { key: 'min_amount', label: 'Min Amount (₹)', type: 'number' }
      ],
      columns: [
        { key: 'branch', label: 'Branch', width: '70px', align: 'center' },
        { key: 'account_no', label: 'Account No', width: '135px' },
        { key: 'account_holder', label: 'Account Holder' },
        { key: 'product', label: 'Product / Facility', width: '180px' },
        { key: 'principal_os', label: 'Principal O/s (₹)', type: 'currency', width: '130px', align: 'right' },
        { key: 'signals_fired', label: 'Signals', type: 'badge', width: '70px', align: 'center' },
        { key: 'signals_triggered', label: 'Signals Triggered (Detail)' },
        { key: 'irac_rating', label: 'IRAC Staging', type: 'status', width: '110px', align: 'center' },
        { key: 'overall_risk', label: 'Overall Risk', type: 'status', width: '100px', align: 'center' }
      ]
    },

    // REPORT 04
    'branch-wise-summary': {
      slug: 'branch-wise-summary',
      reportCode: 'REPORT 04',
      title: 'Branch-Wise Summary',
      category: 'Branch & Portfolio Reports',
      orientation: 'landscape',
      desc: 'Branch-by-branch distribution of total portfolio vs flagged accounts, risk tiers, and confirmed NPA accounts.',
      defaultFilters: { branch: [] },
      filters: [
        { key: 'branch', label: 'Branch', type: 'multiselect', placeholder: 'All Branches', options: [] }
      ],
      columns: [
        { key: 'branch_code', label: 'Branch Code', width: '90px', align: 'center' },
        { key: 'branch_name', label: 'Branch Name' },
        { key: 'total_accounts', label: 'Total A/Cs', type: 'number', width: '95px', align: 'right' },
        { key: 'total_principal', label: 'Total Principal O/s (₹)', type: 'currency', width: '150px', align: 'right' },
        { key: 'flagged_accounts', label: 'Flagged A/Cs', type: 'number', width: '105px', align: 'right' },
        { key: 'pct_flagged', label: '% Flagged', width: '90px', align: 'right' },
        { key: 'very_high', label: 'Very High', type: 'number', width: '90px', align: 'right' },
        { key: 'high_risk', label: 'High', type: 'number', width: '85px', align: 'right' },
        { key: 'medium_risk', label: 'Medium', type: 'number', width: '90px', align: 'right' },
        { key: 'npa_accounts', label: 'NPA A/Cs', type: 'number', width: '90px', align: 'right' }
      ]
    },

    // REPORT 05
    'signal-wise-distribution': {
      slug: 'signal-wise-distribution',
      reportCode: 'REPORT 05',
      title: 'Signal-Wise Distribution',
      category: 'Master Reports',
      orientation: 'portrait',
      desc: 'Breakdown of firing EWS signals across Very High, High, and Medium severity tiers with portfolio percentages.',
      defaultFilters: { branch: [] },
      filters: [
        { key: 'branch', label: 'Branch', type: 'multiselect', placeholder: 'All Branches', options: [] }
      ],
      columns: [
        { key: 'number', label: '#', width: '50px', align: 'center' },
        { key: 'name', label: 'EWS Early Warning Signal' },
        { key: 'very_high', label: 'Very High', type: 'number', width: '90px', align: 'right' },
        { key: 'high', label: 'High', type: 'number', width: '85px', align: 'right' },
        { key: 'medium', label: 'Medium', type: 'number', width: '85px', align: 'right' },
        { key: 'total_flagged', label: 'Total Flagged', type: 'number', width: '110px', align: 'right' },
        { key: 'pct_portfolio', label: '% of Portfolio', width: '110px', align: 'right' }
      ]
    },

    // REPORT 06
    'loan-type-risk': {
      slug: 'loan-type-risk',
      reportCode: 'REPORT 06',
      title: 'Loan Type Risk',
      category: 'Branch & Portfolio Reports',
      orientation: 'landscape',
      desc: 'Risk concentration across 49 loan products in the portfolio: Total accounts, flagged ratios, and risk breakdown.',
      defaultFilters: { branch: [], search: '' },
      filters: [
        { key: 'branch', label: 'Branch', type: 'multiselect', placeholder: 'All Branches', options: [] },
        { key: 'search', label: 'Search Product', type: 'text' }
      ],
      columns: [
        { key: 'product_code', label: 'Product Code', width: '100px', align: 'center' },
        { key: 'product_desc', label: 'Product Description' },
        { key: 'total_accounts', label: 'Total A/Cs', type: 'number', width: '95px', align: 'right' },
        { key: 'total_principal', label: 'Total Principal O/s (₹)', type: 'currency', width: '150px', align: 'right' },
        { key: 'flagged_accounts', label: 'Flagged A/Cs', type: 'number', width: '105px', align: 'right' },
        { key: 'pct_flagged', label: '% Flagged', width: '90px', align: 'right' },
        { key: 'very_high', label: 'Very High', type: 'number', width: '90px', align: 'right' },
        { key: 'high_risk', label: 'High', type: 'number', width: '85px', align: 'right' },
        { key: 'medium_risk', label: 'Medium', type: 'number', width: '90px', align: 'right' }
      ]
    },

    // REPORT 07
    'cro-dashboard-report': {
      slug: 'cro-dashboard-report',
      reportCode: 'REPORT 07',
      title: 'CRO Executive Dashboard',
      category: 'Master Reports',
      orientation: 'landscape',
      desc: 'Chief Risk Officer & Board risk overview: Portfolio snapshot metrics and Top 30 Very-High-Risk accounts by exposure.',
      defaultFilters: { branch: [], rating: [], search: '', min_amount: null },
      filters: [
        { key: 'branch', label: 'Branch', type: 'multiselect', placeholder: 'All Branches', options: [] },
        { 
          key: 'rating', 
          label: 'IRAC Rating', 
          type: 'multiselect', 
          placeholder: 'All Ratings',
          options: [
            { label: 'STANDARD', value: 'STANDARD' },
            { label: 'SMA 0', value: 'SMA 0' },
            { label: 'SMA 1', value: 'SMA 1' },
            { label: 'SMA 2', value: 'SMA 2' },
            { label: 'SUB STANDARD', value: 'SUB STANDARD' },
            { label: 'DOUBTFUL 1', value: 'DOUBTFUL 1' },
            { label: 'DOUBTFUL 2', value: 'DOUBTFUL 2' },
            { label: 'DOUBTFUL 3', value: 'DOUBTFUL 3' }
          ] 
        },
        { key: 'search', label: 'Search', type: 'text' }
      ],
      columns: [
        { key: 'branch', label: 'Branch', width: '70px', align: 'center' },
        { key: 'account_no', label: 'Account No', width: '135px' },
        { key: 'account_holder', label: 'Account Holder' },
        { key: 'product', label: 'Product' },
        { key: 'principal_os', label: 'Principal O/s (₹)', type: 'currency', width: '135px', align: 'right' },
        { key: 'irac_rating', label: 'IRAC Rating', type: 'status', width: '115px', align: 'center' },
        { key: 'overall_risk', label: 'Overall Risk', type: 'status', width: '105px', align: 'center' },
        { key: 'signals', label: 'Signals Fired', type: 'badge', width: '90px', align: 'center' }
      ]
    },

    // REPORT 09
    'rbi-compliance-report': {
      slug: 'rbi-compliance-report',
      reportCode: 'REPORT 09',
      title: 'RBI / IRAC Compliance',
      category: 'Monitoring & Regulatory Compliance',
      orientation: 'portrait',
      desc: 'RBI IRAC asset classification (Standard, SMA 0/1/2, Sub-Standard, Doubtful 1/2/3) with illustrative provisioning calculations.',
      defaultFilters: { branch: [] },
      filters: [
        { key: 'branch', label: 'Branch', type: 'multiselect', placeholder: 'All Branches', options: [] }
      ],
      columns: [
        { key: 'irac_classification', label: 'IRAC Asset Classification', width: '180px' },
        { key: 'accounts', label: 'A/Cs', type: 'number', width: '95px', align: 'right' },
        { key: 'principal_os', label: 'Principal O/s (₹)', type: 'currency', width: '150px', align: 'right' },
        { key: 'provision_pct', label: 'Illustrative Provision %', width: '140px', align: 'right' },
        { key: 'provision_amount', label: 'Illustrative Provision (₹)', type: 'currency', width: '160px', align: 'right' },
        { key: 'pct_portfolio_os', label: '% of Portfolio (O/s)', width: '130px', align: 'right' }
      ]
    },

    // REPORT 10
    'inspection-due-report': {
      slug: 'inspection-due-report',
      reportCode: 'REPORT 10',
      title: 'Stock / Security Inspection Due',
      category: 'Monitoring & Regulatory Compliance',
      orientation: 'landscape',
      desc: 'Periodic inspection audit of Cash Credit (working-capital-against-stock) facilities where inspection is mandated by RBI.',
      defaultFilters: { branch: [], status: [], search: '' },
      filters: [
        { key: 'branch', label: 'Branch', type: 'multiselect', placeholder: 'All Branches', options: [] },
        { 
          key: 'status', 
          label: 'Inspection Status', 
          type: 'multiselect', 
          placeholder: 'All Statuses',
          options: [
            { label: 'NOT ON RECORD', value: 'NOT ON RECORD' },
            { label: 'OVERDUE', value: 'OVERDUE' },
            { label: 'DUE ≤ 30 DAYS', value: 'DUE <= 30 DAYS' },
            { label: 'CURRENT', value: 'CURRENT' }
          ] 
        },
        { key: 'search', label: 'Search', type: 'text' }
      ],
      columns: [
        { key: 'branch', label: 'Branch', width: '70px', align: 'center' },
        { key: 'account_no', label: 'Account No', width: '140px' },
        { key: 'account_holder', label: 'Account Holder' },
        { key: 'product', label: 'Facility Type' },
        { key: 'principal_os', label: 'Principal O/s (₹)', type: 'currency', width: '140px', align: 'right' },
        { key: 'irac_rating', label: 'IRAC Rating', type: 'status', width: '120px', align: 'center' },
        { key: 'inspection_status', label: 'Inspection Status', type: 'status', width: '130px', align: 'center' }
      ]
    },

    // REPORT 11
    'insurance-renewal-report': {
      slug: 'insurance-renewal-report',
      reportCode: 'REPORT 11',
      title: 'Insurance Renewal Due',
      category: 'Monitoring & Regulatory Compliance',
      orientation: 'landscape',
      desc: 'Collateral insurance audit: LAPSED policies, renewals due in 30/90 days, insurer exposures, and top lapsed accounts.',
      defaultFilters: { branch: [], status: [], insurer: [], search: '' },
      filters: [
        { key: 'branch', label: 'Branch', type: 'multiselect', placeholder: 'All Branches', options: [] },
        { 
          key: 'status', 
          label: 'Policy Status', 
          type: 'multiselect', 
          placeholder: 'All Statuses',
          options: [
            { label: 'LAPSED', value: 'LAPSED' },
            { label: 'DUE ≤ 30 DAYS', value: 'DUE ≤ 30 DAYS' },
            { label: 'DUE ≤ 90 DAYS', value: 'DUE ≤ 90 DAYS' },
            { label: 'CURRENT', value: 'CURRENT' }
          ] 
        },
        { 
          key: 'insurer', 
          label: 'Insurer', 
          type: 'multiselect', 
          placeholder: 'All Insurers',
          options: [
            { label: 'NATIONAL INSURANCE COMPANY', value: 'NATIONAL INSURANCE' },
            { label: 'ICICI LOMBARD', value: 'ICICI LOMBARD' },
            { label: 'NEW INDIA ASSURANCE', value: 'NEW INDIA' },
            { label: 'UNITED INDIA INSURANCE', value: 'UNITED INDIA' }
          ] 
        },
        { key: 'search', label: 'Search', type: 'text' }
      ],
      columns: [
        { key: 'branch', label: 'Branch', width: '70px', align: 'center' },
        { key: 'account_no', label: 'Account No', width: '135px' },
        { key: 'account_holder', label: 'Account Holder' },
        { key: 'product', label: 'Product / Security' },
        { key: 'insurer', label: 'Insurer', width: '170px' },
        { key: 'policy_due', label: 'Policy Due', width: '100px', align: 'center' },
        { key: 'principal_os', label: 'Principal O/s (₹)', type: 'currency', width: '135px', align: 'right' },
        { key: 'status', label: 'Status', type: 'status', width: '115px', align: 'center' }
      ]
    },

    // REPORT 12
    'cersai-pendency-report': {
      slug: 'cersai-pendency-report',
      reportCode: 'REPORT 12',
      title: 'CERSAI Pendency',
      category: 'Monitoring & Regulatory Compliance',
      orientation: 'landscape',
      desc: 'Branch-wise summary and top exposures for accounts secured by registered mortgage / immovable property pending CERSAI charge noting.',
      defaultFilters: { branch: [], security_type: [], search: '' },
      filters: [
        { key: 'branch', label: 'Branch', type: 'multiselect', placeholder: 'All Branches', options: [] },
        { 
          key: 'security_type', 
          label: 'Security Type', 
          type: 'multiselect', 
          placeholder: 'All Security Types',
          options: [
            { label: 'REGISTER MORTGAGE', value: 'REGISTER MORTGAGE' },
            { label: 'LAND & BUILDING', value: 'LAND & BUILDING' },
            { label: 'FLAT / BUNGLOW', value: 'BUNGLOW' }
          ] 
        },
        { key: 'search', label: 'Search', type: 'text' }
      ],
      columns: [
        { key: 'branch', label: 'Branch', width: '70px', align: 'center' },
        { key: 'account_no', label: 'Account No', width: '140px' },
        { key: 'account_holder', label: 'Account Holder' },
        { key: 'security_type', label: 'Collateral Security Type' },
        { key: 'principal_os', label: 'Principal O/s (₹)', type: 'currency', width: '150px', align: 'right' },
        { key: 'status', label: 'CERSAI Status', type: 'status', width: '110px', align: 'center' }
      ]
    },

    // Legacy Operational Reports
    'current-ews-watchlist': {
      slug: 'current-ews-watchlist',
      reportCode: 'EWS-WL',
      title: 'Watch List',
      category: 'Master Reports',
      orientation: 'landscape',
      desc: 'All active portfolio accounts on watch list with signal count, risk severity, and days on list.',
      defaultFilters: { branch: [], risk_level: [], search: '' },
      filters: [
        { key: 'branch', label: 'Branch', type: 'multiselect', placeholder: 'All Branches', options: [] },
        { key: 'risk_level', label: 'Risk Level', type: 'multiselect', placeholder: 'All Risk Levels', options: [{ label: 'High', value: 'High' }, { label: 'Medium', value: 'Medium' }, { label: 'Low', value: 'Low' }] },
        { key: 'search', label: 'Search', type: 'text' }
      ],
      columns: [
        { key: 'account_id', label: 'Acc No', width: '120px' },
        { key: 'borrower_name', label: 'Borrower Name' },
        { key: 'branch', label: 'Branch', width: '110px' },
        { key: 'loan_type', label: 'Loan Type', width: '160px' },
        { key: 'risk_level', label: 'Risk Level', type: 'status', width: '110px', align: 'center' },
        { key: 'signal_count', label: 'Signals', type: 'badge', width: '80px', align: 'center' },
        { key: 'status', label: 'Status', type: 'status', width: '130px', align: 'center' }
      ]
    },
    'bankwide-ews-health': {
      slug: 'bankwide-ews-health',
      reportCode: 'EWS-HLTH',
      title: 'Bank-Wide Health',
      category: 'Branch & Portfolio Reports',
      orientation: 'landscape',
      desc: 'Overall EWS activity across all branches for Board and executive management.',
      defaultFilters: { status: [] },
      filters: [
        { key: 'status', label: 'Status', type: 'multiselect', placeholder: 'All Statuses', options: [{ label: 'Under investigation', value: 'Under investigation' }, { label: 'Escalated', value: 'Escalated' }, { label: 'Pending review', value: 'Pending review' }] }
      ],
      columns: [
        { key: 'account_id', label: 'Acc No', width: '120px' },
        { key: 'borrower_name', label: 'Borrower Name' },
        { key: 'branch', label: 'Branch', width: '110px' },
        { key: 'risk_level', label: 'Risk Level', type: 'status', width: '110px', align: 'center' },
        { key: 'source', label: 'Source', width: '110px' },
        { key: 'status', label: 'Status', type: 'status', width: '130px', align: 'center' }
      ]
    },
    'system-inspection-audit': {
      slug: 'system-inspection-audit',
      reportCode: 'AUDIT',
      title: 'System Audit Trail',
      category: 'Monitoring & Regulatory Compliance',
      orientation: 'landscape',
      desc: 'Complete timestamped audit log of all system changes for RBI inspection.',
      defaultFilters: { search: '' },
      filters: [
        { key: 'search', label: 'Search', type: 'text' }
      ],
      columns: [
        { key: 'action', label: 'Action Executed', width: '180px' },
        { key: 'meta', label: 'Audit Metadata' },
        { key: 'created_at', label: 'Timestamp', type: 'date', width: '150px' }
      ]
    }
  };

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('reportSlug') || 'account-signal-detail';
      this.reportSlug.set(slug);
      this.loadBranchesAndReport(slug);
    });
  }

  loadBranchesAndReport(slug: string) {
    this.loading.set(true);
    const def = this.reportRegistry[slug] || this.reportRegistry['account-signal-detail'];
    
    this.ewsApi.getBranches().subscribe({
      next: (branches: any[]) => {
        let branchOpts = (branches || []).map(b => ({ label: `${b.name} (${b.code})`, value: String(b.code) }));
        if (branchOpts.length === 0) {
          branchOpts = Array.from({ length: 16 }, (_, i) => ({ label: `Branch ${i + 1}`, value: String(i + 1) }));
        }
        def.filters.forEach(f => {
          if (f.key === 'branch') f.options = branchOpts;
        });
        this.definition.set(def);
        this.filters.set(JSON.parse(JSON.stringify(def.defaultFilters)));
        this.loadReportData();
      },
      error: () => {
        const fallbackBranches = Array.from({ length: 16 }, (_, i) => ({ label: `Branch ${i + 1}`, value: String(i + 1) }));
        def.filters.forEach(f => {
          if (f.key === 'branch') f.options = fallbackBranches;
        });
        this.definition.set(def);
        this.filters.set(JSON.parse(JSON.stringify(def.defaultFilters)));
        this.loadReportData();
      }
    });
  }

  /** Prepare query params, joining multi-select array values into comma-separated strings */
  private prepareQueryParams(): Record<string, any> {
    const raw = this.filters();
    const clean: Record<string, any> = {};

    Object.entries(raw).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length > 0) {
          clean[k] = v.join(',');
        }
      } else if (v !== undefined && v !== null && v !== '' && v !== 'all') {
        clean[k] = v;
      }
    });

    return clean;
  }

  loadReportData() {
    const slug = this.reportSlug();
    const queryParams = this.prepareQueryParams();
    this.loading.set(true);
    this.error.set(null);
    this.summaryCards.set([]);
    this.secondaryTable.set(null);
    this.tableTitle = '';

    // ────────────────────────────────────────────────────────────────────────
    // REPORT 02 — ACCOUNT SIGNAL DETAIL
    // ────────────────────────────────────────────────────────────────────────
    if (slug === 'account-signal-detail') {
      this.ewsApi.getAccountSignalDetailReport(queryParams).subscribe({
        next: (data: any[]) => {
          this.rows.set(data || []);
          this.tableTitle = 'Flagged Portfolio Accounts (Ranked by Exposure)';
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load Account Signal Detail Report.');
          this.loading.set(false);
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // REPORT 04 — BRANCH-WISE SUMMARY
    // ────────────────────────────────────────────────────────────────────────
    else if (slug === 'branch-wise-summary') {
      this.ewsApi.getBranchWiseSummaryReport(queryParams).subscribe({
        next: (data: any[]) => {
          const list = data || [];
          let sumAcc = 0;
          let sumOs = 0;
          let sumFlagged = 0;
          let sumVh = 0;
          let sumH = 0;
          let sumM = 0;
          let sumNpa = 0;

          list.forEach(r => {
            sumAcc += Number(r.total_accounts) || 0;
            sumOs += Number(r.total_principal) || 0;
            sumFlagged += Number(r.flagged_accounts) || 0;
            sumVh += Number(r.very_high) || 0;
            sumH += Number(r.high_risk) || 0;
            sumM += Number(r.medium_risk) || 0;
            sumNpa += Number(r.npa_accounts) || 0;
          });

          this.summaryCards.set([
            { label: 'Branches In View', value: String(list.length), colorClass: 'text-indigo-600' },
            { label: 'Total Accounts', value: sumAcc.toLocaleString('en-IN'), colorClass: 'text-slate-800' },
            { label: 'Total Principal O/s', value: this.formatCurrency(sumOs), colorClass: 'text-slate-900' },
            { label: 'Flagged Accounts', value: sumFlagged.toLocaleString('en-IN'), colorClass: 'text-amber-600', subtext: `${((sumFlagged / (sumAcc || 1)) * 100).toFixed(1)}% of Portfolio` },
            { label: 'Confirmed NPAs', value: sumNpa.toLocaleString('en-IN'), colorClass: 'text-red-600' },
          ]);

          const totalRow = {
            branch_code: 'TOTAL',
            branch_name: 'TOTAL (SELECTED)',
            total_accounts: sumAcc,
            total_principal: sumOs,
            flagged_accounts: sumFlagged,
            pct_flagged: ((sumFlagged / (sumAcc || 1)) * 100).toFixed(1) + '%',
            very_high: sumVh,
            high_risk: sumH,
            medium_risk: sumM,
            npa_accounts: sumNpa
          };

          this.rows.set([...list, totalRow]);
          this.tableTitle = 'Branch-by-Branch Portfolio Risk Matrix';
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load Branch-Wise EWS Summary.');
          this.loading.set(false);
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // REPORT 05 — SIGNAL-WISE DISTRIBUTION
    // ────────────────────────────────────────────────────────────────────────
    else if (slug === 'signal-wise-distribution') {
      this.ewsApi.getSignalWiseDistributionReport(queryParams).subscribe({
        next: (res: any) => {
          const list = res?.signals || [];
          if (res?.total_summary) {
            this.rows.set([...list, res.total_summary]);
          } else {
            this.rows.set(list);
          }
          this.summaryCards.set([
            { label: 'EWS Signals Evaluated', value: '14 Core Signals', colorClass: 'text-blue-700' },
            { label: 'Total Portfolio Accounts', value: (res?.total_portfolio || 8523).toLocaleString('en-IN'), colorClass: 'text-slate-800' },
            { label: 'Signal Triggers (Total)', value: (res?.total_summary?.total_flagged || 0).toLocaleString('en-IN'), colorClass: 'text-amber-700' }
          ]);
          this.tableTitle = 'Signal Frequency & Risk Classification Matrix';
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load Signal-Wise Distribution Report.');
          this.loading.set(false);
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // REPORT 06 — LOAN TYPE RISK REPORT
    // ────────────────────────────────────────────────────────────────────────
    else if (slug === 'loan-type-risk') {
      this.ewsApi.getLoanTypeRiskReport(queryParams).subscribe({
        next: (data: any[]) => {
          const list = data || [];
          let sumAcc = 0;
          let sumOs = 0;
          let sumFlagged = 0;
          let sumVh = 0;
          let sumH = 0;
          let sumM = 0;

          list.forEach(r => {
            sumAcc += Number(r.total_accounts) || 0;
            sumOs += Number(r.total_principal) || 0;
            sumFlagged += Number(r.flagged_accounts) || 0;
            sumVh += Number(r.very_high) || 0;
            sumH += Number(r.high_risk) || 0;
            sumM += Number(r.medium_risk) || 0;
          });

          this.summaryCards.set([
            { label: 'Active Loan Products', value: String(list.length), colorClass: 'text-blue-700' },
            { label: 'Total Accounts in View', value: sumAcc.toLocaleString('en-IN'), colorClass: 'text-slate-800' },
            { label: 'Total Exposure O/s', value: this.formatCurrency(sumOs), colorClass: 'text-slate-900' },
            { label: 'Total Flagged A/Cs', value: sumFlagged.toLocaleString('en-IN'), colorClass: 'text-amber-700', subtext: `${((sumFlagged / (sumAcc || 1)) * 100).toFixed(1)}% Flagged` }
          ]);

          const totalRow = {
            product_code: 'TOTAL',
            product_desc: 'ALL PRODUCTS TOTAL',
            total_accounts: sumAcc,
            total_principal: sumOs,
            flagged_accounts: sumFlagged,
            pct_flagged: ((sumFlagged / (sumAcc || 1)) * 100).toFixed(1) + '%',
            very_high: sumVh,
            high_risk: sumH,
            medium_risk: sumM
          };

          this.rows.set([...list, totalRow]);
          this.tableTitle = 'Loan Product Risk Concentrations';
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load Loan Type Risk Report.');
          this.loading.set(false);
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // REPORT 07 — CRO DASHBOARD REPORT
    // ────────────────────────────────────────────────────────────────────────
    else if (slug === 'cro-dashboard-report') {
      this.ewsApi.getCroDashboardReport(queryParams).subscribe({
        next: (res: any) => {
          const s = res?.snapshot || {};
          this.summaryCards.set([
            { label: 'Total Accounts', value: (Number(s.total_accounts) || 0).toLocaleString('en-IN'), colorClass: 'text-slate-800' },
            { label: 'Principal Outstanding', value: this.formatCurrency(s.total_principal), colorClass: 'text-slate-900' },
            { label: 'Flagged Accounts', value: (Number(s.flagged_accounts) || 0).toLocaleString('en-IN'), colorClass: 'text-amber-600' },
            { label: 'Confirmed NPAs', value: (Number(s.confirmed_npa) || 0).toLocaleString('en-IN'), colorClass: 'text-red-700' },
            { label: 'Very High Risk', value: (Number(s.very_high) || 0).toLocaleString('en-IN'), colorClass: 'text-red-600' },
            { label: 'High Risk', value: (Number(s.high_risk) || 0).toLocaleString('en-IN'), colorClass: 'text-orange-600' },
            { label: 'Medium Risk', value: (Number(s.medium_risk) || 0).toLocaleString('en-IN'), colorClass: 'text-yellow-600' }
          ]);
          this.rows.set(res?.top_accounts || []);
          this.tableTitle = 'Top Very-High-Risk Accounts by Exposure';
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load CRO Executive Dashboard Report.');
          this.loading.set(false);
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // REPORT 09 — RBI / IRAC COMPLIANCE
    // ────────────────────────────────────────────────────────────────────────
    else if (slug === 'rbi-compliance-report') {
      this.ewsApi.getRbiComplianceReport(queryParams).subscribe({
        next: (res: any) => {
          const list = res?.classes || [];
          if (res?.total) {
            this.rows.set([...list, res.total]);
            this.summaryCards.set([
              { label: 'Total Accounts in View', value: (Number(res.total.accounts) || 0).toLocaleString('en-IN'), colorClass: 'text-slate-800' },
              { label: 'Portfolio O/s in View', value: this.formatCurrency(res.total.principal_os), colorClass: 'text-slate-900' },
              { label: 'Illustrative Provision Required', value: this.formatCurrency(res.total.provision_amount), colorClass: 'text-red-700', subtext: 'Based on RBI IRAC Norm Rates' }
            ]);
          } else {
            this.rows.set(list);
          }
          this.tableTitle = 'RBI Asset Classification & Illustrative Provisioning Matrix';
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load RBI / IRAC Compliance Report.');
          this.loading.set(false);
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // REPORT 10 — STOCK / SECURITY INSPECTION DUE
    // ────────────────────────────────────────────────────────────────────────
    else if (slug === 'inspection-due-report') {
      this.ewsApi.getInspectionDueReport(queryParams).subscribe({
        next: (data: any[]) => {
          this.rows.set(data || []);
          const totalOs = (data || []).reduce((acc, r) => acc + (Number(r.principal_os) || 0), 0);
          this.summaryCards.set([
            { label: 'Cash Credit Facilities', value: String(data?.length || 0), colorClass: 'text-indigo-700' },
            { label: 'Total Exposure O/s', value: this.formatCurrency(totalOs), colorClass: 'text-slate-900' },
            { label: 'Inspection Status', value: 'Audit Pending', colorClass: 'text-amber-700' }
          ]);
          this.tableTitle = 'Cash Credit Facilities Inspection Compliance';
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load Inspection Due Report.');
          this.loading.set(false);
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // REPORT 11 — INSURANCE RENEWAL DUE REPORT
    // ────────────────────────────────────────────────────────────────────────
    else if (slug === 'insurance-renewal-report') {
      this.ewsApi.getInsuranceRenewalReport(queryParams).subscribe({
        next: (res: any) => {
          const buckets = res?.summary || [];
          const lapsedBucket = buckets.find((b: any) => b.status === 'LAPSED') || {};
          const due30Bucket = buckets.find((b: any) => b.status === 'DUE ≤ 30 DAYS') || {};
          const currentBucket = buckets.find((b: any) => b.status === 'CURRENT') || {};

          this.summaryCards.set([
            { label: 'Total Insured A/Cs', value: (res?.total_insured_accounts || 0).toLocaleString('en-IN'), colorClass: 'text-slate-800' },
            { label: 'Total Insured Exposure', value: this.formatCurrency(res?.total_insured_os), colorClass: 'text-slate-900' },
            { label: 'LAPSED Policies', value: (lapsedBucket.accounts || 0).toLocaleString('en-IN'), colorClass: 'text-red-700', subtext: `${this.formatCurrency(lapsedBucket.total_principal)} affected (${lapsedBucket.pct_insured})` },
            { label: 'Due ≤ 30 Days', value: (due30Bucket.accounts || 0).toLocaleString('en-IN'), colorClass: 'text-orange-600', subtext: this.formatCurrency(due30Bucket.total_principal) },
            { label: 'CURRENT Policies', value: (currentBucket.accounts || 0).toLocaleString('en-IN'), colorClass: 'text-emerald-700', subtext: currentBucket.pct_insured }
          ]);

          this.secondaryTable.set({
            title: 'Insurance Status Summary Buckets',
            rows: buckets,
            columns: [
              { key: 'status', label: 'Policy Status', type: 'status', width: '150px' },
              { key: 'accounts', label: 'A/Cs Count', type: 'number', align: 'right', width: '100px' },
              { key: 'total_principal', label: 'Total Principal O/s (₹)', type: 'currency', align: 'right' },
              { key: 'pct_insured', label: '% of Insured A/Cs', align: 'right', width: '130px' }
            ]
          });

          this.rows.set(res?.accounts || []);
          this.tableTitle = 'Top Lapsed & Approaching Insurance Accounts by Exposure';
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load Insurance Renewal Due Report.');
          this.loading.set(false);
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // REPORT 12 — CERSAI PENDENCY REPORT
    // ────────────────────────────────────────────────────────────────────────
    else if (slug === 'cersai-pendency-report') {
      this.ewsApi.getCersaiPendencyReport(queryParams).subscribe({
        next: (res: any) => {
          this.summaryCards.set([
            { label: 'Pending CERSAI A/Cs', value: (res?.total_pending_accounts || 0).toLocaleString('en-IN'), colorClass: 'text-red-700' },
            { label: 'Principal O/s Affected', value: this.formatCurrency(res?.total_affected_principal), colorClass: 'text-slate-900' },
            { label: 'Branches Affected', value: String(res?.branch_summary?.length || 0), colorClass: 'text-indigo-700' }
          ]);

          this.secondaryTable.set({
            title: 'Branch-Wise CERSAI Pendency Summary',
            rows: res?.branch_summary || [],
            columns: [
              { key: 'branch_code', label: 'Branch Code', width: '90px', align: 'center' },
              { key: 'branch_name', label: 'Branch Name' },
              { key: 'pending_accounts', label: 'A/Cs Pending CERSAI', type: 'number', align: 'right', width: '150px' },
              { key: 'affected_principal', label: 'Total Principal O/s Affected (₹)', type: 'currency', align: 'right' }
            ]
          });

          this.rows.set(res?.accounts || []);
          this.tableTitle = 'Top CERSAI-Pending Accounts by Exposure';
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load CERSAI Pendency Report.');
          this.loading.set(false);
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // Fallback: Legacy Reports
    // ────────────────────────────────────────────────────────────────────────
    else {
      this.ewsApi.getWatchList().subscribe({
        next: (data: any[]) => {
          let filtered = data || [];
          const branches = (queryParams['branch'] || '').split(',').filter(Boolean);
          if (branches.length > 0) {
            filtered = filtered.filter(r => branches.includes(r.branch));
          }
          const risks = (queryParams['risk_level'] || '').split(',').filter(Boolean);
          if (risks.length > 0) {
            filtered = filtered.filter(r => risks.includes(r.risk_level));
          }
          if (queryParams['search']) {
            const q = queryParams['search'].toLowerCase();
            filtered = filtered.filter(r => (r.account_id || '').toLowerCase().includes(q) || (r.borrower_name || '').toLowerCase().includes(q));
          }
          this.rows.set(filtered);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load watch list report data.');
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
      this.filters.set(JSON.parse(JSON.stringify(def.defaultFilters)));
      this.loadReportData();
    }
  }

  print() {
    window.print();
  }

  exportExcel() {
    const def = this.definition();
    if (!def) return;

    const fileName = `${def.slug}_${new Date().getTime()}`;
    const reportHeaders = [
      'RAJARSHI SHAHU SAHAKARI BANK LTD. PUNE',
      'EARLY WARNING SIGNAL (EWS) SYSTEM — OFFICIAL RISK REPORT',
      def.title.toUpperCase(),
      `REPORT RUN DATE: ${this.fullDateTime.toUpperCase()}`
    ];

    if (this.secondaryTable() && this.secondaryTable()!.rows.length > 0) {
      const sections = [
        {
          title: this.secondaryTable()!.title,
          data: this.secondaryTable()!.rows,
          columns: this.secondaryTable()!.columns.map(c => ({ field: c.key, header: c.label.toUpperCase() }))
        },
        {
          title: this.tableTitle || 'Detailed Accounts',
          data: this.rows(),
          columns: def.columns.map(c => ({ field: c.key, header: c.label.toUpperCase() }))
        }
      ];
      this.exportService.exportMultiSectionToExcel(sections, fileName, reportHeaders);
    } else {
      const cols = def.columns.map(c => ({ field: c.key, header: c.label.toUpperCase() }));
      this.exportService.exportToExcel(this.rows(), cols, fileName, reportHeaders);
    }
  }

  exportPdf() {
    const def = this.definition();
    if (!def) return;

    const cards = this.summaryCards().map(c => ({ label: c.label, value: String(c.value) }));
    const cols = def.columns.map(c => ({
      field: c.key,
      header: c.label,
      align: c.align || 'left',
      width: c.key === 'signals_triggered' ? 80 : undefined
    }));

    let secTables: any[] = [];
    if (this.secondaryTable() && this.secondaryTable()!.rows.length > 0) {
      secTables.push({
        title: this.secondaryTable()!.title,
        data: this.secondaryTable()!.rows,
        columns: this.secondaryTable()!.columns.map(c => ({
          field: c.key,
          header: c.label,
          align: c.align || 'left'
        }))
      });
    }

    this.exportService.exportToPdf({
      data: this.rows(),
      columns: cols,
      fileName: def.slug,
      reportTitle: def.title,
      reportSubtitle: `${def.desc} | Run Date: ${this.fullDateTime}`,
      orientation: def.orientation || (def.columns.length > 6 ? 'landscape' : 'portrait'),
      summaryCards: cards.length > 0 ? cards.slice(0, 6) : undefined,
      secondaryTables: secTables.length > 0 ? secTables : undefined,
      notes: def.notes
    });
  }

  goBack() {
    this.router.navigate(['/ews/reports']);
  }

  formatDate(val: any): string {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(val);
    }
  }

  formatCurrency(val: any): string {
    if (val === null || val === undefined || val === '') return '—';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  statusSeverity(val: string): string {
    const v = (val || '').toUpperCase();
    if (v.includes('VERY HIGH') || v.includes('NPA') || v.includes('LAPSED') || v.includes('OVERDUE') || v.includes('DOUBTFUL') || v.includes('SUB STANDARD')) {
      return 'bg-red-50 text-red-700 border-1 border-red-200';
    }
    if (v.includes('HIGH') || v.includes('SMA 1') || v.includes('SMA 2') || v.includes('DUE ≤ 30') || v.includes('NOT NOTED') || v.includes('NOT ON RECORD')) {
      return 'bg-orange-50 text-orange-700 border-1 border-orange-200';
    }
    if (v.includes('MEDIUM') || v.includes('SMA 0') || v.includes('DUE ≤ 90') || v.includes('PENDING')) {
      return 'bg-amber-50 text-amber-700 border-1 border-amber-200';
    }
    if (v.includes('LOW') || v.includes('STANDARD') || v.includes('CURRENT') || v.includes('ACTIVE') || v.includes('NORMAL')) {
      return 'bg-emerald-50 text-emerald-700 border-1 border-emerald-200';
    }
    return 'bg-surface-100 text-700 border-1 surface-border';
  }
}
