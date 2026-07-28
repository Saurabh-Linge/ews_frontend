import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EwsApiService } from '../services/ews-api.service';
import { HeroComponent } from '../../../shared/components/ui/hero/hero';

@Component({
  selector: 'app-manual-flag',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4">
      <h2 class="m-0 text-2xl font-bold text-gray-900" style="color: var(--text-color, #0f172a); font-size: 1.5rem; font-weight: 800;">Manual Flag</h2>
      <p class="mt-1 text-sm text-gray-500" style="color: var(--text-color-secondary, #64748b); font-size: 0.875rem; margin-top: 0.25rem;">Manually add an account to the watch list with custom risk signals.</p>
    </div>
    @if (loading()) {
      <div class="loader-overlay"><div class="spinner"></div></div>
    }

    <div class="card" style="max-width:560px">
      <div class="card-header">
        <h3>Manually flag an account</h3>
        <p style="font-size:12px;color:var(--muted);margin-top:4px">Enter account number to auto-fill details from CBS data</p>
      </div>
      <div class="card-body">
        
        @if (successMessage()) {
          <div style="background: var(--green-light); color: var(--green); padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px; font-weight: 500;">
            <i class="pi pi-check-circle" style="margin-right: 6px;"></i> {{ successMessage() }}
          </div>
        }
        @if (errorMessage()) {
          <div style="background: #FEE2E2; color: #DC2626; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px; font-weight: 500;">
            <i class="pi pi-exclamation-triangle" style="margin-right: 6px;"></i> {{ errorMessage() }}
          </div>
        }

        <!-- Account number with lookup -->
        <div class="fg">
          <label class="fl">Account number <span class="req">*</span></label>
          <div style="display:flex;gap:8px">
            <input type="text" [(ngModel)]="form.account_id" placeholder="Enter account number" class="w-full"
                   (blur)="lookupAccount()" (keyup.enter)="lookupAccount()">
            <button class="btn btn-primary" style="white-space:nowrap;padding:8px 14px" (click)="lookupAccount()" [disabled]="lookingUp">
              <i class="pi pi-search"></i> Fetch
            </button>
          </div>
          @if (cbsRecord) {
            <div style="font-size:11px;color:var(--green);margin-top:4px;display:flex;align-items:center;gap:4px">
              <i class="pi pi-check-circle"></i> CBS data found — details auto-filled
            </div>
          }
          @if (lookupNotFound) {
            <div style="font-size:11px;color:var(--amber);margin-top:4px">
              No CBS data found. Please fill details manually.
            </div>
          }
        </div>

        <div class="fg2">
          <div>
            <label class="fl">Branch <span class="req">*</span></label>
            <select [(ngModel)]="form.branch" class="w-full">
              <option value="">-- Select --</option>
              @for (b of branches; track b.id) {
                <option [value]="b.id">{{ b.name }}</option>
              }
            </select>
          </div>
          <div>
            <label class="fl">Borrower Name <span class="req">*</span></label>
            <input type="text" [(ngModel)]="form.borrower_name" placeholder="Full name or entity name" class="w-full">
          </div>
        </div>

        <div class="fg2">
          <div>
            <label class="fl">Loan type <span class="req">*</span></label>
            <select [(ngModel)]="form.loan_type" class="w-full">
              <option value="">-- Select --</option>
              @for (lt of loanTypes; track lt.value) {
                <option [value]="lt.value">{{ lt.label }}</option>
              }
            </select>
          </div>
          <div>
            <label class="fl">Risk level <span class="req">*</span></label>
            <select [(ngModel)]="form.risk_level" class="w-full">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>

            </select>
          </div>
        </div>

        <!-- CBS details panel -->
        @if (cbsRecord) {
          <div class="cbs-panel">
            <div class="cbs-panel-title"><i class="pi pi-database"></i> CBS data snapshot</div>
            <div class="cbs-grid">
              <div class="cbs-item"><span class="cbs-lbl">Scheme</span><span class="cbs-val">{{ cbsRecord.scheme_desc || '—' }}</span></div>
              <div class="cbs-item"><span class="cbs-lbl">Principal Outstanding</span><span class="cbs-val">{{ cbsRecord.principal_outstanding | number:'1.0-0' }}</span></div>
              <div class="cbs-item"><span class="cbs-lbl">Balance</span><span class="cbs-val" [style.color]="(cbsRecord.balance || 0) < 0 ? 'var(--red)' : 'var(--green)'">{{ cbsRecord.balance | number:'1.0-0' }}</span></div>
              <div class="cbs-item"><span class="cbs-lbl">Int. Rate</span><span class="cbs-val">{{ cbsRecord.int_rate }}%</span></div>
              <div class="cbs-item"><span class="cbs-lbl">Rating</span><span class="cbs-val">{{ cbsRecord.bank_cust_rating || '—' }}</span></div>
              <div class="cbs-item"><span class="cbs-lbl">NPA</span><span class="cbs-val" [style.color]="cbsRecord.npa === 'Y' ? 'var(--red)' : 'var(--green)'">{{ cbsRecord.npa === 'Y' ? 'YES' : 'NO' }}</span></div>
              <div class="cbs-item"><span class="cbs-lbl">Exp. Date</span><span class="cbs-val">{{ cbsRecord.exp_date | date:'dd MMM yyyy' }}</span></div>
              <div class="cbs-item"><span class="cbs-lbl">Security Amount</span><span class="cbs-val">{{ cbsRecord.security_amount | number:'1.0-0' }}</span></div>
            </div>
          </div>
        }
        
        <div class="fg">
          <label class="fl">Signals observed <span class="req">*</span></label>
          <select [(ngModel)]="form.signal" class="w-full">
            <option value="">-- Select primary signal --</option>
            @for (sig of signalOptions; track sig.value) {
              <option [value]="sig.value">{{ sig.label }}</option>
            }
          </select>
        </div>

        <div class="fg">
          <label class="fl">RO remarks <span class="req">*</span></label>
          <textarea [(ngModel)]="form.remarks" rows="3" placeholder="Why are you flagging this account?" class="w-full"></textarea>
        </div>

        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn btn-primary" (click)="submit()">Add to watch list</button>
          <button class="btn" (click)="clear()">Clear</button>
        </div>
      </div>
    </div>
  `,
  styles: [`.fg { margin-bottom: 14px; } .fg2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; } .fl { font-size: 12px; color: #6B7280; font-weight: 600; margin-bottom: 5px; display: block; } .req { color: #DC2626; } select, input, textarea { padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 13px; } .w-full { width: 100%; box-sizing: border-box; } .cbs-panel { background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 12px; margin-bottom: 14px; } .cbs-panel-title { font-size: 12px; font-weight: 700; color: #0369A1; margin-bottom: 10px; display:flex;align-items:center;gap:6px; } .cbs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .cbs-item { display:flex;flex-direction:column;gap:2px; } .cbs-lbl { font-size: 10px; color: #6B7280; font-weight: 600; text-transform: uppercase; } .cbs-val { font-size: 13px; font-weight: 600; color: #1E293B; }`],
})
export class ManualFlagComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  loading = signal(true);
  successMessage = signal('');
  errorMessage = signal('');
  lookingUp = false;
  lookupNotFound = false;
  cbsRecord: any = null;

  form: any = { account_id: '', borrower_name: '', branch: '', loan_type: '', signal: '', risk_level: 'High', remarks: '' };

  branches: any[] = [];
  loanTypes: any[] = [];
  signalOptions: any[] = [];

  ngOnInit() {
    this.ewsApi.getBranches().subscribe((b: any) => {
      this.branches = b;
      this.ewsApi.getLoanTypes().subscribe((lt: any) => {
        this.loanTypes = lt.map((l: any) => ({ label: l.name || l, value: l.name || l }));
        this.ewsApi.getSignals().subscribe((s: any) => {
          this.signalOptions = s.map((sig: any) => ({ label: '#' + sig.number + ' - ' + sig.name, value: sig.name }));
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
          this.form.loan_type     = record.scheme_desc || record.product_desc || this.form.loan_type;
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
    this.loading.set(true);

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
        this.successMessage.set('Account ' + this.form.account_id + ' added to watch list.');
        this.loading.set(false);
        this.clear();
      },
      error: () => {
        this.errorMessage.set('Failed to add account ' + this.form.account_id + ' to watch list.');
        this.loading.set(false);
      },
    });
  }

  clear() { 
    this.form = { account_id: '', borrower_name: '', branch: '', loan_type: '', signal: '', risk_level: 'High', remarks: '' };
    this.cbsRecord = null;
    this.lookupNotFound = false;
  }
}
