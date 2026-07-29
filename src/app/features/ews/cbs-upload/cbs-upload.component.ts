import { Component, OnInit, inject, signal, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { EwsApiService } from '../services/ews-api.service';
import { TableComponent, TableColumn } from '../../../shared/components/table/table.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-cbs-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    ButtonModule,
    TooltipModule,
    TableComponent
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>

    <!-- Upload Card Panel -->
    <div class="card p-4 mb-4">
      <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom-1 surface-border">
        <div>
          <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">CBS Data Upload</h5>
          <p class="m-0 mt-1 text-sm text-gray-500">Upload CBS / branch Excel dumps (.xlsx, .xls, .csv) to process automated EWS risk signals.</p>
        </div>
        <button 
          pButton 
          pRipple 
          label="Truncate Database" 
          icon="pi pi-trash" 
          class="p-button-danger p-button-outlined" 
          (click)="clearDatabase()" 
          [disabled]="isClearing">
        </button>
      </div>

      <input type="file" #fileInput (change)="onFileSelect($event)" accept=".xlsx, .xls, .csv" style="display:none" />
      <div class="ews-upload-zone" (click)="pickFile()">
        <div class="upload-icon mb-2">
          <i class="pi pi-file-excel text-4xl" style="color: #107c41;"></i>
        </div>
        <div class="text-lg font-bold text-900 mb-1" style="color: var(--text-color, #102a43);">
          Drop your Excel / CSV file here or click to browse
        </div>
        <div class="text-xs text-600 mb-3">
          Supports CBS LOAN DUMP format (.xlsx, .xls, .csv) &middot; max 10MB
        </div>
        <button 
          pButton 
          pRipple 
          [label]="isUploading ? 'Uploading...' : 'Choose File'" 
          [icon]="isUploading ? 'pi pi-spin pi-spinner' : 'pi pi-upload'" 
          class="p-button-primary" 
          [disabled]="isUploading">
        </button>
      </div>
    </div>

    <!-- Upload Results Panel -->
    <div class="card p-4">
      <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom-1 surface-border">
        <div>
          <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">
            {{ lastUpload ? 'Last Upload Results — ' + (lastUpload.uploaded_at | date:'medium') : 'Upload Results' }}
          </h5>
          <p class="m-0 mt-1 text-sm text-gray-500" *ngIf="lastUpload">
            Processed {{ lastUpload.total_rows || 0 }} rows &middot; {{ lastUpload.new_flagged || 0 }} new flagged &middot; {{ lastUpload.updated || 0 }} updated
          </p>
        </div>
        <div *ngIf="lastUpload" class="flex align-items-center gap-2">
          <span class="px-3 py-1 font-bold text-xs border-round bg-red-100 text-red-700">
            {{ lastUpload.new_flagged }} New Flagged
          </span>
          <span class="px-3 py-1 font-bold text-xs border-round bg-blue-100 text-blue-700">
            {{ lastUpload.updated }} Updated
          </span>
        </div>
      </div>

      <app-table
        [data]="lastResults"
        [columns]="tableColumns"
        [loading]="isUploading"
        [showAddButton]="false"
        [showRefreshButton]="true"
        [showExportButton]="true"
        [paginator]="true"
        [rows]="10"
        (onRefresh)="loadLastUpload()"
      ></app-table>
    </div>
  `,
  styles: [`
    .ews-upload-zone {
      border: 2px dashed var(--surface-border, #cbd5e1);
      border-radius: 12px;
      padding: 2.5rem 1.5rem;
      text-align: center;
      cursor: pointer;
      background: var(--surface-card, #ffffff);
      transition: all 0.2s ease-in-out;

      &:hover {
        border-color: var(--primary-color, #3f51b5);
        background: rgba(63, 81, 181, 0.04);
      }
    }
  `]
})
export class CbsUploadComponent implements OnInit {
  private ewsApi = inject(EwsApiService);
  private msg = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('fileInput') fileInput!: ElementRef;

  isUploading = false;
  isClearing = false;
  lastUpload: any = null;
  lastResults: any[] = [];
  branchesMap = new Map<string, string>();

  tableColumns: TableColumn[] = [
    { field: 'account_id', header: 'ACC NO', sortable: true, width: '160px' },
    { field: 'borrower_name', header: 'BORROWER', sortable: true },
    { field: 'branch', header: 'BRANCH', sortable: true, width: '180px' },
    { field: 'signal_name', header: 'SIGNAL FIRED', sortable: true },
    { field: 'value', header: 'RULES VIOLATED' },
    { field: 'action', header: 'ACTION TAKEN', sortable: true, type: 'badge', width: '160px' }
  ];

  ngOnInit() {
    this.ewsApi.getBranches().subscribe({
      next: (branches: any[]) => {
        (branches || []).forEach(b => {
          if (b.code) this.branchesMap.set(String(b.code), b.name);
          if (b.id) this.branchesMap.set(String(b.id), b.name);
          if (b.name) this.branchesMap.set(b.name, b.name);
        });
        this.loadLastUpload();
      },
      error: () => this.loadLastUpload()
    });
  }

  clearDatabase() {
    if (!confirm('Are you sure you want to truncate the database? All transactional data will be wiped out!')) return;
    this.isClearing = true;
    this.ewsApi.clearLoanData().subscribe({
      next: (res: any) => {
        this.msg.add({ severity: 'success', summary: 'Truncated', detail: res.message || 'Database truncated' });
        this.isClearing = false;
        this.lastUpload = null;
        this.lastResults = [];
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed to truncate database' });
        this.isClearing = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadLastUpload() {
    this.ewsApi.getLastUpload().subscribe((up: any) => {
      setTimeout(() => {
        this.lastUpload = up;
        this.cdr.detectChanges();
        if (up?.id) {
          this.ewsApi.getUploadResults(up.id).subscribe((res: any) => {
            this.lastResults = (res || []).map((item: any) => ({
              ...item,
              branch: this.branchesMap.get(String(item.branch)) || this.branchesMap.get(String(item.branch_code)) || item.branch || '—'
            }));
            this.cdr.detectChanges();
          });
        }
      }, 0);
    });
  }

  pickFile() {
    this.fileInput.nativeElement.click();
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploading = true;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });

      const sheetName = workbook.SheetNames.includes('LOAN DUMP')
        ? 'LOAN DUMP'
        : workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rawArr: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      let rows: any[];
      if (rawArr[3] && rawArr[3].includes('accountid')) {
        const headers: string[] = rawArr[3].map((h: any) => String(h ?? '').trim());
        rows = rawArr.slice(4).map((rowArr: any[]) => {
          const obj: any = {};
          headers.forEach((h, i) => { if (h) obj[h] = rowArr[i] ?? null; });
          return obj;
        }).filter((r: any) => r['accountid'] || r['Accountno']);
      } else {
        const rawRows = XLSX.utils.sheet_to_json(worksheet);
        rows = rawRows.map((r: any) => {
          const obj: any = {};
          Object.keys(r).forEach(k => {
            obj[String(k).trim()] = r[k];
          });
          return obj;
        });
      }

      if (!rows || rows.length === 0) {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'File is empty or unrecognised format.' });
        this.isUploading = false;
        return;
      }

      this.msg.add({ severity: 'info', summary: 'Processing', detail: `Sending ${rows.length} rows to server...` });

      this.ewsApi.processUpload(rows, 'System Admin').subscribe({
        next: (res: any) => {
          this.msg.add({ severity: 'success', summary: 'Upload Complete', detail: `Processed ${res.total} rows. ${res.new_flagged} new flagged, ${res.updated} updated.` });
          this.isUploading = false;
          this.loadLastUpload();
        },
        error: (err: any) => {
          this.msg.add({ severity: 'error', summary: 'Upload Failed', detail: err.error?.message || 'Server error' });
          this.isUploading = false;
        }
      });
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  }
}
