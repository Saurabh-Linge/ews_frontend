import { Component, OnInit, inject, signal, computed, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PopoverModule } from 'primeng/popover';
import { EwsApiService } from '../../services/ews-api.service';
import { CodeJar } from 'codejar';
import * as Prism from 'prismjs';
import { HeroComponent } from '../../../../shared/components/ui/hero/hero';
import { TableComponent, TableColumn } from '../../../../shared/components/table/table.component';

Prism.languages['cbs'] = {
  'string': { pattern: /(["'])(?:(?=(\\?))\2.)*?\1/, greedy: true },
  'keyword': /\b(?:IF|THEN|ELSE|SET)\b/i,
  'function': /\b(?:ABS|COALESCE)\b(?=\s*\()/i,
  'boolean': /\b(?:TRUE|FALSE)\b/i,
  'operator': /\b(?:AND|OR|NOT|BETWEEN|LIKE|IN|IS|NULL)\b/i,
  'number': /\b\d+(?:\.\d+)?\b/,
  'property': /\b(?:TODAY|NOW|is_npa|is_expired|days_overdue|days_until_exp|days_since_open|days_since_sanc|days_since_disb|days_since_npa)\b/,
  'punctuation': /[=><!+\-*/()]/
};

// All available LOAN DUMP columns for rule writing
const FIELD_REFERENCE = [
  { category: 'Account', fields: ['account_id', 'account_no', 'long_name', 'branch_code', 'member_type', 'account_open_date', 'days_since_open'] },
  { category: 'Loan Type', fields: ['scheme_code', 'scheme_desc', 'product_code', 'product_desc', 'lninstfreq', 'no_of_instl', 'instal_amt'] },
  { category: 'Financial', fields: ['principal_outstanding', 'interest_outstanding', 'interest_receivable_oir', 'charges_os', 'balance', 'tot_sanc_limit', 'disbursement_amount', 'security_amount', 'instal_amt', 'award_amt'] },
  { category: 'Interest & Rates', fields: ['int_rate', 'standard_int_rate', 'cibil_score', 'trunover_details', 'plantand_machinery'] },
  { category: 'NPA & Status', fields: ['npa', 'is_npa', 'npa_date', 'days_since_npa', 'bank_cust_rating', 'credit_rating', 'award_status'] },
  { category: 'Dates & Expiry', fields: ['exp_date', 'sanc_date', 'disbursement_date', 'instal_start_date', 'policy_due_date', 'is_expired', 'days_until_exp', 'days_overdue'] },
  { category: 'Priority Sector', fields: ['priority_sector_yn', 'non_priority_sector', 'weaker_sector_yn', 'govt_prog_yn', 'loan_against_deposit'] },
  { category: 'Industry', fields: ['industry_type', 'industry_sub_type', 'purpose_code', 'sub_purpose_code', 'enduse'] },
  { category: 'System Variables', fields: ['TODAY', 'NOW', 'days_since_open', 'days_since_sanc', 'days_since_disb', 'days_overdue', 'days_until_exp', 'is_expired', 'is_npa'] },
];

// Rich expression reference for the hoverable reference panel
const EXPR_REFERENCE = [
  {
    category: 'Comparison',
    color: '#1B4FD8',
    items: [
      { token: '=',  insert: ' = ',  desc: 'Equal to. Works for text, numbers and dates.', example: 'npa = "Y"' },
      { token: '!=', insert: ' != ', desc: 'Not equal to.', example: 'bank_cust_rating != "STANDARD"' },
      { token: '>',  insert: ' > ',  desc: 'Greater than (numbers / dates).', example: 'days_overdue > 30' },
      { token: '<',  insert: ' < ',  desc: 'Less than (numbers / dates).', example: 'cibil_score < 550' },
      { token: '>=', insert: ' >= ', desc: 'Greater than or equal to.', example: 'principal_outstanding >= 100000' },
      { token: '<=', insert: ' <= ', desc: 'Less than or equal to.', example: 'int_rate <= 12' },
    ]
  },
  {
    category: 'Logic',
    color: '#7C3AED',
    items: [
      { token: 'AND',     insert: ' AND ',     desc: 'Both conditions must be true.', example: 'is_npa = TRUE AND days_since_npa > 90' },
      { token: 'OR',      insert: ' OR ',      desc: 'Either condition can be true.', example: 'npa = "Y" OR days_overdue > 60' },
      { token: 'NOT',     insert: ' NOT ',     desc: 'Inverts the following condition.', example: 'NOT (npa = "Y")' },
      { token: '(',       insert: '(',         desc: 'Open group — use to control evaluation order.', example: '(a > 1) AND (b < 5)' },
      { token: ')',       insert: ')',         desc: 'Close group.', example: '(a > 1) AND (b < 5)' },
    ]
  },
  {
    category: 'Range & Lists',
    color: '#0369A1',
    items: [
      { token: 'BETWEEN',     insert: ' BETWEEN ',     desc: 'Value is within a range (inclusive). Works for numbers and dates.', example: 'cibil_score BETWEEN 300 AND 550' },
      { token: 'NOT BETWEEN', insert: ' NOT BETWEEN ', desc: 'Value is outside the range.', example: 'balance NOT BETWEEN 1000 AND 50000' },
      { token: 'IN',          insert: ' IN ',          desc: 'Value matches any item in the list.', example: 'product_code IN (1221, 1222, 1223)' },
      { token: 'NOT IN',      insert: ' NOT IN ',      desc: 'Value does not match any item in the list.', example: 'scheme_code NOT IN ("HL", "LAP")' },
      { token: 'LIKE',        insert: ' LIKE ',        desc: 'Pattern match. % matches any text, _ matches one character. Case-insensitive.', example: 'bank_cust_rating LIKE "SMA%"' },
    ]
  },
  {
    category: 'Control Flow',
    color: '#059669',
    items: [
      { token: 'IF',        insert: 'IF ',         desc: 'Start a conditional block.', example: 'IF balance < 0 THEN SET risk = "High"' },
      { token: 'THEN',      insert: ' THEN ',      desc: 'Follows an IF condition.', example: 'IF is_npa = TRUE THEN SET risk = "Very High"' },
      { token: 'ELSE IF',   insert: 'ELSE IF ',    desc: 'Add an alternative condition.', example: 'ELSE IF days_overdue > 30 THEN SET risk = "Medium"' },
      { token: 'ELSE',      insert: 'ELSE ',       desc: 'Fallback condition.', example: 'ELSE SET risk = "Low"' },
      { token: 'SET risk',  insert: 'SET risk = ', desc: 'Assign the risk level dynamically.', example: 'SET risk = "High"' },
    ]
  },
  {
    category: 'Null Checks',
    color: '#B45309',
    items: [
      { token: 'IS NULL',     insert: ' IS NULL',     desc: 'Field has no value / is empty.', example: 'cibil_score IS NULL' },
      { token: 'IS NOT NULL', insert: ' IS NOT NULL', desc: 'Field has a value (not empty).', example: 'npa_date IS NOT NULL' },
      { token: '= null',      insert: ' = null',      desc: 'Shorthand for IS NULL.', example: 'cibil_score = null' },
      { token: '!= null',     insert: ' != null',     desc: 'Shorthand for IS NOT NULL.', example: 'cibil_score != null AND cibil_score < 550' },
    ]
  },
  {
    category: 'Arithmetic',
    color: '#15803D',
    items: [
      { token: '+', insert: ' + ', desc: 'Addition.', example: 'principal_outstanding + interest_outstanding > 500000' },
      { token: '-', insert: ' - ', desc: 'Subtraction.', example: 'int_rate - standard_int_rate > 2' },
      { token: '*', insert: ' * ', desc: 'Multiplication.', example: 'instal_amt * no_of_instl > 1000000' },
      { token: '/', insert: ' / ', desc: 'Division.', example: 'principal_outstanding / tot_sanc_limit > 0.9' },
    ]
  },
  {
    category: 'Functions',
    color: '#DC2626',
    items: [
      { token: 'ABS()', insert: 'ABS(', desc: 'Absolute value — strips the negative sign from a number.', example: 'ABS(int_rate - standard_int_rate) > 3' },
    ]
  },
  {
    category: 'System Variables',
    color: '#0F766E',
    items: [
      { token: 'TODAY',           insert: 'TODAY',           desc: 'Today\'s date. Compare date fields against it.', example: 'exp_date < TODAY' },
      { token: 'NOW',             insert: 'NOW',             desc: 'Current date and time (timestamp).', example: 'exp_date < NOW' },
      { token: 'is_npa',         insert: 'is_npa',         desc: 'TRUE if npa = "Y". Derived boolean — no need to check npa column directly.', example: 'is_npa = TRUE' },
      { token: 'is_expired',     insert: 'is_expired',     desc: 'TRUE if exp_date is in the past.', example: 'is_expired = TRUE AND days_overdue > 30' },
      { token: 'days_overdue',   insert: 'days_overdue',   desc: 'Days since the expiry date (0 if not overdue).', example: 'days_overdue > 90' },
      { token: 'days_until_exp', insert: 'days_until_exp', desc: 'Days remaining until expiry (negative if overdue).', example: 'days_until_exp < 30' },
      { token: 'days_since_open',insert: 'days_since_open',desc: 'Days since account_open_date.', example: 'days_since_open > 365' },
      { token: 'days_since_sanc',insert: 'days_since_sanc',desc: 'Days since sanction date.', example: 'days_since_sanc > 180' },
      { token: 'days_since_disb',insert: 'days_since_disb',desc: 'Days since disbursement date.', example: 'days_since_disb > 90' },
      { token: 'days_since_npa', insert: 'days_since_npa', desc: 'Days since NPA date.', example: 'is_npa = TRUE AND days_since_npa > 90' },
    ]
  },
  {
    category: 'Literals',
    color: '#6B7280',
    items: [
      { token: 'TRUE',  insert: 'TRUE',  desc: 'Boolean true literal.', example: 'is_npa = TRUE' },
      { token: 'FALSE', insert: 'FALSE', desc: 'Boolean false literal.', example: 'is_expired = FALSE' },
      { token: 'null',  insert: 'null',  desc: 'Null / no value literal.', example: 'cibil_score = null' },
      { token: '"text"',insert: '""',   desc: 'String literal — wrap text values in double quotes.', example: 'npa = "Y"' },
      { token: 'DATE',  insert: '""',   desc: 'Date literal in DD-MM-YYYY or YYYY-MM-DD format.', example: 'sanc_date < "01-01-2020"' },
    ]
  },
];


@Component({
  selector: 'app-admin-cbs-rules',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MultiSelectModule, 
    TableModule, 
    DialogModule, 
    DrawerModule,
    CheckboxModule, 
    InputTextModule,
    FloatLabelModule,
    SelectModule,
    ButtonModule,
    TooltipModule,
    ToastModule, 
    ConfirmDialogModule, 
    PopoverModule, 
    HeroComponent,
    TableComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast position="top-right" />
    <p-confirmDialog />

    <div class="card p-4">
      <div class="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">Rule Configuration & Thresholds</h5>
          <p class="m-0 mt-1 text-sm text-gray-500">Configure CBS automated risk formulas, signal weights, and manual risk triggers.</p>
        </div>
        <div class="flex align-items-center gap-2">
          <button 
            pButton 
            pRipple 
            label="Apply Rules Now" 
            [icon]="applying() ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" 
            class="p-button-success p-button-outlined" 
            (click)="applyRules()" 
            [disabled]="applying()">
          </button>
          <button 
            pButton 
            pRipple 
            label="Test Rules" 
            icon="pi pi-play" 
            class="p-button-help p-button-outlined" 
            (click)="openSimulator()">
          </button>
          <button 
            pButton 
            pRipple 
            label="New Rule" 
            icon="pi pi-plus" 
            class="p-button-primary" 
            (click)="openCreate()">
          </button>
        </div>
      </div>

      <!-- Hover Info Overlay -->
      <p-popover #infoOp appendTo="body" styleClass="ref-overlay" [style]="{width: '280px'}">
        <ng-template pTemplate="content">
          @if (hoveredRef()) {
            <div class="ref-tooltip-token" [style.color]="hoveredRef()!.color" [style.border-color]="hoveredRef()!.color + '33'">
              {{ hoveredRef()!.token }}
            </div>
            <div class="ref-tooltip-desc">{{ hoveredRef()!.desc }}</div>
            <div class="ref-tooltip-eg-label">Example:</div>
            <div class="ref-tooltip-eg" title="Click to use this example" (click)="setExpr(hoveredRef()!.example); infoOp.hide()">
              {{ hoveredRef()!.example }}
            </div>
          }
        </ng-template>
      </p-popover>

      @if (loading()) {
        <div class="loader-overlay">
          <div class="spinner"></div>
          <div style="font-weight:600; color:#1B4FD8;">Processing... Please wait.</div>
        </div>
      }

      <!-- Summary KPI Strip -->
      @if (!loading() && rules().length > 0) {
        <div class="grid mb-4">
          <div class="col-12 sm:col-6 md:col-2-4">
            <div class="surface-card shadow-1 p-3 border-round border-left-3 border-blue-500 flex align-items-center justify-content-between">
              <div>
                <span class="block text-500 font-semibold text-xs text-uppercase mb-1">Total Rules</span>
                <span class="text-2xl font-bold text-900">{{ rules().length }}</span>
              </div>
              <div class="w-2rem h-2rem border-round bg-blue-50 flex align-items-center justify-content-center">
                <i class="pi pi-sliders-h text-blue-500 text-lg"></i>
              </div>
            </div>
          </div>
          <div class="col-12 sm:col-6 md:col-2-4">
            <div class="surface-card shadow-1 p-3 border-round border-left-3 border-green-500 flex align-items-center justify-content-between">
              <div>
                <span class="block text-500 font-semibold text-xs text-uppercase mb-1">Active Rules</span>
                <span class="text-2xl font-bold text-green-600">{{ activeCount() }}</span>
              </div>
              <div class="w-2rem h-2rem border-round bg-green-50 flex align-items-center justify-content-center">
                <i class="pi pi-check-circle text-green-500 text-lg"></i>
              </div>
            </div>
          </div>
          <div class="col-12 sm:col-6 md:col-2-4">
            <div class="surface-card shadow-1 p-3 border-round border-left-3 border-cyan-500 flex align-items-center justify-content-between">
              <div>
                <span class="block text-500 font-semibold text-xs text-uppercase mb-1">CBS Rules</span>
                <span class="text-2xl font-bold text-cyan-700">{{ getCountByTag('cbs') }}</span>
              </div>
              <div class="w-2rem h-2rem border-round bg-cyan-50 flex align-items-center justify-content-center">
                <i class="pi pi-cog text-cyan-500 text-lg"></i>
              </div>
            </div>
          </div>
          <div class="col-12 sm:col-6 md:col-2-4">
            <div class="surface-card shadow-1 p-3 border-round border-left-3 border-orange-500 flex align-items-center justify-content-between">
              <div>
                <span class="block text-500 font-semibold text-xs text-uppercase mb-1">Manual Rules</span>
                <span class="text-2xl font-bold text-orange-600">{{ getCountByTag('manual') }}</span>
              </div>
              <div class="w-2rem h-2rem border-round bg-orange-50 flex align-items-center justify-content-center">
                <i class="pi pi-user-edit text-orange-500 text-lg"></i>
              </div>
            </div>
          </div>
          <div class="col-12 sm:col-6 md:col-2-4">
            <div class="surface-card shadow-1 p-3 border-round border-left-3 border-purple-500 flex align-items-center justify-content-between">
              <div>
                <span class="block text-500 font-semibold text-xs text-uppercase mb-1">Audit Rules</span>
                <span class="text-2xl font-bold text-purple-600">{{ getCountByTag('audit') }}</span>
              </div>
              <div class="w-2rem h-2rem border-round bg-purple-50 flex align-items-center justify-content-center">
                <i class="pi pi-file-check text-purple-500 text-lg"></i>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Rules Filter Bar -->
      @if (!loading() && rules().length > 0) {
        <div class="flex align-items-center gap-3 p-3 surface-ground border-round mb-4 border-1 surface-border">
          <i class="pi pi-filter text-500"></i>
          <span class="font-semibold text-sm text-700">Filter by Tag:</span>
          <p-select 
            [ngModel]="selectedTagFilter()" 
            (ngModelChange)="selectedTagFilter.set($event)" 
            [options]="tagFilterOptions" 
            optionLabel="label" 
            optionValue="value" 
            placeholder="Filter by Tag..." 
            appendTo="body" 
            styleClass="w-full md:w-16rem">
          </p-select>
        </div>
      }

      <!-- Main Layout Grid -->
      <div class="grid">
        <!-- Left Column: Rules List -->
        <div class="col-12 lg:col-8">
          @if (filteredRules().length === 0 && !loading()) {
            <div class="text-center p-5 surface-ground border-round border-1 surface-border text-500">
              <i class="pi pi-cog text-4xl mb-2"></i>
              <p class="m-0 font-medium">No rules found matching the criteria.</p>
            </div>
          }

          @for (rule of filteredRules(); track rule.id) {
            <div class="rule-card mb-3" [class.rule-active]="rule.enabled" [class.rule-disabled]="!rule.enabled">
              <div class="rule-top flex align-items-start justify-content-between gap-3 mb-2">
                <div class="flex-1">
                  <div class="flex align-items-center gap-2 flex-wrap mb-2">
                    <span class="rule-name font-bold text-900 text-base">{{ rule.name }}</span>
                    <span class="status-badge" [ngStyle]="{
                      'background': (rule.tag === 'manual' ? '#FEF3C7' : (rule.tag === 'audit' ? '#F3E8FF' : '#E0F2FE')),
                      'color': (rule.tag === 'manual' ? '#92400E' : (rule.tag === 'audit' ? '#6B21A8' : '#0369A1'))
                    }">{{ rule.tag === 'manual' ? 'Manual Question' : (rule.tag === 'audit' ? 'Audit Question' : 'CBS Rule') }}</span>
                    @if (rule.expression.startsWith('IF ')) {
                      <span class="status-badge" style="background:#E0E7FF; color:#3730A3;">Dynamic Risk</span>
                    } @else if (rule.risk_level) {
                      <span class="risk-badge" [class]="'risk-' + rule.risk_level.toLowerCase().replace(' ','-')">{{ rule.risk_level }}</span>
                    }
                    <span class="status-badge" [class.active]="rule.enabled">{{ rule.enabled ? 'Active' : 'Disabled' }}</span>
                  </div>
                  <div class="flex flex-wrap gap-1 mb-2">
                    @for (sid of rule.signal_ids; track sid) {
                      @if (getSignal(sid); as s) {
                        <span class="rule-sig">#{{ s.number }} {{ s.name }}</span>
                      }
                    }
                  </div>
                </div>
                <div class="flex align-items-center gap-1">
                  <button pButton pRipple type="button" icon="pi pi-play" class="p-button-text p-button-sm p-button-rounded" pTooltip="Test rule" (click)="testSingleRule(rule)"></button>
                  <button pButton pRipple type="button" icon="pi pi-copy" class="p-button-text p-button-sm p-button-rounded p-button-secondary" pTooltip="Copy expression" (click)="copyExpr(rule)"></button>
                  <button pButton pRipple type="button" icon="pi pi-pencil" class="p-button-text p-button-sm p-button-rounded p-button-secondary" pTooltip="Edit rule" (click)="openEdit(rule)"></button>
                  <button pButton pRipple type="button" [icon]="rule.enabled ? 'pi pi-pause' : 'pi pi-play'" class="p-button-text p-button-sm p-button-rounded p-button-warning" pTooltip="{{ rule.enabled ? 'Disable' : 'Enable' }}" (click)="toggle(rule)"></button>
                  <button pButton pRipple type="button" icon="pi pi-trash" class="p-button-text p-button-sm p-button-rounded p-button-danger" pTooltip="Delete rule" (click)="remove(rule)"></button>
                </div>
              </div>
              <div class="rule-expr p-2 border-round font-mono text-xs mb-2" [innerHTML]="highlightRule(rule.expression)"></div>
              @if (rule.description) {
                <div class="text-secondary text-xs mb-2">{{ rule.description }}</div>
              }
              @if (rule.updated_at || rule.created_at) {
                <div class="text-400 text-xs flex align-items-center gap-1">
                  <i class="pi pi-clock" style="font-size: 10px;"></i>
                  {{ rule.updated_at ? 'Updated' : 'Created' }} {{ (rule.updated_at || rule.created_at) | date:'d MMM y, h:mm a' }}
                </div>
              }
            </div>
          }
        </div>

        <!-- Right Column: Reference Panel -->
        <div class="col-12 lg:col-4">
          <div class="surface-card border-1 surface-border border-round p-3 sticky" style="top: 80px;">
            <div class="ref-tabs flex border-bottom-1 surface-border mb-3">
              <button class="ref-tab flex-1 py-2 font-bold text-xs" [class.active]="refPanelTab() === 'guide'" (click)="refPanelTab.set('guide')">
                <i class="pi pi-book mr-1"></i> Expression Guide
              </button>
              <button class="ref-tab flex-1 py-2 font-bold text-xs" [class.active]="refPanelTab() === 'fields'" (click)="refPanelTab.set('fields')">
                <i class="pi pi-list mr-1"></i> Fields
              </button>
            </div>

            @if (refPanelTab() === 'guide') {
              <div class="ref-panel overflow-y-auto" style="max-height: calc(100vh - 220px);">
                @for (group of exprRef; track group.category) {
                  <div class="ref-group mb-3">
                    <div class="ref-cat font-bold text-xs uppercase mb-2" [style.color]="group.color">{{ group.category }}</div>
                    <div class="flex flex-wrap gap-1">
                      @for (item of group.items; track item.token) {
                        <span 
                          class="ref-kw cursor-pointer border-round px-2 py-1 text-xs font-mono font-bold transition-colors"
                          [style.background]="group.color + '12'"
                          [style.border]="'1px solid ' + group.color + '33'"
                          [style.color]="group.color"
                          (mouseenter)="hoveredRef.set({ token: item.token, desc: item.desc, example: item.example, color: group.color }); infoOp.show($event)"
                          (mouseleave)="infoOp.hide()"
                          (click)="insertText(item.insert)"
                          title="Click to insert">
                          {{ item.token }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            @if (refPanelTab() === 'fields') {
              <div class="ref-panel overflow-y-auto" style="max-height: calc(100vh - 220px);">
                <div class="text-xs text-500 mb-2">Click a field name to insert it into the expression.</div>
                @for (group of fieldRef; track group.category) {
                  <div class="ref-group mb-3">
                    <div class="ref-cat font-bold text-xs text-500 uppercase mb-2">{{ group.category }}</div>
                    <div class="flex flex-wrap gap-1">
                      @for (f of group.fields; track f) {
                        <span class="ref-field cursor-pointer border-round px-2 py-1 text-xs font-mono surface-ground border-1 surface-border text-700 hover:surface-hover" (click)="insertField(f)" title="Click to insert">{{ f }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Slide-over Drawer for Create / Edit Rule -->
    <p-drawer
      [visible]="showForm"
      (visibleChange)="showForm = $event"
      (onHide)="cancelForm()"
      position="right"
      [style]="{ width: '760px', maxWidth: '96vw' }"
      [modal]="true"
      [dismissible]="true"
      [showCloseIcon]="false"
      styleClass="circular-drawer drawer-layout"
      appendTo="body"
    >
      <ng-template pTemplate="header">
        <div class="drawer-header-row">
          <div class="drawer-title-wrap">
            <span class="drawer-title-icon">
              <i class="pi pi-sliders-h"></i>
            </span>
            <div>
              <div class="text-900 font-semibold text-xl">{{ editing ? 'Edit Rule' : 'Create New Rule' }}</div>
              <div class="text-600 text-sm mt-1">Configure CBS automated formula or risk trigger condition</div>
            </div>
          </div>
          <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded" (click)="cancelForm()"></button>
        </div>
      </ng-template>

      <ng-template pTemplate="content">
        <div class="drawer-content-shell" *ngIf="showForm">
          <!-- Section 1: Rule Details -->
          <section class="drawer-section mb-3">
            <div class="section-heading mb-3 flex align-items-center gap-2">
              <span class="section-kicker font-bold text-xs text-uppercase">Rule Configuration</span>
              <span class="section-line flex-1 border-bottom-1 surface-border"></span>
            </div>
            <div class="grid formgrid p-fluid drawer-form-grid">
              <div class="field col-12 md:col-6 mb-3">
                <p-floatlabel variant="on">
                  <input pInputText id="rname" type="text" [(ngModel)]="form.name" class="w-full" />
                  <label for="rname">Rule Name <span class="text-red-500">*</span></label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6 mb-3">
                <p-floatlabel variant="on">
                  <p-select
                    id="rtag"
                    [(ngModel)]="form.tag"
                    [options]="ruleTagOptions"
                    optionLabel="label"
                    optionValue="value"
                    appendTo="body"
                    styleClass="w-full">
                  </p-select>
                  <label for="rtag">Rule Tag / Category <span class="text-red-500">*</span></label>
                </p-floatlabel>
              </div>
              <div class="field col-12 mb-3">
                <label class="font-bold text-xs text-700 block mb-1">Linked Signals <span class="text-red-500">*</span></label>
                <p-multiSelect
                  [options]="signals()"
                  [(ngModel)]="form.signal_ids"
                  optionLabel="displayName"
                  optionValue="id"
                  placeholder="Select signals..."
                  [style]="{'width':'100%'}"
                  display="chip">
                </p-multiSelect>
              </div>
              <div class="field col-12 mb-3">
                <p-floatlabel variant="on">
                  <input pInputText id="rdesc" type="text" [(ngModel)]="form.description" class="w-full" />
                  <label for="rdesc">Description</label>
                </p-floatlabel>
              </div>
            </div>
          </section>

          <!-- Section 2: Rule Expression Editor -->
          <section class="drawer-section mb-3">
            <div class="section-heading mb-3 flex align-items-center gap-2">
              <span class="section-kicker font-bold text-xs text-uppercase">Expression Editor</span>
              <span class="section-line flex-1 border-bottom-1 surface-border"></span>
            </div>
            <div class="expr-editor border-1 surface-border border-round background-card">
              <div #editor class="w-full expr-ta" style="min-height:120px;"></div>
              
              <!-- Autocomplete Popup -->
              @if (showAutocomplete) {
                <div class="autocomplete-popup" [style.left.px]="autocompleteX" [style.top.px]="autocompleteY">
                  @for (opt of autocompleteOptions; track opt.label; let i = $index) {
                    <div class="ac-item" [class.ac-active]="i === autocompleteIndex" (mousedown)="$event.preventDefault(); applyAutocomplete(i)">
                      <span class="ac-label">{{ opt.label }}</span>
                      <span class="ac-type" [style.color]="opt.color" [style.background]="opt.bg">{{ opt.type }}</span>
                    </div>
                  }
                </div>
              }

              <div class="expr-bar flex align-items-center justify-content-between p-2 surface-ground border-top-1 surface-border">
                <div class="expr-ops flex flex-wrap gap-1">
                  @for (op of quickOps; track op) {
                    <button class="op-pill" (click)="insertOp(op)">{{ op }}</button>
                  }
                </div>
                <button pButton pRipple label="Validate" icon="pi pi-check-circle" class="p-button-sm p-button-outlined" (click)="validateExpr()" [disabled]="validating"></button>
              </div>
            </div>
            @if (validationResult() !== null) {
              <div [style.color]="validationResult()!.valid ? 'var(--green-600)' : '#DC2626'" class="text-xs font-bold mt-2 flex align-items-center gap-1">
                <i [class]="validationResult()!.valid ? 'pi pi-check-circle' : 'pi pi-times-circle'"></i>
                {{ validationResult()!.valid ? 'Expression is valid ✓' : 'Invalid: ' + validationResult()!.error }}
              </div>
            }
          </section>

          <!-- Section 3: Status & Enablement -->
          <section class="drawer-section">
            <div class="flex align-items-center justify-content-between">
              <div>
                <div class="font-bold text-sm text-900">Rule Active Status</div>
                <div class="text-xs text-500">Enable this rule to automatically evaluate matching accounts</div>
              </div>
              <label class="toggle-sw">
                <input type="checkbox" [(ngModel)]="form.enabled">
                <span class="toggle-track"></span>
              </label>
            </div>
          </section>
        </div>
      </ng-template>

      <ng-template pTemplate="footer">
        <div class="drawer-footer-row flex align-items-center justify-content-between w-full">
          <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-outlined p-button-secondary" (click)="cancelForm()"></button>
          <div class="flex align-items-center gap-2">
            <button pButton pRipple label="{{ editing ? 'Update (No Apply)' : 'Save (No Apply)' }}" icon="pi pi-save" class="p-button-outlined p-button-secondary" (click)="save(false)" title="Save without re-running rules"></button>
            <button pButton pRipple label="{{ editing ? 'Update & Apply' : 'Save & Apply' }}" icon="pi pi-refresh" class="p-button-primary" (click)="save(true)" title="Save and immediately re-run all enabled rules"></button>
          </div>
        </div>
      </ng-template>
    </p-drawer>

    <!-- Rule Simulator Slide-Over Drawer -->
    <p-drawer
      [visible]="showSimulator"
      (visibleChange)="showSimulator = $event"
      position="right"
      [style]="{ width: '1100px', maxWidth: '96vw' }"
      [modal]="true"
      [dismissible]="true"
      [showCloseIcon]="false"
      styleClass="circular-drawer drawer-layout"
      appendTo="body"
    >
      <ng-template pTemplate="header">
        <div class="drawer-header-row">
          <div class="drawer-title-wrap">
            <span class="drawer-title-icon" style="background: var(--indigo-50, #EEF2FF); color: var(--indigo-600, #4F46E5);">
              <i class="pi pi-play"></i>
            </span>
            <div>
              <div class="text-900 font-semibold text-xl">Rule Simulator</div>
              <div class="text-600 text-sm mt-1">Test CBS automated risk formulas against database accounts before applying</div>
            </div>
          </div>
          <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded" (click)="showSimulator = false"></button>
        </div>
      </ng-template>

      <ng-template pTemplate="content">
        <div class="drawer-content-shell">
          <div class="sim-layout flex gap-4" style="min-height: calc(100vh - 180px);">
            <!-- Sidebar: Configuration -->
            <div class="sim-sidebar surface-card border-1 surface-border border-round p-3" style="width: 320px; flex-shrink: 0; overflow-y: auto;">
              <h4 class="m-0 mb-3 text-sm font-bold text-900">Select Rules to Test</h4>
              
              <!-- Select All/None -->
              <div class="flex gap-2 mb-3">
                <button pButton pRipple type="button" label="Select All" class="p-button-outlined p-button-sm flex-1" (click)="selectAllRules()"></button>
                <button pButton pRipple type="button" label="None" class="p-button-outlined p-button-secondary p-button-sm flex-1" (click)="selectNoRules()"></button>
              </div>

              <div class="flex flex-column gap-2 mb-3">
                <div class="flex align-items-start gap-2">
                  <p-checkbox [(ngModel)]="includeDraftRule" [binary]="true" inputId="chkDraft"></p-checkbox>
                  <label for="chkDraft" class="text-xs font-semibold text-indigo-600 cursor-pointer line-height-2">
                    Include Current Draft Rule<br>
                    <span class="font-normal text-400">{{ form.name || 'Unnamed Draft' }}</span>
                  </label>
                </div>
                <hr class="border-none border-top-1 surface-border my-2">
                @for (r of rules(); track r.id) {
                  <div class="flex align-items-start gap-2">
                    <p-checkbox name="simRules" [value]="r.id" [(ngModel)]="selectedRuleIds" [inputId]="'chk'+r.id"></p-checkbox>
                    <label [for]="'chk'+r.id" class="text-xs cursor-pointer line-height-2">
                      <span class="flex align-items-center gap-1">
                        {{ r.name }}
                        @if (r.expression.startsWith('IF ')) {
                          <span class="status-badge text-xs" style="font-size:9px; background:#E0E7FF; color:#3730A3;">Dynamic</span>
                        } @else if (r.risk_level) {
                          <span class="risk-badge" [class]="'risk-' + r.risk_level.toLowerCase().replace(' ','-')" style="font-size:9px;">{{ r.risk_level }}</span>
                        }
                        @if (!r.enabled) { <span class="text-400 text-xs">(disabled)</span> }
                      </span>
                      <span class="text-400 font-mono block text-xs truncate" style="max-width: 220px;">{{ r.expression | slice:0:45 }}{{ r.expression.length > 45 ? '...' : '' }}</span>
                    </label>
                  </div>
                }
              </div>

              <h4 class="m-0 mb-2 text-sm font-bold text-900">Filters</h4>
              <div class="mb-3">
                <p-floatlabel variant="on">
                  <input pInputText id="minHit" type="number" [(ngModel)]="simMinMatchCount" min="1" [max]="selectedRuleIds.length + (includeDraftRule ? 1 : 0)" class="w-full" />
                  <label for="minHit">Minimum Rules Hit</label>
                </p-floatlabel>
              </div>
              <div class="mb-3">
                <p-floatlabel variant="on">
                  <p-select
                    id="simBranch"
                    [(ngModel)]="simBranchFilter"
                    [options]="branchOptions()"
                    optionLabel="label"
                    optionValue="value"
                    appendTo="body"
                    styleClass="w-full">
                  </p-select>
                  <label for="simBranch">Branch (Optional)</label>
                </p-floatlabel>
              </div>

              <button pButton pRipple type="button" [label]="simulating() ? 'Running...' : 'Run Simulation'" [icon]="simulating() ? 'pi pi-spin pi-spinner' : 'pi pi-play'" class="p-button-primary w-full" (click)="runSimulation({ first: 0, rows: 25 })" [disabled]="simulating()"></button>
            </div>

            <!-- Main Content: Results -->
            <div class="sim-content flex-1 flex flex-column">
              <!-- Compact Filterable KPI Cards -->
              @if (simTotal() > 0) {
                <div class="grid grid-nogutter gap-2 mb-2">
                  <div 
                    class="col cursor-pointer surface-card border-1 border-round-lg p-2 transition-duration-150 flex align-items-center justify-content-between"
                    [class.border-indigo-500]="simFilterMode() === 'all'"
                    [class.surface-border]="simFilterMode() !== 'all'"
                    [style.background]="simFilterMode() === 'all' ? 'var(--indigo-50, #EEF2FF)' : 'var(--surface-card)'"
                    (click)="setSimFilterMode('all')"
                    title="Click to show all matched accounts">
                    <div class="flex align-items-center gap-2">
                      <div class="w-2rem h-2rem border-round flex align-items-center justify-content-center" style="background: rgba(79, 70, 229, 0.1);">
                        <i class="pi pi-users text-indigo-600 text-sm"></i>
                      </div>
                      <div>
                        <div class="text-xs font-semibold text-600 line-height-1 mb-1">Matched</div>
                        <div class="text-lg font-bold text-900 line-height-1">{{ simTotal() }}</div>
                      </div>
                    </div>
                    @if (simFilterMode() === 'all') {
                      <i class="pi pi-check-circle text-indigo-600 text-xs"></i>
                    }
                  </div>

                  <div 
                    class="col cursor-pointer surface-card border-1 border-round-lg p-2 transition-duration-150 flex align-items-center justify-content-between"
                    [class.border-red-500]="simFilterMode() === 'flagged'"
                    [class.surface-border]="simFilterMode() !== 'flagged'"
                    [style.background]="simFilterMode() === 'flagged' ? '#FEF2F2' : 'var(--surface-card)'"
                    (click)="setSimFilterMode('flagged')"
                    title="Click to filter accounts already on watch list">
                    <div class="flex align-items-center gap-2">
                      <div class="w-2rem h-2rem border-round flex align-items-center justify-content-center" style="background: rgba(220, 38, 38, 0.1);">
                        <i class="pi pi-flag-fill text-red-600 text-sm"></i>
                      </div>
                      <div>
                        <div class="text-xs font-semibold text-600 line-height-1 mb-1">Watch List</div>
                        <div class="text-lg font-bold text-red-600 line-height-1">{{ simFlaggedCount() }}</div>
                      </div>
                    </div>
                    @if (simFilterMode() === 'flagged') {
                      <i class="pi pi-check-circle text-red-600 text-xs"></i>
                    }
                  </div>

                  <div 
                    class="col cursor-pointer surface-card border-1 border-round-lg p-2 transition-duration-150 flex align-items-center justify-content-between"
                    [class.border-green-500]="simFilterMode() === 'new'"
                    [class.surface-border]="simFilterMode() !== 'new'"
                    [style.background]="simFilterMode() === 'new' ? '#ECFDF5' : 'var(--surface-card)'"
                    (click)="setSimFilterMode('new')"
                    title="Click to filter new detections">
                    <div class="flex align-items-center gap-2">
                      <div class="w-2rem h-2rem border-round flex align-items-center justify-content-center" style="background: rgba(21, 128, 61, 0.1);">
                        <i class="pi pi-sparkles text-green-600 text-sm"></i>
                      </div>
                      <div>
                        <div class="text-xs font-semibold text-600 line-height-1 mb-1">New Detections</div>
                        <div class="text-lg font-bold text-green-600 line-height-1">{{ simTotal() - simFlaggedCount() }}</div>
                      </div>
                    </div>
                    @if (simFilterMode() === 'new') {
                      <i class="pi pi-check-circle text-green-600 text-xs"></i>
                    }
                  </div>
                </div>
              }

              <app-table 
                [data]="simResults()" 
                [columns]="simTableColumns"
                [lazy]="true" 
                (onLazyLoad)="runSimulation($event)" 
                [paginator]="true" 
                [rows]="25" 
                [totalRecords]="displayedSimTotal()" 
                [loading]="simulating()"
                [showAddButton]="false"
                [showRefreshButton]="false"
                [showSerialNumber]="false"
                [bodyTemplate]="simBodyTemplate"
                scrollHeight="calc(100vh - 280px)">
              </app-table>

              <ng-template #simBodyTemplate let-acc>
                <td style="text-align:center;">
                  <span style="background:var(--indigo-100); color:var(--indigo-700); padding:1px 6px; border-radius:10px; font-weight:700; font-size:11px;">{{ acc.hit_count }}</span>
                </td>
                <td style="font-family:monospace; font-size:12px;">{{ acc.account_no || acc.account_id }}</td>
                <td style="font-size:12px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;" [title]="acc.long_name">{{ acc.long_name }}</td>
                <td style="font-size:12px;">{{ acc.branch_code }}</td>
                <td style="text-align:right; font-family:monospace; font-size:12px;">₹{{ acc.balance | number:'1.0-0' }}</td>
                <td style="text-align:center;">
                  @if (acc.watch_list_id) {
                    <span style="background:#FEE2E2; color:#DC2626; padding:1px 6px; border-radius:10px; font-size:10px; font-weight:700;">
                      <i class="pi pi-flag-fill" style="font-size:8px;"></i> Flagged
                    </span>
                  } @else {
                    <span style="background:#DCFCE7; color:#15803D; padding:1px 6px; border-radius:10px; font-size:10px; font-weight:700;">
                      New
                    </span>
                  }
                </td>
                <td style="font-size:11px;">
                  @if (acc.matched_rules && acc.matched_rules.length > 0) {
                    <div class="flex align-items-center gap-1" [title]="acc.matched_rules.join(', ')">
                      <span style="background:var(--surface-hover); border:1px solid var(--border); padding:1px 6px; border-radius:4px; font-size:10px; font-weight:500; white-space:nowrap; max-width:180px; overflow:hidden; text-overflow:ellipsis;">
                        {{ acc.matched_rules[0] }}
                      </span>
                      @if (acc.matched_rules.length > 1) {
                        <span style="background:var(--indigo-50, #EEF2FF); color:var(--indigo-600, #4F46E5); border:1px solid var(--indigo-200, #C7D2FE); padding:1px 5px; border-radius:10px; font-size:10px; font-weight:700; white-space:nowrap;">
                          +{{ acc.matched_rules.length - 1 }}
                        </span>
                      }
                    </div>
                  }
                </td>
              </ng-template>
            </div>
          </div>
        </div>
      </ng-template>

      <ng-template pTemplate="footer">
        <div class="drawer-footer-row flex align-items-center justify-content-between w-full">
          <button pButton pRipple label="Close" icon="pi pi-times" class="p-button-outlined p-button-secondary" (click)="showSimulator = false"></button>
          <button pButton pRipple label="Run Simulation" icon="pi pi-play" class="p-button-primary" (click)="runSimulation({ first: 0, rows: 25 })" [disabled]="simulating()"></button>
        </div>
      </ng-template>
    </p-drawer>
  `,
  styles: [`
    .col-2-4 { flex: 0 0 20%; max-width: 20%; }
    @media (max-width: 991px) {
      .col-2-4 { flex: 0 0 50%; max-width: 50%; }
    }
    @media (max-width: 575px) {
      .col-2-4 { flex: 0 0 100%; max-width: 100%; }
    }

    .fg { margin-bottom: 12px; }
    .fl { font-size: 12px; color: #6B7280; font-weight: 600; margin-bottom: 4px; display: block; }
    .req { color: #DC2626; }
    input, select, textarea { padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: 6px; font-family: inherit; font-size: 13px; }
    .w-full { width: 100%; box-sizing: border-box; }

    /* Risk badges */
    .risk-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; white-space: nowrap; }
    .risk-low { background: #DCFCE7; color: #15803D; }
    .risk-medium { background: #FEF9C3; color: #854D0E; }
    .risk-high { background: #FEE2E2; color: #B91C1C; }
    .risk-very-high { background: #4C1D95; color: #fff; }

    /* Expression editor */
    .expr-editor { border: 1px solid var(--surface-border); border-radius: 6px; position:relative; background:var(--surface-card); display:flex; flex-direction:column; }
    .expr-ta { border: none !important; border-radius: 0 !important; font-family: 'Courier New', monospace; font-size: 13px; resize: vertical; position:relative; z-index:2; padding:12px; min-height: 120px; outline: none; box-shadow: none !important; white-space:pre-wrap; overflow-wrap:break-word; }
    .expr-bar { background: var(--surface-ground); border-top: 1px solid var(--surface-border); padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; position:relative; z-index:3; border-radius: 0 0 6px 6px; }
    .expr-ops { display: flex; gap: 4px; flex-wrap: wrap; }
    .op-pill { background: #E0E7FF; color: #3730A3; border: none; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: monospace; }
    .op-pill:hover { background: #C7D2FE; }

    /* Autocomplete */
    .autocomplete-popup { position: absolute; z-index: 9999; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); width: 260px; max-height: 220px; overflow-y: auto; padding: 4px; }
    .ac-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-radius: 4px; cursor: pointer; }
    .ac-item:hover, .ac-active { background: var(--surface-hover); }
    .ac-label { font-family: monospace; font-size: 12px; font-weight: 700; color: var(--text-color); }
    .ac-type { font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }

    /* PrismJS Overrides */
    ::ng-deep .token.keyword { color: #4338CA; font-weight: 700; }
    ::ng-deep .token.operator { color: #C2410C; font-weight: 700; }
    ::ng-deep .token.boolean { color: #0F766E; font-weight: 700; }
    ::ng-deep .token.string { color: #15803D; }
    ::ng-deep .token.function { color: #B91C1C; font-weight: 700; }
    ::ng-deep .token.property { color: #0F766E; font-weight: 700; }
    ::ng-deep .token.number { color: #D97706; }
    ::ng-deep .token.punctuation { color: #6B7280; }

    /* Rule cards */
    .rule-card { border: 1px solid var(--surface-border); border-radius: 8px; padding: 14px; margin-bottom: 10px; background: var(--surface-card); transition: all .15s; }
    .rule-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.05); }
    .rule-active { border-color: var(--primary-color, #1B4FD8); background: var(--surface-card); }
    .rule-disabled { opacity: .65; }
    .rule-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; gap: 8px; }
    .rule-name { font-size: 14px; font-weight: 700; color: var(--text-color); }
    .rule-sig { font-size: 11px; background: #FEF2F2; color: #DC2626; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
    .rule-expr { font-family: 'Courier New', monospace; font-size: 12px; background: var(--surface-ground); border-radius: 4px; padding: 6px 10px; color: var(--text-color); word-break: break-all; }
    .rule-desc { font-size: 12px; color: var(--text-color-secondary); margin-top: 6px; }
    .status-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--surface-200); color: var(--text-color-secondary); }
    .status-badge.active { background: #DCFCE7; color: #15803D; }

    /* Toggle switch */
    .toggle-sw { display:inline-flex;align-items:center;cursor:pointer; }
    .toggle-sw input { display:none; }
    .toggle-track { width:36px;height:20px;background:#D1D5DB;border-radius:20px;position:relative;transition:.2s; }
    .toggle-sw input:checked + .toggle-track { background:var(--primary-color, #1B4FD8); }
    .toggle-track::after { content:'';width:16px;height:16px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:.2s; }
    .toggle-sw input:checked + .toggle-track::after { left:18px; }

    /* Field reference and Guide */
    .ref-tabs { display:flex; gap:0; border-bottom:1px solid var(--surface-border); margin-bottom:12px; }
    .ref-tab { flex:1; padding:8px 0; font-size:12px; font-weight:700; color:var(--text-color-secondary); background:transparent; border:none; border-bottom:2px solid transparent; cursor:pointer; transition:.15s; }
    .ref-tab:hover { color:var(--text-color); background:var(--surface-hover); }
    .ref-tab.active { color:var(--primary-color, #1B4FD8); border-bottom-color:var(--primary-color, #1B4FD8); }

    .ref-panel { max-height: calc(100vh - 220px); overflow-y: auto; }
    .ref-group { margin-bottom: 12px; }
    .ref-cat { font-size: 10px; font-weight: 800; color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
    .ref-fields { display: flex; flex-wrap: wrap; gap: 4px; }
    
    .ref-field { font-size: 11px; font-family: 'Courier New', monospace; background: var(--surface-ground); border: 1px solid var(--surface-border); border-radius: 4px; padding: 2px 6px; cursor: pointer; color: var(--text-color); transition: .1s; }
    .ref-field:hover { background: var(--primary-color, #1B4FD8); color: #fff; border-color: var(--primary-color, #1B4FD8); }
    
    .ref-kw { font-size:11px; font-family:monospace; font-weight:700; border:1px solid; border-radius:4px; padding:2px 6px; cursor:pointer; transition:.15s; }
    .ref-kw:hover { filter:brightness(0.9); }

    ::ng-deep .ref-overlay .p-popover-content { padding: 12px !important; }
    .ref-tooltip-token { display:inline-block; font-family:monospace; font-weight:800; font-size:14px; padding:2px 8px; border-radius:4px; border:1px solid; margin-bottom:8px; background:var(--surface-card); }
    .ref-tooltip-desc { font-size:12px; color:var(--text-color); line-height:1.5; margin-bottom:10px; }
    .ref-tooltip-eg-label { font-size:10px; font-weight:800; color:var(--text-color-secondary); text-transform:uppercase; margin-bottom:4px; }
    .ref-tooltip-eg { font-family:monospace; font-size:11px; background:var(--surface-ground); color:var(--text-color); padding:6px 8px; border-radius:4px; cursor:pointer; border:1px solid var(--surface-border); transition:.1s; }
    .ref-tooltip-eg:hover { border-color:var(--primary-color, #1B4FD8); color:var(--primary-color, #1B4FD8); }

    /* Simulator */
    .sim-layout { display: flex; height: 100%; gap: 20px; }
    .sim-sidebar { width: 310px; border-right: 1px solid var(--surface-border); padding-right: 20px; overflow-y: auto; flex-shrink: 0; }
    .sim-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .sim-stats-bar { display: flex; gap: 0; margin-bottom: 12px; background: var(--surface-ground); border: 1px solid var(--surface-border); border-radius: 8px; padding: 10px 20px; }
    .sim-stat { display: flex; flex-direction: column; align-items: center; padding: 0 20px; border-right: 1px solid var(--surface-border); }
    .sim-stat:last-child { border-right: none; }
    .sim-stat-num { font-size: 20px; font-weight: 800; color: var(--text-color); line-height: 1; }
    .sim-stat-lbl { font-size: 11px; color: var(--text-color-secondary); margin-top: 2px; font-weight: 600; }

    /* Loader Overlay */
    .loader-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(255,255,255,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 16px; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #1B4FD8; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `],
})
export class AdminCbsRulesComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  messageService = inject(MessageService);
  confirmationService = inject(ConfirmationService);
  sanitizer = inject(DomSanitizer);
  loading = signal(true);
  applying = signal(false);
  cdr = inject(ChangeDetectorRef);

  rules = signal<any[]>([]);
  signals = signal<any[]>([]);
  branches = signal<any[]>([]);
  
  selectedTagFilter = signal<string>('all');
  filteredRules = computed(() => {
    const filter = this.selectedTagFilter();
    const all = this.rules();
    if (filter === 'all') return all;
    return all.filter(r => (r.tag || 'cbs') === filter);
  });

  tagFilterOptions = [
    { label: 'All Rules', value: 'all' },
    { label: 'CBS Rule', value: 'cbs' },
    { label: 'Manual Question', value: 'manual' },
    { label: 'Audit Question', value: 'audit' }
  ];

  ruleTagOptions = [
    { label: 'CBS Rule', value: 'cbs' },
    { label: 'Manual Question Rule', value: 'manual' },
    { label: 'Audit Question Rule', value: 'audit' }
  ];

  branchOptions = computed(() => [
    { label: 'All Branches', value: '' },
    ...this.branches().map((b: any) => ({ label: `${b.name} (${b.code})`, value: b.code }))
  ]);

  showForm = false;
  editing = false;
  editingId: number | null = null;
  form: any = { name: '', expression: '', signal_ids: [], description: '', enabled: true, risk_level: null };

  validating = false;
  validationResult = signal<{ valid: boolean; error?: string } | null>(null);

  fieldRef = FIELD_REFERENCE;
  exprRef = EXPR_REFERENCE;
  quickOps = ['=', '!=', '>', '<', '>=', '<=', 'AND', 'OR', 'NOT', 'IN', 'NOT IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL', '(', ')', '+', '-', '*', '/', 'IF', 'THEN', 'ELSE', 'SET risk = ""'];

  hoveredRef = signal<{token:string; desc:string; example:string; color:string} | null>(null);
  refPanelTab = signal<'fields'|'guide'>('guide');

  showSimulator = false;
  simulating = signal(false);
  simResults = signal<any[]>([]);
  simTotal = signal(0);
  simFlaggedCount = signal(0);
  simMinMatchCount = 1;
  simBranchFilter = '';
  selectedRuleIds: number[] = [];
  includeDraftRule = false;

  simFilterMode = signal<'all' | 'flagged' | 'new'>('all');

  displayedSimResults = computed(() => {
    const filter = this.simFilterMode();
    const list = this.simResults();
    if (filter === 'flagged') return list.filter((a: any) => a.watch_list_id);
    if (filter === 'new') return list.filter((a: any) => !a.watch_list_id);
    return list;
  });

  displayedSimTotal = computed(() => {
    const filter = this.simFilterMode();
    if (filter === 'flagged') return this.simFlaggedCount();
    if (filter === 'new') return this.simTotal() - this.simFlaggedCount();
    return this.simTotal();
  });

  simTableColumns: TableColumn[] = [
    { field: 'hit_count', header: 'Hits', width: '70px', align: 'center', headerAlign: 'center', sortable: true },
    { field: 'account_no', header: 'Account No', sortable: true },
    { field: 'long_name', header: 'Name', sortable: true },
    { field: 'branch_code', header: 'Branch', sortable: true },
    { field: 'balance', header: 'Balance', align: 'right', headerAlign: 'right', sortable: true },
    { field: 'watch_list_id', header: 'Watch List', align: 'center', headerAlign: 'center', sortable: true },
    { field: 'matched_rules', header: 'Rules Matched', sortable: false }
  ];

  @ViewChild('editor', {static: false}) editorRef!: ElementRef;
  jar: CodeJar | null = null;

  // Autocomplete state
  showAutocomplete = false;
  autocompleteOptions: any[] = [];
  autocompleteIndex = 0;
  autocompleteX = 0;
  autocompleteY = 0;
  currentWord = '';
  allTokens: any[] = [];

  activeCount = () => this.rules().filter(r => r.enabled).length;
  getCountByTag(tag: string): number {
    return this.rules().filter(r => (r.tag || 'cbs') === tag).length;
  }

  ngOnInit() {
    this.loadAll();
    
    // Build allTokens for autocomplete
    const tokens: any[] = [];
    this.fieldRef.forEach(g => {
      g.fields.forEach(f => tokens.push({ label: f, type: 'Field', color: '#4B5563', bg: '#F3F4F6' }));
    });
    this.exprRef.forEach(g => {
      g.items.forEach(i => {
        let label = i.insert.trim().replace(/\($/, '');
        if (/^[a-zA-Z_]+$/.test(label)) {
          tokens.push({ label: label, type: g.category, color: g.color, bg: g.color + '12' });
        }
      });
    });
    // Deduplicate
    const map = new Map();
    tokens.forEach(t => map.set(t.label, t));
    this.allTokens = Array.from(map.values());
  }

  loadAll() {
    this.loading.set(true);
    this.ewsApi.getCbsRules().subscribe({
      next: (d: any) => { this.rules.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.ewsApi.getSignals().subscribe({
      next: (s: any) => { 
        this.signals.set(s.map((sig: any) => ({
          ...sig,
          displayName: '#' + sig.number + ' — ' + sig.name
        }))); 
      },
    });
    this.ewsApi.getBranches().subscribe({
      next: (b: any) => this.branches.set(b),
    });
  }

  getSignal(id: number) {
    return this.signals().find((s: any) => s.id === id);
  }

  openCreate() {
    this.editing = false;
    this.editingId = null;
    this.form = { name: '', description: '', expression: '', enabled: true, signal_ids: [], tag: 'cbs' };
    this.showForm = true;
    this.initEditor('');
  }

  openEdit(rule: any) {
    this.editing = true;
    this.editingId = rule.id;
    this.form = {
      name: rule.name,
      description: rule.description || '',
      expression: rule.expression,
      enabled: rule.enabled,
      signal_ids: rule.signal_ids ? [...rule.signal_ids] : [],
      tag: rule.tag || 'cbs'
    };
    this.showForm = true;
    this.initEditor(this.form.expression);
  }

  initEditor(code: string) {
    setTimeout(() => {
      if (this.editorRef && this.editorRef.nativeElement) {
        if (!this.jar) {
          const highlight = (editor: HTMLElement) => {
            const text = editor.textContent || '';
            editor.innerHTML = Prism.highlight(text, Prism.languages['cbs'], 'cbs');
          };
          this.jar = CodeJar(this.editorRef.nativeElement, highlight);
          this.jar.onUpdate((newCode: string) => {
            this.form.expression = newCode;
            this.resetValidation();
          });
          
          // Autocomplete event listeners
          const el = this.editorRef.nativeElement;
          el.addEventListener('keydown', (e: KeyboardEvent) => {
            if (this.showAutocomplete) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.autocompleteIndex = (this.autocompleteIndex + 1) % this.autocompleteOptions.length;
                this.cdr.detectChanges();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.autocompleteIndex = (this.autocompleteIndex - 1 + this.autocompleteOptions.length) % this.autocompleteOptions.length;
                this.cdr.detectChanges();
              } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                this.applyAutocomplete();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                this.showAutocomplete = false;
                this.cdr.detectChanges();
              }
            }
          });

          el.addEventListener('keyup', (e: KeyboardEvent) => {
            if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(e.key)) return;
            this.checkAutocomplete();
          });

          el.addEventListener('blur', () => {
             this.showAutocomplete = false;
             this.cdr.detectChanges();
          });
          
          el.addEventListener('click', () => {
             this.checkAutocomplete();
          });
        }
        this.jar.updateCode(code || '');
      }
    }, 50);
  }

  cancelForm() {
    this.showForm = false;
    this.editingId = null;
    if (this.jar) {
      this.jar.destroy();
      this.jar = null;
    }
  }

  resetValidation() {
    this.validationResult.set(null);
  }

  highlightRule(expr: string): SafeHtml {
    if (!expr) return '';
    const html = Prism.highlight(expr, Prism.languages['cbs'], 'cbs');
    return this.sanitizer.bypassSecurityTrustHtml(html.replace(/\n/g, '<br/>'));
  }

  checkAutocomplete() {
    if (!this.jar) return;
    const pos = this.jar.save();
    const curr = this.form.expression || '';
    const textBefore = curr.slice(0, pos.start);
    const match = textBefore.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
    if (match) {
      this.currentWord = match[0];
      this.autocompleteOptions = this.allTokens.filter(t => 
        t.label.toLowerCase().includes(this.currentWord.toLowerCase()) && 
        t.label.toLowerCase() !== this.currentWord.toLowerCase()
      ).slice(0, 8);
      
      if (this.autocompleteOptions.length > 0) {
        this.showAutocomplete = true;
        this.autocompleteIndex = 0;
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          if (this.editorRef && this.editorRef.nativeElement) {
            const containerRect = this.editorRef.nativeElement.parentElement.getBoundingClientRect();
            this.autocompleteX = rect.left - containerRect.left;
            this.autocompleteY = rect.bottom - containerRect.top + 4;
            
            // Adjust if range returns 0 (collapsed text node bug in some browsers)
            if (rect.left === 0 && rect.bottom === 0) {
               // fallback to rough position or just 10px
               this.autocompleteX = 10;
               this.autocompleteY = 30;
            }
          }
        }
        this.cdr.detectChanges();
      } else {
        this.showAutocomplete = false;
        this.cdr.detectChanges();
      }
    } else {
      this.showAutocomplete = false;
      this.cdr.detectChanges();
    }
  }

  applyAutocomplete(index: number = this.autocompleteIndex) {
    if (!this.showAutocomplete || this.autocompleteOptions.length === 0) return;
    const selected = this.autocompleteOptions[index].label;
    const pos = this.jar!.save();
    const curr = this.form.expression || '';
    const newExpr = curr.slice(0, pos.start - this.currentWord.length) + selected + curr.slice(pos.start);
    this.form.expression = newExpr;
    this.jar!.updateCode(newExpr);
    this.jar!.restore({ start: pos.start - this.currentWord.length + selected.length, end: pos.start - this.currentWord.length + selected.length });
    
    this.showAutocomplete = false;
    this.resetValidation();
    this.cdr.detectChanges();
  }

  insertText(txt: string) {
    if (this.jar) {
      const pos = this.jar.save();
      const curr = this.form.expression || '';
      const start = pos.dir === '<-' ? pos.start : pos.end;
      const newExpr = curr.slice(0, start) + txt + curr.slice(start);
      this.form.expression = newExpr;
      this.jar.updateCode(newExpr);
      this.jar.restore({start: start + txt.length, end: start + txt.length});
    } else {
      this.form.expression = (this.form.expression || '') + txt;
    }
    this.resetValidation();
  }

  insertOp(op: string) {
    this.insertText(' ' + op + ' ');
  }

  insertField(f: string) {
    this.insertText(f);
  }

  setExpr(e: string) {
    if (this.jar) {
      this.form.expression = e;
      this.jar.updateCode(e);
    } else {
      this.form.expression = e;
    }
    this.resetValidation();
  }

  validateExpr() {
    if (!this.form.expression.trim()) {
      this.validationResult.set({ valid: false, error: 'Expression is empty.' });
      return;
    }
    this.validating = true;
    this.validationResult.set(null);
    this.ewsApi.validateCbsExpression(this.form.expression).subscribe({
      next: (res: any) => {
        this.validationResult.set(res);
        this.validating = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.validationResult.set({ valid: false, error: err?.error?.message || 'Server error during validation' });
        this.validating = false;
        this.cdr.detectChanges();
      },
    });
  }

  save(applyRules: boolean = true) {
    if (!this.form.name.trim() || !this.form.expression.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Required Fields', detail: 'Rule name and expression are required.' });
      return;
    }
    this.loading.set(true);
    const payload = { ...this.form, applyRules };

    const obs = this.editing && this.editingId
      ? this.ewsApi.updateCbsRule(this.editingId, payload)
      : this.ewsApi.createCbsRule(payload);

    obs.subscribe({
      next: () => { 
        this.showForm = false; 
        const applyMsg = applyRules ? ' Rules are being applied to all accounts in the background.' : ' Use "Apply Rules Now" to re-evaluate accounts when ready.';
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: `Rule "${this.form.name}" ${this.editing ? 'updated' : 'created'} successfully.${applyMsg}` });
        this.loadAll(); 
      },
      error: (e: any) => { 
        this.messageService.add({ severity: 'error', summary: 'Save Failed', detail: e.error?.message || 'Server error' });
        this.loading.set(false); 
      },
    });
  }

  toggle(rule: any) {
    this.loading.set(true);
    const nowEnabled = !rule.enabled;
    this.ewsApi.updateCbsRule(rule.id, { enabled: nowEnabled }).subscribe({
      next: () => {
        this.rules.update(r => r.map(x => x.id === rule.id ? { ...x, enabled: nowEnabled } : x));
        if (nowEnabled) {
          // Rule just enabled — sweep only this rule's accounts in background
          this.ewsApi.applySingleRule(rule.id).subscribe({
            next: () => this.messageService.add({ severity: 'info', summary: 'Enabled & Applied', detail: `Rule "${rule.name}" is now enabled and has been applied to the portfolio.` }),
            error: () => this.messageService.add({ severity: 'warn', summary: 'Enabled', detail: `Rule "${rule.name}" enabled, but re-sweep failed. Click "Apply Rules Now" to retry.` }),
          });
        } else {
          // Rule disabled — signals remain until next "Apply Rules Now"
          this.messageService.add({ severity: 'info', summary: 'Disabled', detail: `Rule "${rule.name}" is now disabled. Its existing flags will be cleared on next "Apply Rules Now".` });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  remove(rule: any) {
    this.confirmationService.confirm({
      message: `Delete rule "<strong>${rule.name}</strong>"? This will trigger a full re-evaluation of all accounts.`,
      header: 'Confirm Delete',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.set(true);
        this.ewsApi.deleteCbsRule(rule.id).subscribe({
          next: () => {
            this.rules.update(r => r.filter(x => x.id !== rule.id));
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `Rule "${rule.name}" has been removed.` });
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      }
    });
  }

  applyRules() {
    this.confirmationService.confirm({
      message: 'Re-run all enabled CBS rules against the current loan portfolio? This may take a few seconds.',
      header: 'Apply Rules Now',
      icon: 'pi pi-refresh',
      accept: () => {
        this.applying.set(true);
        this.ewsApi.applyAllRules().subscribe({
          next: () => {
            this.applying.set(false);
            this.messageService.add({ severity: 'success', summary: 'Rules Applied', detail: 'All CBS rules have been re-run against the portfolio successfully.' });
          },
          error: (e: any) => {
            this.applying.set(false);
            this.messageService.add({ severity: 'error', summary: 'Failed', detail: e.error?.message || 'Could not apply rules.' });
          }
        });
      }
    });
  }

  copyExpr(rule: any) {
    navigator.clipboard.writeText(rule.expression).then(() => {
      this.messageService.add({ severity: 'info', summary: 'Copied', detail: 'Expression copied to clipboard.' });
    });
  }

  testSingleRule(rule: any) {
    this.openSimulator();
    this.selectedRuleIds = [rule.id];
    this.includeDraftRule = false;
  }
  // --- Simulator ---

  openSimulator() {
    this.showSimulator = true;
    this.simResults.set([]);
    this.simTotal.set(0);
    this.simFlaggedCount.set(0);
    this.simMinMatchCount = 1;
    this.simBranchFilter = '';
    this.simFilterMode.set('all');
    // Default select enabled CBS automated rules for high performance
    this.selectedRuleIds = this.rules().filter(r => r.enabled && (r.tag === 'cbs' || !r.tag)).map(r => r.id);
  }

  selectAllRules() {
    this.selectedRuleIds = this.rules().filter(r => r.tag === 'cbs' || !r.tag).map(r => r.id);
  }

  selectNoRules() {
    this.selectedRuleIds = [];
  }

  setSimFilterMode(mode: 'all' | 'flagged' | 'new') {
    this.simFilterMode.set(mode);
    this.runSimulation({ first: 0, rows: 25 });
  }

  runSimulation(event?: TableLazyLoadEvent) {
    if (this.simulating()) return;

    let page = 1;
    let limit = 25;
    
    if (event) {
      page = Math.floor(event.first! / event.rows!) + 1;
      limit = event.rows!;
    }

    const rulesToTest: {name: string, expression: string}[] = [];
    
    for (const rule of this.rules()) {
      if (this.selectedRuleIds.includes(rule.id)) {
        rulesToTest.push({ name: rule.name, expression: rule.expression });
      }
    }

    if (this.includeDraftRule && this.form.expression && this.form.expression.trim() !== '') {
      rulesToTest.push({ 
        name: (this.form.name || 'Draft Rule') + ' (Draft)', 
        expression: this.form.expression 
      });
    }

    if (rulesToTest.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'No Rules Selected', detail: 'Please select at least one rule to simulate.' });
      return;
    }

    this.simulating.set(true);
    
    this.ewsApi.simulateCbsRules({
      rules: rulesToTest,
      minMatchCount: this.simMinMatchCount,
      page,
      limit,
      branchCode: this.simBranchFilter || undefined,
      watchListFilter: this.simFilterMode()
    }).subscribe({
      next: (res: any) => {
        this.simResults.set(res.data || []);
        if (res.totalMatched !== undefined) {
          this.simTotal.set(res.totalMatched);
          this.simFlaggedCount.set(res.flaggedTotal || 0);
        } else {
          this.simTotal.set(res.total || 0);
        }
        this.simulating.set(false);
      },
      error: (err: any) => {
        this.messageService.add({ severity: 'error', summary: 'Simulation Failed', detail: err.error?.message || 'Server error during simulation.' });
        this.simulating.set(false);
      }
    });
  }
}
