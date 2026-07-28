import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { EwsApiService } from '../../services/ews-api.service';
import { TableComponent, TableColumn, TableAction } from '../../../../shared/components/table/table.component';

@Component({
  selector: 'app-branches-master',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DrawerModule,
    ToastModule,
    InputTextModule,
    ButtonModule,
    TableComponent
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    
    <div class="card">
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold" style="color: var(--text-color, #102a43); font-weight: 700;">Branch and Department Master</h5>
      </div>

      <app-table
        [data]="branches()"
        [columns]="tableColumns"
        [loading]="loading()"
        [actions]="tableActions"
        (onAdd)="openDrawer()"
        [showRefreshButton]="true"
        [paginator]="true"
        [rows]="10"
        (onRefresh)="loadBranches()"
      ></app-table>
    </div>

    <!-- Slide-over Drawer for Create / Edit Form -->
    <p-drawer
      [visible]="showDrawer()"
      (visibleChange)="showDrawer.set($event)"
      (onHide)="hideDrawer()"
      position="right"
      [style]="{ width: '550px', maxWidth: '96vw' }"
      [modal]="true"
      [dismissible]="true"
      [showCloseIcon]="false"
      styleClass="drawer-layout"
      appendTo="body"
    >
      <ng-template pTemplate="header">
        <div class="drawer-header-row">
          <div class="drawer-title-wrap">
            <span class="drawer-title-icon">
              <i class="pi pi-building"></i>
            </span>
            <div>
              <div class="text-900 font-semibold text-xl">{{ isEdit ? 'Edit Branch' : 'New Branch' }}</div>
              <div class="text-600 text-sm mt-1">Configure bank branch & department details</div>
            </div>
          </div>
          <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded" (click)="hideDrawer()"></button>
        </div>
      </ng-template>

      <ng-template pTemplate="content">
        <div class="drawer-content-shell">
          <section class="drawer-section">
            <div class="section-heading">
              <span class="section-kicker">Branch Information</span>
              <span class="section-line"></span>
            </div>
            <div class="grid formgrid p-fluid drawer-form-grid">
              <div class="field col-12">
                <label class="font-bold text-sm text-gray-700 mb-1 block">Branch Name <span class="text-red-500">*</span></label>
                <input pInputText type="text" [(ngModel)]="currentBranch.name" placeholder="Enter branch / department name" class="w-full" style="height: 2.5rem; border-radius: 8px;" />
              </div>
            </div>
          </section>
        </div>
      </ng-template>

      <ng-template pTemplate="footer">
        <div class="drawer-footer-row">
          <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-outlined p-button-secondary" (click)="hideDrawer()"></button>
          <button pButton pRipple [label]="saving() ? 'Saving...' : 'Save Branch'" icon="pi pi-check" class="p-button-primary" (click)="saveBranch()" [disabled]="saving()"></button>
        </div>
      </ng-template>
    </p-drawer>
  `
})
export class BranchesMasterComponent implements OnInit {
  private api = inject(EwsApiService);
  private msg = inject(MessageService);

  branches = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);

  showDrawer = signal(false);
  isEdit = false;
  currentBranch: any = { name: '' };

  tableColumns: TableColumn[] = [
    { field: 'name', header: 'BRANCH NAME', sortable: true }
  ];

  tableActions: TableAction[] = [
    { label: 'Edit', icon: 'pi pi-pencil', command: (row) => this.openDrawer(row) },
    { label: 'Delete', icon: 'pi pi-trash', command: (row) => this.deleteBranch(row.id) }
  ];

  ngOnInit() {
    this.loadBranches();
  }

  loadBranches() {
    this.loading.set(true);
    this.api.getBranches().subscribe({
      next: (data) => {
        this.branches.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openDrawer(branch?: any) {
    this.isEdit = !!branch;
    this.currentBranch = branch ? { ...branch } : { name: '' };
    this.showDrawer.set(true);
  }

  hideDrawer() {
    this.showDrawer.set(false);
  }

  saveBranch() {
    if (!this.currentBranch.name) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'Branch name is required' });
      return;
    }

    this.saving.set(true);
    const obs = this.isEdit 
      ? this.api.updateBranch(this.currentBranch.id, this.currentBranch)
      : this.api.createBranch(this.currentBranch);

    obs.subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Success', detail: 'Branch saved successfully' });
        this.hideDrawer();
        this.saving.set(false);
        this.loadBranches();
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to save branch' });
        this.saving.set(false);
      }
    });
  }

  deleteBranch(id: number) {
    if (confirm('Are you sure you want to delete this branch?')) {
      this.api.deleteBranch(id).subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: 'Deleted', detail: 'Branch deleted' });
          this.loadBranches();
        },
        error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete' })
      });
    }
  }
}
