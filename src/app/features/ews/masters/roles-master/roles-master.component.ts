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
  selector: 'app-roles-master',
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
    
    <div class="card p-4">
      <div class="flex align-items-center justify-content-between mb-4 pb-3 border-bottom-1 surface-border">
        <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">Roles Master</h5>
      </div>

      <app-table
        [data]="roles()"
        [columns]="tableColumns"
        [loading]="loading()"
        [actions]="tableActions"
        (onAdd)="openDrawer()"
        [showRefreshButton]="true"
        [paginator]="true"
        [rows]="10"
        (onRefresh)="loadRoles()"
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
              <i class="pi pi-user-plus"></i>
            </span>
            <div>
              <div class="text-900 font-semibold text-xl">{{ isEdit ? 'Edit Role' : 'New Role' }}</div>
              <div class="text-600 text-sm mt-1">Configure system role permissions & properties</div>
            </div>
          </div>
          <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded" (click)="hideDrawer()"></button>
        </div>
      </ng-template>

      <ng-template pTemplate="content">
        <div class="drawer-content-shell">
          <section class="drawer-section">
            <div class="section-heading">
              <span class="section-kicker">Role Information</span>
              <span class="section-line"></span>
            </div>
            <div class="grid formgrid p-fluid drawer-form-grid">
              <div class="field col-12">
                <label class="font-bold text-sm text-gray-700 mb-1 block">Role Name <span class="text-red-500">*</span></label>
                <input pInputText type="text" [(ngModel)]="currentRole.name" placeholder="e.g. Branch Officer, Auditor, Admin" class="w-full" style="height: 2.5rem; border-radius: 8px;" />
              </div>
            </div>
          </section>
        </div>
      </ng-template>

      <ng-template pTemplate="footer">
        <div class="drawer-footer-row">
          <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-outlined p-button-secondary" (click)="hideDrawer()"></button>
          <button pButton pRipple [label]="saving() ? 'Saving...' : 'Save Role'" icon="pi pi-check" class="p-button-primary" (click)="saveRole()" [disabled]="saving()"></button>
        </div>
      </ng-template>
    </p-drawer>
  `
})
export class RolesMasterComponent implements OnInit {
  private api = inject(EwsApiService);
  private msg = inject(MessageService);

  roles = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);

  showDrawer = signal(false);
  isEdit = false;
  currentRole: any = { name: '' };

  tableColumns: TableColumn[] = [
    { field: 'name', header: 'ROLE NAME', sortable: true, type: 'status' }
  ];

  tableActions: TableAction[] = [
    { label: 'Edit', icon: 'pi pi-pencil', command: (row) => this.openDrawer(row) },
    { label: 'Delete', icon: 'pi pi-trash', command: (row) => this.deleteRole(row.id) }
  ];

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    this.loading.set(true);
    this.api.getRoles().subscribe({
      next: (data) => {
        this.roles.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openDrawer(role?: any) {
    this.isEdit = !!role;
    this.currentRole = role ? { ...role } : { name: '' };
    this.showDrawer.set(true);
  }

  hideDrawer() {
    this.showDrawer.set(false);
  }

  saveRole() {
    if (!this.currentRole.name) {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'Role name is required' });
      return;
    }

    this.saving.set(true);
    const obs = this.isEdit 
      ? this.api.updateRole(this.currentRole.id, this.currentRole)
      : this.api.createRole(this.currentRole);

    obs.subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Success', detail: 'Role saved successfully' });
        this.hideDrawer();
        this.saving.set(false);
        this.loadRoles();
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to save role' });
        this.saving.set(false);
      }
    });
  }

  deleteRole(id: number) {
    if (confirm('Are you sure you want to delete this role?')) {
      this.api.deleteRole(id).subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: 'Deleted', detail: 'Role deleted' });
          this.loadRoles();
        },
        error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete' })
      });
    }
  }
}
