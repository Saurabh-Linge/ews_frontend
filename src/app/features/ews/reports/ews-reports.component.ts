import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { HeroComponent } from '../../../shared/components/ui/hero/hero';

@Component({
  selector: 'app-ews-reports',
  standalone: true,
  imports: [CommonModule, ButtonModule, ToastModule, TableModule, HeroComponent],
  providers: [MessageService],
  template: `
    <div class="mb-4">
      <h2 class="m-0 text-2xl font-bold text-gray-900" style="color: var(--text-color, #0f172a); font-size: 1.5rem; font-weight: 800;">EWS Master Reports</h2>
      <p class="mt-1 text-sm text-gray-500" style="color: var(--text-color-secondary, #64748b); font-size: 0.875rem; margin-top: 0.25rem;">Access system reports, watch list analytics, and RBI compliance trails.</p>
    </div>
    <p-toast></p-toast>
    
    <div class="card p-4">
      <div class="flex align-items-center justify-content-between mb-4">
        <h3 class="m-0 text-xl font-bold" style="color: var(--text-color);">Master Reports Directory</h3>
      </div>
      
      <div class="table-container surface-card border-round-xl shadow-sm border-1 surface-border p-2">
        <p-table 
          [value]="reports" 
          rowGroupMode="subheader" 
          groupRowsBy="category"
          styleClass="p-datatable-sm p-datatable-striped"
        >
          <ng-template pTemplate="groupheader" let-report>
            <tr class="p-rowgroup-header bg-gray-50 border-bottom-1 border-300">
              <td style="text-align: center; font-weight: 700; width: 4.5rem; color: var(--text-color-secondary);">#</td>
              <td colspan="2" style="font-weight: 800; font-size: 0.95rem; color: #3b82f6; letter-spacing: 0.02em; padding: 0.85rem 1rem;">
                # {{ getCategoryLabel(report.category) }} »
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-report let-rowIndex="rowIndex">
            <tr>
              <td style="text-align: center; font-weight: 600; width: 4.5rem; color: var(--text-color-secondary);">{{ rowIndex + 1 }}</td>
              <td style="padding: 0.85rem 1rem;">
                <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-color);">{{ report.title }}</div>
                <div style="font-size: 0.8rem; color: var(--text-color-secondary); margin-top: 0.2rem;">{{ report.desc }} &middot; <span style="font-weight: 600;">Frequency: {{ report.freq }}</span></div>
              </td>
              <td style="text-align: center; width: 6rem;">
                <button 
                  pButton 
                  pRipple 
                  icon="pi pi-external-link" 
                  class="p-button-primary p-button-sm" 
                  (click)="generate(report.title)" 
                  pTooltip="Launch Report" 
                  style="width: 34px; height: 34px; border-radius: 8px;"
                ></button>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>
  `
})
export class EwsReportsComponent {
  msg = inject(MessageService);

  reports = [
    // Category 1: Master Reports
    { category: 'master', title: 'Current EWS Watch List Report', desc: 'All active portfolio accounts on watch list with signal count, risk severity, and days on list.', freq: 'Daily' },
    { category: 'master', title: 'Individual Borrower EWS Report', desc: 'Full signal history, Risk Officer assessment, and audit trail for a specific borrower.', freq: 'On demand' },
    { category: 'master', title: 'High Risk Priority Action Report', desc: 'Critical High risk accounts requiring immediate Chief Risk Officer review.', freq: 'Weekly' },
    { category: 'master', title: 'Signal-wise Distribution Report', desc: 'Breakdown of firing EWS signals across CBS and manual questionnaires.', freq: 'Monthly' },

    // Category 2: Portfolio Reports
    { category: 'portfolio', title: 'Branch Risk Summary Report', desc: 'Per-branch flagged accounts, pending responses, and resolution efficiency rates.', freq: 'Monthly' },
    { category: 'portfolio', title: 'Bank-wide EWS Health Report', desc: 'Overall EWS activity across all branches for Board and executive management.', freq: 'Monthly' },
    { category: 'portfolio', title: 'Period Trend & Comparison Report', desc: 'Month-over-month early warning trends and risk migration analytics.', freq: 'Quarterly' },

    // Category 3: Monitoring Reports
    { category: 'monitoring', title: 'Investigation Status & Response Log', desc: 'All open investigations with branch response status and pending timelines.', freq: 'Weekly' },
    { category: 'monitoring', title: 'Overdue Branch Response Report', desc: 'Flagged accounts where branch managers have exceeded investigation deadlines.', freq: 'Daily' },
    { category: 'monitoring', title: 'System Inspection & Audit Trail', desc: 'Complete timestamped audit log of all system changes for RBI inspection.', freq: 'On demand' },
  ];

  getCategoryLabel(cat: string): string {
    if (cat === 'master') return 'Master Reports';
    if (cat === 'portfolio') return 'Branch & Portfolio Reports';
    return 'Monitoring & Audit Reports';
  }

  generate(title: string) {
    this.msg.add({ severity: 'info', summary: 'Generating Report', detail: `Preparing ${title}...` });
  }
}
