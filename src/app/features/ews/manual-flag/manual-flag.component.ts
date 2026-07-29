import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { EwsApiService } from '../services/ews-api.service';

@Component({
  selector: 'app-manual-flag',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ToastModule,
    InputTextModule, 
    TextareaModule, 
    ButtonModule, 
    SelectModule, 
    MessageModule
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>

    <div class="card p-4">
      
      <!-- Header Row -->
      <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom-1 surface-border">
        <div>
          <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">
            Manually Flag Account
          </h5>
          <p class="m-0 mt-1 text-sm text-gray-500">Enter account number to auto-fill details from CBS data and add custom risk signals.</p>
        </div>
        <div class="flex align-items-center gap-2">
          <span class="px-2.5 py-1 text-xs font-bold border-round bg-red-50 text-red-700 border-1 border-red-200">
            Manual Flag
          </span>
        </div>
      </div>

      <!-- Success & Error Alert Messages -->
      <p-message *ngIf="successMessage()" severity="success" styleClass="w-full mb-3" [text]="successMessage()"></p-message>
      <p-message *ngIf="errorMessage()" severity="error" styleClass="w-full mb-3" [text]="errorMessage()"></p-message>

      <!-- Form Layout Container -->
      <div class="flex flex-column gap-3">
        
        <!-- 1. Account Lookup Field -->
        <div class="flex flex-column gap-1.5">
          <label class="text-xs font-bold text-700 uppercase tracking-wide">
            Account Number <span class="text-red-500">*</span>
          </label>
          <div class="flex gap-2">
            <input 
              pInputText 
              type="text" 
              [(ngModel)]="form.account_id" 
              placeholder="Enter account number (e.g. 10001001)" 
              class="w-full"
              (blur)="lookupAccount()" 
              (keyup.enter)="lookupAccount()" />
            
            <button 
              pButton 
              pRipple 
              [label]="lookingUp ? 'Fetching...' : 'Fetch CBS Data'" 
              [icon]="lookingUp ? 'pi pi-spin pi-spinner' : 'pi pi-search'" 
              class="p-button-primary flex-shrink-0" 
              (click)="lookupAccount()" 
              [disabled]="lookingUp || !form.account_id">
            </button>
          </div>

          <div *ngIf="cbsRecord" class="text-xs font-semibold text-emerald-600 flex align-items-center gap-1 mt-1">
            <i class="pi pi-check-circle"></i> CBS record found — details auto-filled automatically
          </div>
          <div *ngIf="lookupNotFound" class="text-xs font-semibold text-amber-600 flex align-items-center gap-1 mt-1">
            <i class="pi pi-exclamation-triangle"></i> No CBS record found. Please enter details manually below.
          </div>
        </div>

        <!-- 2. CBS Details Snapshot Panel -->
        <div *ngIf="cbsRecord" class="bg-blue-50 border-1 border-blue-200 border-round-xl p-3 my-1">
          <div class="flex align-items-center gap-2 mb-2 text-blue-800 font-bold text-sm">
            <i class="pi pi-database text-blue-600"></i> CBS Data Snapshot
          </div>
          
          <div class="grid formgrid m-0">
            <div class="col-6 sm:col-3 p-1">
              <div class="text-xs text-600 font-semibold">Scheme</div>
              <div class="text-sm font-bold text-900">{{ cbsRecord.scheme_desc || '—' }}</div>
            </div>
            <div class="col-6 sm:col-3 p-1">
              <div class="text-xs text-600 font-semibold">Principal Outstanding</div>
              <div class="text-sm font-bold text-900">{{ cbsRecord.principal_outstanding | number:'1.0-0' }}</div>
            </div>
            <div class="col-6 sm:col-3 p-1">
              <div class="text-xs text-600 font-semibold">Balance</div>
              <div class="text-sm font-bold" [ngClass]="(cbsRecord.balance || 0) < 0 ? 'text-red-600' : 'text-emerald-600'">
                {{ cbsRecord.balance | number:'1.0-0' }}
              </div>
            </div>
            <div class="col-6 sm:col-3 p-1">
              <div class="text-xs text-600 font-semibold">Interest Rate</div>
              <div class="text-sm font-bold text-900">{{ cbsRecord.int_rate }}%</div>
            </div>
            <div class="col-6 sm:col-3 p-1">
              <div class="text-xs text-600 font-semibold">Customer Rating</div>
              <div class="text-sm font-bold text-900">{{ cbsRecord.bank_cust_rating || '—' }}</div>
            </div>
            <div class="col-6 sm:col-3 p-1">
              <div class="text-xs text-600 font-semibold">NPA Status</div>
              <div class="text-sm font-bold" [ngClass]="cbsRecord.npa === 'Y' ? 'text-red-600' : 'text-emerald-600'">
                {{ cbsRecord.npa === 'Y' ? 'YES' : 'NO' }}
              </div>
            </div>
            <div class="col-6 sm:col-3 p-1">
              <div class="text-xs text-600 font-semibold">Expiry Date</div>
              <div class="text-sm font-bold text-900">{{ cbsRecord.exp_date | date:'dd MMM yyyy' }}</div>
            </div>
            <div class="col-6 sm:col-3 p-1">
              <div class="text-xs text-600 font-semibold">Security Amount</div>
              <div class="text-sm font-bold text-900">{{ cbsRecord.security_amount | number:'1.0-0' }}</div>
            </div>
          </div>
        </div>

        <!-- 3. Branch & Borrower Name Row -->
        <div class="grid formgrid m-0">
          <div class="col-12 sm:col-6 p-0 sm:pr-2 mb-3 sm:mb-0 flex flex-column gap-1.5">
            <label class="text-xs font-bold text-700 uppercase tracking-wide">
              Branch <span class="text-red-500">*</span>
            </label>
            <p-select 
              [(ngModel)]="form.branch" 
              [options]="branchOptions" 
              optionLabel="label" 
              optionValue="value" 
              placeholder="-- Select Branch --" 
              styleClass="w-full p-inputtext-sm">
            </p-select>
          </div>

          <div class="col-12 sm:col-6 p-0 sm:pl-2 flex flex-column gap-1.5">
            <label class="text-xs font-bold text-700 uppercase tracking-wide">
              Borrower Name <span class="text-red-500">*</span>
            </label>
            <input 
              pInputText 
              type="text" 
              [(ngModel)]="form.borrower_name" 
              placeholder="Full name or entity name" 
              class="w-full" />
          </div>
        </div>

        <!-- 4. Loan Type & Risk Level Row -->
        <div class="grid formgrid m-0">
          <div class="col-12 sm:col-6 p-0 sm:pr-2 mb-3 sm:mb-0 flex flex-column gap-1.5">
            <label class="text-xs font-bold text-700 uppercase tracking-wide">
              Loan Type <span class="text-red-500">*</span>
            </label>
            <p-select 
              [(ngModel)]="form.loan_type" 
              [options]="loanTypes" 
              optionLabel="label" 
              optionValue="value" 
              placeholder="-- Select Loan Type --" 
              styleClass="w-full p-inputtext-sm">
            </p-select>
          </div>

          <div class="col-12 sm:col-6 p-0 sm:pl-2 flex flex-column gap-1.5">
            <label class="text-xs font-bold text-700 uppercase tracking-wide">
              Risk Level <span class="text-red-500">*</span>
            </label>
            <p-select 
              [(ngModel)]="form.risk_level" 
              [options]="riskLevelOptions" 
              optionLabel="label" 
              optionValue="value" 
              placeholder="Select Risk Level" 
              styleClass="w-full p-inputtext-sm">
            </p-select>
          </div>
        </div>

        <!-- 5. Signals Observed -->
        <div class="flex flex-column gap-1.5">
          <label class="text-xs font-bold text-700 uppercase tracking-wide">
            Primary Risk Signal Observed <span class="text-red-500">*</span>
          </label>
          <p-select 
            [(ngModel)]="form.signal" 
            [options]="signalOptions" 
            optionLabel="label" 
            optionValue="value" 
            placeholder="-- Select primary signal --" 
            [filter]="true" 
            filterBy="label" 
            styleClass="w-full p-inputtext-sm">
          </p-select>
        </div>

        <!-- 6. RO Remarks -->
        <div class="flex flex-column gap-1.5">
          <label class="text-xs font-bold text-700 uppercase tracking-wide">
            RO Remarks & Justification <span class="text-red-500">*</span>
          </label>
          <textarea 
            pInputTextarea 
            rows="3" 
            [(ngModel)]="form.remarks" 
            placeholder="Provide detailed observation justifying manual risk flagging..." 
            class="w-full"></textarea>
        </div>

        <!-- Actions Row -->
        <div class="flex align-items-center justify-content-end gap-2 pt-3 border-top-1 surface-border mt-2">
          <button 
            pButton 
            pRipple 
            label="Clear" 
            icon="pi pi-refresh" 
            class="p-button-outlined p-button-secondary" 
            (click)="clear()">
          </button>
          <button 
            pButton 
            pRipple 
            [label]="isSubmitting ? 'Adding to Watch List...' : 'Add to Watch List'" 
            icon="pi pi-plus-circle" 
            class="p-button-danger" 
            (click)="submit()" 
            [disabled]="isSubmitting || !form.account_id || !form.borrower_name || !form.branch || !form.signal">
          </button>
        </div>

      </div>

    </div>
  `
})
export class ManualFlagComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  msg = inject(MessageService);

  loading = signal(true);
  isSubmitting = false;
  successMessage = signal('');
  errorMessage = signal('');
  lookingUp = false;
  lookupNotFound = false;
  cbsRecord: any = null;

  form: any = { account_id: '', borrower_name: '', branch: '', loan_type: '', signal: '', risk_level: 'High', remarks: '' };

  branches: any[] = [];
  branchOptions: any[] = [];
  loanTypes: any[] = [];
  signalOptions: any[] = [];
  riskLevelOptions = [
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' }
  ];

  ngOnInit() {
    this.ewsApi.getBranches().subscribe((b: any) => {
      this.branches = b || [];
      this.branchOptions = (b || []).map((br: any) => ({ label: br.name, value: br.id }));
      
      this.ewsApi.getLoanTypes().subscribe((lt: any) => {
        this.loanTypes = (lt || []).map((l: any) => ({ label: l.name || l, value: l.name || l }));
        
        this.ewsApi.getSignals().subscribe((s: any) => {
          this.signalOptions = (s || []).map((sig: any) => ({ label: '#' + sig.number + ' - ' + sig.name, value: sig.name }));
          this.loading.set(false);
        });
      });
    });
  }

  lookupAccount() {
    if (!this.form.account_id || this.lookingUp) return;
    this.lookingUp = true;
    this.lookupNotFound = false;
    this.cbsRecord = null;

    this.ewsApi.getRawCbsDataByAccount(this.form.account_id).subscribe({
      next: (record: any) => {
        this.lookingUp = false;
        if (record) {
          this.cbsRecord = record;
          // Auto-fill form fields from CBS data
          this.form.borrower_name = record.long_name || this.form.borrower_name;
          if (record.branch_code) {
            const matchedBranch = this.branches.find((b: any) => b.code === record.branch_code);
            if (matchedBranch) {
              this.form.branch = matchedBranch.id;
            }
          }
          this.form.loan_type = record.scheme_desc || record.product_desc || this.form.loan_type;
          // Auto-assign risk level based on CBS data
          if (record.npa === 'Y') this.form.risk_level = 'High';
          else if (record.bank_cust_rating === 'SMA 2') this.form.risk_level = 'High';
          else if (record.bank_cust_rating === 'SMA 1' || record.bank_cust_rating === 'SMA 0') this.form.risk_level = 'Medium';
        } else {
          this.lookupNotFound = true;
        }
      },
      error: () => {
        this.lookingUp = false;
        this.lookupNotFound = true;
      }
    });
  }

  submit() {
    this.successMessage.set('');
    this.errorMessage.set('');
    if (!this.form.account_id || !this.form.borrower_name || !this.form.branch || !this.form.signal) {
      this.errorMessage.set('Please fill all required fields.');
      return;
    }
    this.isSubmitting = true;

    const branchObj = this.branches.find((b: any) => b.id == this.form.branch);
    const branchName = branchObj ? branchObj.name : 'Unknown Branch';

    const payload = {
      ...this.form,
      branch: branchName,
      branch_id: parseInt(this.form.branch),
      signal_name: this.form.signal,
      source: 'Manual',
      added_by: 'Risk Officer'
    };

    this.ewsApi.addToWatchList(payload).subscribe({
      next: () => {
        this.successMessage.set('Account ' + this.form.account_id + ' added to watch list successfully.');
        this.msg.add({ severity: 'success', summary: 'Success', detail: 'Account added to watch list' });
        this.isSubmitting = false;
        this.clear();
      },
      error: () => {
        this.errorMessage.set('Failed to add account ' + this.form.account_id + ' to watch list.');
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to add account' });
        this.isSubmitting = false;
      },
    });
  }

  clear() { 
    this.form = { account_id: '', borrower_name: '', branch: '', loan_type: '', signal: '', risk_level: 'High', remarks: '' };
    this.cbsRecord = null;
    this.lookupNotFound = false;
  }
}
