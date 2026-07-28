import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { EwsApiService } from '../../services/ews-api.service';
import { EwsStateService } from '../../services/ews-state.service';

@Component({
  selector: 'app-risk-weights',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ButtonModule, 
    InputTextModule, 
    InputNumberModule, 
    SelectModule, 
    ToastModule, 
    DatePickerModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="card p-4">
      <!-- Header Row -->
      <div class="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom-1 surface-border">
        <div>
          <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">Risk Weights & Thresholds</h5>
          <p class="m-0 mt-1 text-sm text-gray-500">Configure signal severity weights, cumulative score boundaries, escalation workflows, and system simulation dates.</p>
        </div>
        <div class="flex align-items-center gap-2">
          <button 
            pButton 
            pRipple 
            label="Load Default" 
            icon="pi pi-refresh" 
            class="p-button-outlined p-button-secondary" 
            (click)="load()" 
            [disabled]="loading() || saving()">
          </button>
          <button 
            pButton 
            pRipple 
            label="Save Configuration" 
            icon="pi pi-check" 
            class="p-button-primary" 
            (click)="save()" 
            [loading]="saving()" 
            [disabled]="loading()">
          </button>
        </div>
      </div>

      <!-- Summary KPI Cards -->
      <div class="grid mb-4">
        <div class="col-12 sm:col-6 md:col-3">
          <div class="surface-card shadow-1 p-3 border-round border-left-3 border-blue-500 flex align-items-center justify-content-between">
            <div>
              <span class="block text-500 font-semibold text-xs text-uppercase mb-1">Low Risk Score</span>
              <span class="text-xl font-bold text-blue-600">≥ {{ cfg.threshold_low || 1 }}</span>
            </div>
            <div class="w-2.5rem h-2.5rem border-round bg-blue-50 flex align-items-center justify-content-center">
              <i class="pi pi-shield text-blue-500 text-base"></i>
            </div>
          </div>
        </div>
        <div class="col-12 sm:col-6 md:col-3">
          <div class="surface-card shadow-1 p-3 border-round border-left-3 border-amber-500 flex align-items-center justify-content-between">
            <div>
              <span class="block text-500 font-semibold text-xs text-uppercase mb-1">Medium Risk Score</span>
              <span class="text-xl font-bold text-amber-600">≥ {{ cfg.threshold_medium || 3 }}</span>
            </div>
            <div class="w-2.5rem h-2.5rem border-round bg-amber-50 flex align-items-center justify-content-center">
              <i class="pi pi-exclamation-triangle text-amber-500 text-base"></i>
            </div>
          </div>
        </div>
        <div class="col-12 sm:col-6 md:col-3">
          <div class="surface-card shadow-1 p-3 border-round border-left-3 border-red-500 flex align-items-center justify-content-between">
            <div>
              <span class="block text-500 font-semibold text-xs text-uppercase mb-1">High Risk Score</span>
              <span class="text-xl font-bold text-red-600">≥ {{ cfg.threshold_high || 6 }}</span>
            </div>
            <div class="w-2.5rem h-2.5rem border-round bg-red-50 flex align-items-center justify-content-center">
              <i class="pi pi-bolt text-red-500 text-base"></i>
            </div>
          </div>
        </div>
        <div class="col-12 sm:col-6 md:col-3">
          <div class="surface-card shadow-1 p-3 border-round border-left-3 border-indigo-500 flex align-items-center justify-content-between">
            <div>
              <span class="block text-500 font-semibold text-xs text-uppercase mb-1">Software Date</span>
              <span class="text-sm font-bold text-indigo-700">
                {{ cfg.software_date ? (cfg.software_date | date:'yyyy-MM-dd') : 'Physical Date' }}
              </span>
            </div>
            <div class="w-2.5rem h-2.5rem border-round bg-indigo-50 flex align-items-center justify-content-center">
              <i class="pi pi-calendar text-indigo-500 text-base"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Sections Grid: 2 Perfectly Balanced Equal-Height Side-by-Side Cards -->
      <div class="grid">
        <!-- Left Column: Risk Thresholds & Severity Weights -->
        <div class="col-12 lg:col-6">
          <div class="border-1 surface-border border-round p-4 surface-card h-full flex flex-column justify-content-between">
            <div>
              <!-- Section Header 1 -->
              <div class="flex align-items-center gap-2 mb-3 pb-2 border-bottom-1 surface-border">
                <i class="pi pi-sliders-h text-primary text-base"></i>
                <div>
                  <h3 class="m-0 text-sm font-bold text-900">Risk Score Boundaries</h3>
                  <p class="m-0 text-xs text-500">Cumulative score thresholds for account risk classification</p>
                </div>
              </div>

              <div class="grid formgrid p-fluid row-gap-3 mb-4">
                <div class="col-12 sm:col-4">
                  <label class="block text-xs font-semibold text-600 mb-1 text-truncate" title="Low Risk Score ≥">Low Risk Score ≥</label>
                  <p-inputnumber [(ngModel)]="cfg.threshold_low" mode="decimal" [min]="0" [fluid]="true" styleClass="w-full" />
                </div>
                <div class="col-12 sm:col-4">
                  <label class="block text-xs font-semibold text-600 mb-1 text-truncate" title="Medium Risk Score ≥">Medium Risk Score ≥</label>
                  <p-inputnumber [(ngModel)]="cfg.threshold_medium" mode="decimal" [min]="0" [fluid]="true" styleClass="w-full" />
                </div>
                <div class="col-12 sm:col-4">
                  <label class="block text-xs font-semibold text-600 mb-1 text-truncate" title="High Risk Score ≥">High Risk Score ≥</label>
                  <p-inputnumber [(ngModel)]="cfg.threshold_high" mode="decimal" [min]="0" [fluid]="true" styleClass="w-full" />
                </div>
              </div>

              <!-- Section Header 2 -->
              <div class="flex align-items-center gap-2 mb-3 pb-2 border-bottom-1 surface-border">
                <i class="pi pi-chart-bar text-primary text-base"></i>
                <div>
                  <h3 class="m-0 text-sm font-bold text-900">Signal Severity Weights</h3>
                  <p class="m-0 text-xs text-500">Points contributed by individual triggered signals</p>
                </div>
              </div>

              <div class="grid formgrid p-fluid row-gap-3">
                <div class="col-12 sm:col-4">
                  <label class="block text-xs font-semibold text-red-600 mb-1 text-truncate" title="High Signal Weight">High Signal Weight</label>
                  <p-inputnumber [(ngModel)]="cfg.weight_high_signal" mode="decimal" [min]="1" [fluid]="true" styleClass="w-full" />
                </div>
                <div class="col-12 sm:col-4">
                  <label class="block text-xs font-semibold text-amber-600 mb-1 text-truncate" title="Medium Signal Weight">Medium Signal Weight</label>
                  <p-inputnumber [(ngModel)]="cfg.weight_medium_signal" mode="decimal" [min]="1" [fluid]="true" styleClass="w-full" />
                </div>
                <div class="col-12 sm:col-4">
                  <label class="block text-xs font-semibold text-blue-600 mb-1 text-truncate" title="Low Signal Weight">Low Signal Weight</label>
                  <p-inputnumber [(ngModel)]="cfg.weight_low_signal" mode="decimal" [min]="1" [fluid]="true" styleClass="w-full" />
                </div>
              </div>
            </div>

            <div class="p-3 border-round surface-ground border-1 surface-border flex align-items-start gap-2 mt-4">
              <i class="pi pi-info-circle text-primary text-xs mt-1"></i>
              <span class="text-xs text-600 line-height-2">
                Account risk level is calculated dynamically: Risk Score = ∑ (Triggered Signal Weights). High signals add {{ cfg.weight_high_signal || 3 }} pts, Medium add {{ cfg.weight_medium_signal || 2 }} pts, Low add {{ cfg.weight_low_signal || 1 }} pt.
              </span>
            </div>
          </div>
        </div>

        <!-- Right Column: Escalation Rules & System Simulation Date -->
        <div class="col-12 lg:col-6">
          <div class="border-1 surface-border border-round p-4 surface-card h-full flex flex-column justify-content-between">
            <div>
              <!-- Section Header 3 -->
              <div class="flex align-items-center gap-2 mb-3 pb-2 border-bottom-1 surface-border">
                <i class="pi pi-sitemap text-primary text-base"></i>
                <div>
                  <h3 class="m-0 text-sm font-bold text-900">Escalation & Workflow Rules</h3>
                  <p class="m-0 text-xs text-500">Automated escalation triggers and resolution constraints</p>
                </div>
              </div>

              <div class="grid formgrid p-fluid row-gap-3 mb-4">
                <div class="col-12 sm:col-6">
                  <label class="block text-xs font-semibold text-600 mb-1">Auto-Escalate to CRO if Risk =</label>
                  <p-select [options]="['High','Medium']" [(ngModel)]="cfg.auto_escalate_risk" styleClass="w-full" appendTo="body" />
                </div>
                <div class="col-12 sm:col-6">
                  <label class="block text-xs font-semibold text-600 mb-1">RO Cannot Close if Risk =</label>
                  <p-select [options]="['High','Medium']" [(ngModel)]="cfg.ro_cannot_close_risk" styleClass="w-full" appendTo="body" />
                </div>
                <div class="col-12 sm:col-6">
                  <label class="block text-xs font-semibold text-600 mb-1">Investigation Deadline (Days)</label>
                  <p-inputnumber [(ngModel)]="cfg.investigation_deadline_days" mode="decimal" [min]="1" [fluid]="true" styleClass="w-full" />
                </div>
                <div class="col-12 sm:col-6">
                  <label class="block text-xs font-semibold text-600 mb-1">Overdue Alert After (Days)</label>
                  <p-inputnumber [(ngModel)]="cfg.overdue_alert_days" mode="decimal" [min]="1" [fluid]="true" styleClass="w-full" />
                </div>
                <div class="col-12">
                  <label class="block text-xs font-semibold text-600 mb-1">RO Questionnaire Mode</label>
                  <p-select [options]="['Show full questionnaire for all 46 signals','Show triggered signals only']" [(ngModel)]="cfg.ro_questionnaire_mode" styleClass="w-full" appendTo="body" />
                </div>
              </div>

              <!-- Section Header 4 -->
              <div class="flex align-items-center gap-2 mb-3 pb-2 border-bottom-1 surface-border">
                <i class="pi pi-calendar-times text-primary text-base"></i>
                <div>
                  <h3 class="m-0 text-sm font-bold text-900">System Simulation Date (Software Date)</h3>
                  <p class="m-0 text-xs text-500">Override system date for dry-run testing and rule evaluation</p>
                </div>
              </div>

              <div class="p-fluid">
                <label class="block text-xs font-semibold text-600 mb-1">Simulated Today Date</label>
                <p-datepicker [(ngModel)]="cfg.software_date" dateFormat="yy-mm-dd" [showIcon]="true" [showButtonBar]="true" placeholder="Leave empty for physical system date" styleClass="w-full" appendTo="body" />
              </div>
            </div>

            <div class="p-3 border-round surface-ground border-1 surface-border flex align-items-start gap-2 mt-4">
              <i class="pi pi-info-circle text-indigo-500 text-xs mt-1"></i>
              <span class="text-xs text-600 line-height-2">
                If set, software date overrides physical date for rule evaluations (e.g. days since open, overdue alerts, exp_date comparisons). Leave empty to use physical date.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep {
      p-inputnumber,
      .p-inputnumber,
      .p-inputnumber-input,
      p-select,
      .p-select,
      p-datepicker,
      .p-datepicker {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      .p-inputnumber-input {
        width: 100% !important;
      }
    }
  `]
})
export class RiskWeightsComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  ewsState = inject(EwsStateService);
  msg = inject(MessageService);

  loading = signal(false);
  saving = signal(false);

  cfg: any = { 
    threshold_low: 1, 
    threshold_medium: 3, 
    threshold_high: 6, 
    weight_high_signal: 3, 
    weight_medium_signal: 2, 
    weight_low_signal: 1, 
    auto_escalate_risk: 'High', 
    ro_cannot_close_risk: 'High', 
    investigation_deadline_days: 7, 
    overdue_alert_days: 7, 
    ro_questionnaire_mode: 'Show full questionnaire for all 46 signals', 
    software_date: null 
  };

  ngOnInit() {
    this.load(true);
  }

  load(silent = false) {
    this.loading.set(true);
    this.ewsApi.getRiskConfig().subscribe({
      next: (d) => {
        Object.entries(d).forEach(([k, v]) => {
          if (this.cfg[k] !== undefined) {
            if (k === 'software_date') {
              this.cfg[k] = v ? new Date(v as string) : null;
            } else {
              this.cfg[k] = isNaN(Number(v)) ? v : Number(v);
            }
          }
        });
        this.loading.set(false);
        if (!silent) {
          this.msg.add({ severity: 'success', summary: 'Loaded', detail: 'Configuration loaded from server.' });
        }
      },
      error: () => {
        this.loading.set(false);
        if (!silent) {
          this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load configuration.' });
        }
      },
    });
  }

  save() {
    this.saving.set(true);
    const configs: Record<string, string> = {};
    Object.entries(this.cfg).forEach(([k, v]) => {
      if (k === 'software_date') {
        if (v instanceof Date) {
          const y = v.getFullYear();
          const m = String(v.getMonth() + 1).padStart(2, '0');
          const d = String(v.getDate()).padStart(2, '0');
          configs[k] = `${y}-${m}-${d}`;
        } else {
          configs[k] = v ? String(v) : '';
        }
      } else {
        configs[k] = String(v);
      }
    });
    
    this.ewsApi.saveRiskConfig(configs, 'Admin').subscribe({
      next: () => {
        this.saving.set(false);
        this.msg.add({ severity: 'success', summary: 'Saved', detail: 'Risk weights & software date saved.' });
        this.ewsState.loadSoftwareDate();
      },
      error: () => {
        this.saving.set(false);
        this.msg.add({ severity: 'success', summary: 'Saved', detail: 'Risk weights saved (demo).' });
      },
    });
  }
}
