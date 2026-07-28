import { Component, OnInit, inject, signal, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule, Table } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { EwsApiService } from '../services/ews-api.service';
import * as XLSX from 'xlsx';
import { HeroComponent } from '../../../shared/components/ui/hero/hero';

@Component({
  selector: 'app-cbs-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    TableModule,
    InputTextModule,
    ButtonModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
    HeroComponent,
  ],
  providers: [MessageService],
  template: `
    <div class="mb-4">
      <h2 class="m-0 text-2xl font-bold text-gray-900" style="color: var(--text-color, #0f172a); font-size: 1.5rem; font-weight: 800;">CBS Data Upload</h2>
      <p class="mt-1 text-sm text-gray-500" style="color: var(--text-color-secondary, #64748b); font-size: 0.875rem; margin-top: 0.25rem;">Upload CBS / branch Excel dumps to process automated EWS risk signals.</p>
    </div>
    <p-toast></p-toast>

    <div class="card p-4 mb-4">
      <div class="flex align-items-center justify-content-between mb-4">
        <div>
          <h3 class="m-0 text-xl font-bold" style="color: var(--text-color);">Upload CBS / Branch File</h3>
          <span style="font-size: 0.85rem; color: var(--text-color-secondary);">Upload .xlsx, .xls, or .csv data files</span>
        </div>
        <button pButton pRipple label="Truncate Database" icon="pi pi-trash" class="p-button-danger p-button-outlined" (click)="clearDatabase()" [disabled]="isClearing"></button>
      </div>

      <input type="file" #fileInput (change)="onFileSelect($event)" accept=".xlsx, .xls, .csv" style="display:none" />
      <div class="ews-upload-zone" (click)="pickFile()">
        <div class="upload-icon"><i class="pi pi-file-excel" style="font-size: 2.5rem; color: #107c41; margin-bottom: 0.5rem;"></i></div>
        <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.25rem;">Drop your Excel / CSV file here or click to browse</div>
        <div style="font-size: 0.8rem; color: var(--text-color-secondary); margin-bottom: 1.25rem;">Supports CBS LOAN DUMP format (.xlsx, .xls, .csv) &middot; max 10MB</div>
        <button pButton pRipple [label]="isUploading ? 'Uploading...' : 'Choose File'" [icon]="isUploading ? 'pi pi-spin pi-spinner' : 'pi pi-upload'" class="p-button-primary" [disabled]="isUploading"></button>
      </div>
    </div>

    <!-- Upload Results Panel -->
    <div class="card p-4">
      <div class="flex align-items-center justify-content-between mb-4">
        <div>
          <h3 class="m-0 text-xl font-bold" style="color: var(--text-color);">
            {{ lastUpload ? 'Last Upload Results — ' + (lastUpload.uploaded_at | date:'medium') : 'Upload Results' }}
          </h3>
          <span style="font-size: 0.85rem; color: var(--text-color-secondary);" *ngIf="lastUpload">
            Processed {{ lastUpload.total_rows || 0 }} rows &middot; {{ lastUpload.new_flagged || 0 }} new flagged &middot; {{ lastUpload.updated || 0 }} updated
          </span>
        </div>
        <span class="border-round bg-amber-100 text-amber-700" *ngIf="lastUpload" style="font-weight: 700; padding: 4px 12px; border-radius: 99px;">
          {{ lastUpload.new_flagged }} New Flagged &middot; {{ lastUpload.updated }} Updated
        </span>
      </div>

      <!-- Detached Table Control Toolbar -->
      <div class="table-toolbar" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.25rem;">
        <div class="table-toolbar-left" style="flex: 1; max-width: 320px;">
          <p-iconfield iconPosition="left" styleClass="w-full">
            <p-inputicon styleClass="pi pi-search" />
            <input
              #searchInput
              pInputText
              type="text"
              (input)="dt.filterGlobal($any($event.target).value, 'contains')"
              placeholder="Search (Ctrl+F)"
              class="w-full"
              style="height: 2.5rem;"
            />
          </p-iconfield>
        </div>
        <div class="table-toolbar-right" style="display: flex; gap: 0.5rem; align-items: center;">
          <button pButton pRipple icon="pi pi-refresh" class="p-button-secondary p-button-outlined" (click)="loadLastUpload()" pTooltip="Refresh Results" tooltipPosition="bottom" style="height: 2.5rem;"></button>
        </div>
      </div>

      <!-- Table Container -->
      <div class="table-container surface-card border-round-xl shadow-sm border-1 surface-border p-2">
        <p-table #dt [value]="lastResults" styleClass="p-datatable-sm p-datatable-striped" [paginator]="true" [rows]="10" [globalFilterFields]="['account_id', 'borrower_name', 'branch', 'signal_name', 'value', 'action']">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="account_id" style="text-transform: uppercase; font-size: 0.775rem; font-weight: 700;">ACC NO <p-sortIcon field="account_id"></p-sortIcon></th>
              <th pSortableColumn="borrower_name" style="text-transform: uppercase; font-size: 0.775rem; font-weight: 700;">BORROWER <p-sortIcon field="borrower_name"></p-sortIcon></th>
              <th pSortableColumn="branch" style="text-transform: uppercase; font-size: 0.775rem; font-weight: 700;">BRANCH <p-sortIcon field="branch"></p-sortIcon></th>
              <th pSortableColumn="signal_name" style="text-transform: uppercase; font-size: 0.775rem; font-weight: 700;">SIGNAL FIRED <p-sortIcon field="signal_name"></p-sortIcon></th>
              <th pSortableColumn="value" style="text-transform: uppercase; font-size: 0.775rem; font-weight: 700;">RULES VIOLATED</th>
              <th pSortableColumn="action" style="text-transform: uppercase; font-size: 0.775rem; font-weight: 700;">ACTION TAKEN <p-sortIcon field="action"></p-sortIcon></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-r>
            <tr>
              <td style="font-family: monospace; font-weight: 700; color: var(--text-color);">{{ r.account_id }}</td>
              <td style="font-weight: 600;">{{ r.borrower_name }}</td>
              <td>{{ r.branch }}</td>
              <td><div style="font-weight: 600; color: var(--text-color);">{{ r.signal_name || 'Signal #' + r.signal_id }}</div></td>
              <td><div *ngIf="r.value" style="font-size: 0.8rem; color: var(--text-color-secondary); line-height: 1.3; max-width: 280px">{{ r.value }}</div></td>
              <td>
                <span class="border-round" [ngClass]="getSeverityClass(r.action)" style="font-weight: 700; padding: 4px 10px; border-radius: 99px;">
                  {{ r.action }}
                </span>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-color-secondary);">No recent upload results or signals found.</td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>
  `,
  styles: [`
    .ews-upload-zone {
      border: 2px dashed var(--surface-border, #d9e2ec);
      border-radius: 12px;
      padding: 2.5rem;
      text-align: center;
      cursor: pointer;
      background: var(--surface-card, #ffffff);
      transition: all 0.2s ease-in-out;

      &:hover {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.04);
      }
    }
  `],
})
export class CbsUploadComponent implements OnInit {
  private ewsApi = inject(EwsApiService);
  private msg = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('dt') dt!: Table;

  isUploading = false;
  isClearing = false;
  lastUpload: any = null;
  lastResults: any[] = [];

  ngOnInit() {
    this.loadLastUpload();
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
            this.lastResults = res;
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

  getSeverityClass(action: string) {
    if (action.includes('New flagged') || action.includes('added to watch list')) return 'bg-red-100 text-red-700';
    if (action.includes('review')) return 'bg-amber-100 text-amber-700';
    if (action.includes('Updated')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  }
}
