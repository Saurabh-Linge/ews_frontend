import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { EwsApiService } from '../services/ews-api.service';
import { EwsStateService } from '../services/ews-state.service';
import { TableComponent, TableColumn, TableAction } from '../../../shared/components/table/table.component';
import { SelectFieldComponent } from '../../../shared/components/form/select-field/select-field.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-all-accounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DrawerModule,
    InputTextModule,
    FloatLabelModule,
    ToastModule,
    ButtonModule,
    TableComponent,
    SelectFieldComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="card p-4">
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold" style="color: var(--text-color, #102a43); font-weight: 700;">All Accounts</h5>
        <button pButton pRipple label="Export" icon="pi pi-download" class="p-button-help p-button-outlined" (click)="downloadExcel()"></button>
      </div>

      <app-table
        [data]="accounts()"
        [columns]="tableColumns"
        [loading]="loading()"
        [actions]="tableActions"
        [totalRecords]="totalRecords()"
        [showRefreshButton]="true"
        [showAddButton]="false"
        [paginator]="true"
        [rows]="50"
        (onRefresh)="loadData()"
      >
        <div toolbar-actions class="flex align-items-center gap-3 flex-wrap">
          <div style="width: 220px;">
            <app-select-field
              [field]="filterBranch"
              [options]="branchOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="All Branches"
              [hideLabel]="true"
              (onChange)="onFilterChange()"
            ></app-select-field>
          </div>
          <div style="width: 200px;">
            <app-select-field
              [field]="filterFlagged"
              [options]="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Accounts"
              [hideLabel]="true"
              (onChange)="onFilterChange()"
            ></app-select-field>
          </div>
        </div>
      </app-table>
    </div>

    <!-- Slide-over Drawer matching Compliance Pro Circular Master Layout -->
    <p-drawer
      [visible]="showDrawer()"
      (visibleChange)="showDrawer.set($event)"
      (onHide)="hideDrawer()"
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
              <i class="pi pi-user-edit"></i>
            </span>
            <div>
              <div class="text-900 font-semibold text-xl">Edit Account Details</div>
              <div class="text-600 text-sm mt-1">Update all account parameters & borrower information</div>
            </div>
          </div>
          <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded" (click)="hideDrawer()"></button>
        </div>
      </ng-template>

      <ng-template pTemplate="content">
        <div class="drawer-content-shell" *ngIf="showDrawer()">
          <!-- Section 1: Identifiers -->
          <section class="drawer-section">
            <div class="section-heading">
              <span class="section-kicker">Account & Borrower Identifiers</span>
              <span class="section-line"></span>
            </div>
            <div class="grid formgrid p-fluid drawer-form-grid">
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="acc_no" type="text" [(ngModel)]="editForm.account_no" class="w-full" />
                  <label for="acc_no">Account Number <span class="text-red-500">*</span></label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="acc_id" type="text" [(ngModel)]="editForm.account_id" class="w-full" />
                  <label for="acc_id">Account ID</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="cust_no" type="text" [(ngModel)]="editForm.customer_no" class="w-full" />
                  <label for="cust_no">Customer Number</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="long_name" type="text" [(ngModel)]="editForm.long_name" class="w-full" />
                  <label for="long_name">Borrower Full Name <span class="text-red-500">*</span></label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="br_code" type="text" [(ngModel)]="editForm.branch_code" class="w-full" />
                  <label for="br_code">Branch Code</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="prod_desc" type="text" [(ngModel)]="editForm.product_desc" class="w-full" />
                  <label for="prod_desc">Product Code / Desc</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="scheme_desc" type="text" [(ngModel)]="editForm.scheme_desc" class="w-full" />
                  <label for="scheme_desc">Scheme Code / Desc</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="mem_type" type="text" [(ngModel)]="editForm.member_type" class="w-full" />
                  <label for="mem_type">Member Type / No</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="pan_no" type="text" [(ngModel)]="editForm.pan_no" class="w-full" />
                  <label for="pan_no">PAN Number</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="gender" type="text" [(ngModel)]="editForm.gender" class="w-full" />
                  <label for="gender">Gender</label>
                </p-floatlabel>
              </div>
            </div>
          </section>

          <!-- Section 2: Financial Limits & Balances -->
          <section class="drawer-section">
            <div class="section-heading">
              <span class="section-kicker">Financial Limits & Balances</span>
              <span class="section-line"></span>
            </div>
            <div class="grid formgrid p-fluid drawer-form-grid">
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="sanc_lim" type="number" [(ngModel)]="editForm.tot_sanc_limit" class="w-full" />
                  <label for="sanc_lim">Sanctioned Limit (₹)</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="disb_amt" type="number" [(ngModel)]="editForm.disbursement_amount" class="w-full" />
                  <label for="disb_amt">Disbursement Amount (₹)</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="bal" type="number" [(ngModel)]="editForm.balance" class="w-full" />
                  <label for="bal">Current Balance (₹)</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="prin_os" type="number" [(ngModel)]="editForm.principal_outstanding" class="w-full" />
                  <label for="prin_os">Principal Outstanding (₹)</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="int_os" type="number" [(ngModel)]="editForm.interest_outstanding" class="w-full" />
                  <label for="int_os">Interest Outstanding (₹)</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="chg_os" type="number" [(ngModel)]="editForm.charges_os" class="w-full" />
                  <label for="chg_os">Charges Outstanding (₹)</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="int_rate" type="number" [(ngModel)]="editForm.int_rate" class="w-full" />
                  <label for="int_rate">Interest Rate (%)</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="inst_amt" type="number" [(ngModel)]="editForm.instal_amt" class="w-full" />
                  <label for="inst_amt">Installment Amount (₹)</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="sec_amt" type="number" [(ngModel)]="editForm.security_amount" class="w-full" />
                  <label for="sec_amt">Security Amount (₹)</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="cibil" type="number" [(ngModel)]="editForm.cibil_score" class="w-full" />
                  <label for="cibil">CIBIL Score</label>
                </p-floatlabel>
              </div>
            </div>
          </section>

          <!-- Section 3: Important Dates -->
          <section class="drawer-section">
            <div class="section-heading">
              <span class="section-kicker">Key Account Dates</span>
              <span class="section-line"></span>
            </div>
            <div class="grid formgrid p-fluid drawer-form-grid">
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="open_dt" type="text" [(ngModel)]="editForm.account_open_date" class="w-full" />
                  <label for="open_dt">Account Open Date</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="sanc_dt" type="text" [(ngModel)]="editForm.sanc_date" class="w-full" />
                  <label for="sanc_dt">Sanction Date</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="disb_dt" type="text" [(ngModel)]="editForm.disbursement_date" class="w-full" />
                  <label for="disb_dt">Disbursement Date</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="exp_dt" type="text" [(ngModel)]="editForm.exp_date" class="w-full" />
                  <label for="exp_dt">Expiry Date</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="npa_dt" type="text" [(ngModel)]="editForm.npa_date" class="w-full" />
                  <label for="npa_dt">NPA Date</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="insp_dt" type="text" [(ngModel)]="editForm.insp_date" class="w-full" />
                  <label for="insp_dt">Inspection Date</label>
                </p-floatlabel>
              </div>
            </div>
          </section>

          <!-- Section 4: Classification & NPA Status -->
          <section class="drawer-section">
            <div class="section-heading">
              <span class="section-kicker">Classification & NPA Category</span>
              <span class="section-line"></span>
            </div>
            <div class="grid formgrid p-fluid drawer-form-grid">
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="npa_cat" type="text" [(ngModel)]="editForm.npa" class="w-full" />
                  <label for="npa_cat">NPA Status</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="prio_yn" type="text" [(ngModel)]="editForm.priority_sector_yn" class="w-full" />
                  <label for="prio_yn">Priority Sector (Y/N)</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="prio_cat" type="text" [(ngModel)]="editForm.priority_sector_category" class="w-full" />
                  <label for="prio_cat">Priority Sector Category</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="weak_yn" type="text" [(ngModel)]="editForm.weaker_sector_yn" class="w-full" />
                  <label for="weak_yn">Weaker Sector (Y/N)</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="purpose" type="text" [(ngModel)]="editForm.purpose_code" class="w-full" />
                  <label for="purpose">Purpose Description</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="enduse" type="text" [(ngModel)]="editForm.enduse" class="w-full" />
                  <label for="enduse">End Use</label>
                </p-floatlabel>
              </div>
            </div>
          </section>

          <!-- Section 5: Ratings & Additional Info -->
          <section class="drawer-section">
            <div class="section-heading">
              <span class="section-kicker">Ratings, Security & Address</span>
              <span class="section-line"></span>
            </div>
            <div class="grid formgrid p-fluid drawer-form-grid">
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="cust_rat" type="text" [(ngModel)]="editForm.bank_cust_rating" class="w-full" />
                  <label for="cust_rat">Bank Customer Rating</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="cred_rat" type="text" [(ngModel)]="editForm.credit_rating" class="w-full" />
                  <label for="cred_rat">Credit Rating</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="ind_type" type="text" [(ngModel)]="editForm.industry_type" class="w-full" />
                  <label for="ind_type">Industry Type</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="sec_type" type="text" [(ngModel)]="editForm.security_type" class="w-full" />
                  <label for="sec_type">Security Type</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="udyam" type="text" [(ngModel)]="editForm.udyam_reg_number" class="w-full" />
                  <label for="udyam">Udyam Reg Number</label>
                </p-floatlabel>
              </div>
              <div class="field col-12 md:col-6">
                <p-floatlabel variant="on">
                  <input pInputText id="ckyc" type="text" [(ngModel)]="editForm.ckyc_no" class="w-full" />
                  <label for="ckyc">CKYC Number</label>
                </p-floatlabel>
              </div>
              <div class="field col-12">
                <p-floatlabel variant="on">
                  <input pInputText id="addr" type="text" [(ngModel)]="editForm.address1" class="w-full" />
                  <label for="addr">Borrower Address</label>
                </p-floatlabel>
              </div>
            </div>
          </section>
        </div>
      </ng-template>

      <ng-template pTemplate="footer">
        <div class="drawer-footer-row">
          <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-outlined p-button-secondary" (click)="hideDrawer()"></button>
          <button pButton pRipple [label]="saving() ? 'Saving...' : 'Save Account Details'" icon="pi pi-check" class="p-button-primary" (click)="saveAccount()" [disabled]="saving()"></button>
        </div>
      </ng-template>
    </p-drawer>
  `
})
export class AllAccountsComponent implements OnInit {
  private ewsApi = inject(EwsApiService);
  private msg = inject(MessageService);
  ewsState = inject(EwsStateService);
  private router = inject(Router);

  accounts = signal<any[]>([]);
  totalRecords = signal(0);
  loading = signal(true);
  saving = signal(false);
  showDrawer = signal(false);

  editForm: any = {};

  filterBranch = signal<string | null>(null);
  filterFlagged = signal<string | null>('all');

  branchOptions = signal<{ label: string; value: string | null }[]>([{ label: 'All Branches', value: null }]);
  statusOptions = [
    { label: 'All Accounts', value: 'all' },
    { label: 'Flagged in Watch List', value: 'flagged' },
    { label: 'Not Flagged', value: 'normal' }
  ];

  tableColumns: TableColumn[] = [
    { field: 'account_no', header: 'ACC NO', sortable: true },
    { field: 'long_name', header: 'BORROWER', sortable: true },
    { field: 'branch_code', header: 'BRANCH', sortable: true },
    { field: 'scheme_desc', header: 'LOAN TYPE', sortable: true },
    { field: 'tot_sanc_limit', header: 'SANCTIONED', sortable: true, type: 'currency', align: 'right' },
    { field: 'balance', header: 'BALANCE', sortable: true, type: 'currency', align: 'right' },
    { field: 'principal_outstanding', header: 'OUTSTANDING', sortable: true, type: 'currency', align: 'right' },
    { field: 'npa', header: 'NPA', sortable: true, align: 'center' },
    { field: 'watch_list_status', header: 'WATCH STATUS', sortable: true, type: 'status' }
  ];

  tableActions: TableAction[] = [
    { label: 'View', icon: 'pi pi-eye', command: (row) => this.viewAccount(row) },
    { label: 'Edit', icon: 'pi pi-pencil', command: (row) => this.openEditDrawer(row) }
  ];

  ngOnInit() {
    this.ewsApi.getBranches().subscribe({
      next: (data) => {
        const opts = [{ label: 'All Branches', value: null }, ...data.map(b => ({ label: `${b.name} (${b.code})`, value: b.code }))];
        this.branchOptions.set(opts);
      }
    });
    this.loadData();
  }

  onFilterChange() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    const params: any = { page: 1, limit: 50 };
    if (this.filterBranch()) params.branch = this.filterBranch();
    if (this.filterFlagged() === 'flagged') params.flagged = 'true';
    if (this.filterFlagged() === 'normal') params.flagged = 'false';

    this.ewsApi.getAllAccounts(params).subscribe({
      next: (res) => {
        this.accounts.set(res.data || []);
        this.totalRecords.set(res.total || 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  viewAccount(acc: any) {
    if (acc.watch_list_id) {
      this.router.navigate(['/ews/account', acc.watch_list_id]);
    } else {
      this.router.navigate(['/ews/account', acc.id], { queryParams: { type: 'dump' } });
    }
  }

  openEditDrawer(acc: any) {
    // Deep copy all fields into editForm
    this.editForm = JSON.parse(JSON.stringify(acc));
    this.showDrawer.set(true);
  }

  hideDrawer() {
    this.showDrawer.set(false);
  }

  saveAccount() {
    const accountId = this.editForm.account_id || this.editForm.account_no;
    if (!accountId) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'Account ID is missing' });
      return;
    }

    this.saving.set(true);

    // Exclude metadata/system auto fields that shouldn't be updated
    const { id, uploaded_at, upload_id, watch_list_id, watch_list_status, watch_list_risk_level, watch_list_added_at, signals_data, ...payload } = this.editForm;

    this.ewsApi.updateAccountData(accountId, payload).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Success', detail: 'Account details updated successfully' });
        this.saving.set(false);
        this.hideDrawer();
        this.loadData();
      },
      error: (err) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to update account details' });
        this.saving.set(false);
      }
    });
  }

  downloadExcel() {
    const params: any = { page: 1, limit: -1 };
    if (this.filterBranch()) params.branch = this.filterBranch();
    if (this.filterFlagged() === 'flagged') params.flagged = 'true';
    if (this.filterFlagged() === 'normal') params.flagged = 'false';

    this.ewsApi.getAllAccounts(params).subscribe({
      next: (res) => {
        const data = res.data || [];
        const exportData = data.map((acc: any) => ({
          'Account No': acc.account_no || acc.account_id || '',
          'Borrower Name': acc.long_name || '',
          'Branch Code': acc.branch_code || '',
          'Scheme': acc.scheme_desc || '',
          'Sanction Limit': acc.tot_sanc_limit || 0,
          'Balance': acc.balance || 0,
          'Principal Outstanding': acc.principal_outstanding || 0,
          'NPA': acc.npa || '',
          'Watch List Status': acc.watch_list_status || 'Not Listed'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'All Accounts');
        XLSX.writeFile(wb, 'EWS_All_Accounts_Export.xlsx');
      },
      error: () => alert('Failed to download accounts list')
    });
  }
}


