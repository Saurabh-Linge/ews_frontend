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
  selector: 'app-users-master',
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
        <h5 class="m-0 text-xl font-bold" style="color: var(--text-color, #102a43); font-weight: 700;">Users Master</h5>
      </div>

      <app-table
        [data]="users()"
        [columns]="tableColumns"
        [loading]="loading()"
        [actions]="tableActions"
        (onAdd)="openDrawer()"
        [showRefreshButton]="true"
        [paginator]="true"
        [rows]="10"
        (onRefresh)="loadData()"
      ></app-table>
    </div>

    <!-- Slide-over Drawer for User Create / Edit Form -->
    <p-drawer
      [visible]="showDrawer()"
      (visibleChange)="showDrawer.set($event)"
      (onHide)="hideDrawer()"
      position="right"
      [style]="{ width: '650px', maxWidth: '96vw' }"
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
              <i class="pi pi-user"></i>
            </span>
            <div>
              <div class="text-900 font-semibold text-xl">{{ isEdit ? 'Edit User Details' : 'New User Account' }}</div>
              <div class="text-600 text-sm mt-1">Manage bank officer credentials & role permissions</div>
            </div>
          </div>
          <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded" (click)="hideDrawer()"></button>
        </div>
      </ng-template>

      <ng-template pTemplate="content">
        <div class="drawer-content-shell">
          <!-- Section 1: Account Info -->
          <section class="drawer-section">
            <div class="section-heading">
              <span class="section-kicker">Account Info</span>
              <span class="section-line"></span>
            </div>
            <div class="grid formgrid p-fluid drawer-form-grid">
              <div class="field col-12 md:col-6">
                <label class="font-bold text-sm text-gray-700 mb-1 block">Full Name <span class="text-red-500">*</span></label>
                <input pInputText type="text" [(ngModel)]="currentUser.full_name" placeholder="e.g. Officer Name" class="w-full" style="height: 2.5rem; border-radius: 8px;" />
              </div>
              <div class="field col-12 md:col-6">
                <label class="font-bold text-sm text-gray-700 mb-1 block">Username <span class="text-red-500">*</span></label>
                <input pInputText type="text" [(ngModel)]="currentUser.username" placeholder="Unique username" class="w-full" style="height: 2.5rem; border-radius: 8px;" />
              </div>
              <div class="field col-12 md:col-6">
                <label class="font-bold text-sm text-gray-700 mb-1 block">Email</label>
                <input pInputText type="text" [(ngModel)]="currentUser.email" placeholder="officer@bank.com" class="w-full" style="height: 2.5rem; border-radius: 8px;" />
              </div>
              <div class="field col-12 md:col-6">
                <label class="font-bold text-sm text-gray-700 mb-1 block">Password <span *ngIf="!isEdit" class="text-red-500">*</span></label>
                <input pInputText type="password" [(ngModel)]="currentUser.password" [placeholder]="isEdit ? 'Leave blank to keep existing...' : 'Enter password'" class="w-full" style="height: 2.5rem; border-radius: 8px;" />
              </div>
            </div>
          </section>

          <!-- Section 2: Role & Access -->
          <section class="drawer-section">
            <div class="section-heading">
              <span class="section-kicker">Role & Access</span>
              <span class="section-line"></span>
            </div>
            <div class="grid formgrid p-fluid drawer-form-grid">
              <div class="field col-12 md:col-6">
                <label class="font-bold text-sm text-gray-700 mb-1 block">Role <span class="text-red-500">*</span></label>
                <select [(ngModel)]="currentUser.role_id" class="modern-input" style="height: 2.5rem; width: 100%; padding: 0 0.75rem; border-radius: 8px; border: 1px solid var(--surface-border, #e2e8f0); background: var(--surface-card, #fff);">
                  <option [ngValue]="null">Select Role</option>
                  <option *ngFor="let r of roles()" [ngValue]="r.id">{{ r.name }}</option>
                </select>
              </div>
              <div class="field col-12 md:col-6">
                <label class="font-bold text-sm text-gray-700 mb-1 block">Account Status</label>
                <select [(ngModel)]="currentUser.is_active" class="modern-input" style="height: 2.5rem; width: 100%; padding: 0 0.75rem; border-radius: 8px; border: 1px solid var(--surface-border, #e2e8f0); background: var(--surface-card, #fff);">
                  <option [ngValue]="true">Active</option>
                  <option [ngValue]="false">Inactive</option>
                </select>
              </div>
              <div class="field col-12">
                <label class="font-bold text-sm text-gray-700 mb-1 block">Assigned Branches</label>
                <select [(ngModel)]="currentUser.branch_ids" multiple class="modern-input" style="height: 90px; width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--surface-border, #e2e8f0); background: var(--surface-card, #fff);">
                  <option *ngFor="let b of branches()" [ngValue]="b.id">{{ b.name }}</option>
                </select>
                <span style="font-size: 0.75rem; color: var(--text-color-secondary); margin-top: 0.25rem; display: block;">Hold Ctrl/Cmd to select multiple branches</span>
              </div>
            </div>
          </section>
        </div>
      </ng-template>

      <ng-template pTemplate="footer">
        <div class="drawer-footer-row">
          <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-outlined p-button-secondary" (click)="hideDrawer()"></button>
          <button pButton pRipple [label]="saving() ? 'Saving...' : 'Save User'" icon="pi pi-check" class="p-button-primary" (click)="saveUser()" [disabled]="saving()"></button>
        </div>
      </ng-template>
    </p-drawer>
  `
})
export class UsersMasterComponent implements OnInit {
  private api = inject(EwsApiService);
  private msg = inject(MessageService);

  users = signal<any[]>([]);
  roles = signal<any[]>([]);
  branches = signal<any[]>([]);
  
  loading = signal(true);
  saving = signal(false);

  showDrawer = signal(false);
  isEdit = false;
  currentUser: any = {};

  tableColumns: TableColumn[] = [
    { field: 'username', header: 'USERNAME', sortable: true },
    { field: 'full_name', header: 'FULL NAME', sortable: true },
    { field: 'role', header: 'ROLE', sortable: true, type: 'status' },
    { field: 'is_active', header: 'STATUS', sortable: true, type: 'boolean' }
  ];

  tableActions: TableAction[] = [
    { label: 'Edit', icon: 'pi pi-pencil', command: (row) => this.openDrawer(row) },
    { label: 'Delete', icon: 'pi pi-trash', command: (row) => this.deleteUser(row.id) }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    Promise.all([
      this.api.getUsers().toPromise(),
      this.api.getRoles().toPromise(),
      this.api.getBranches().toPromise()
    ]).then(([usersData, rolesData, branchesData]) => {
      this.users.set(usersData || []);
      this.roles.set(rolesData || []);
      this.branches.set(branchesData || []);
      this.loading.set(false);
    }).catch(() => {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load data' });
      this.loading.set(false);
    });
  }

  openDrawer(user?: any) {
    this.isEdit = !!user;
    if (user) {
      this.currentUser = { 
        ...user, 
        password: '',
        branch_ids: user.branches?.map((b: any) => b.id) || []
      };
    } else {
      this.currentUser = { full_name: '', username: '', email: '', role_id: null, is_active: true, branch_ids: [], password: '' };
    }
    this.showDrawer.set(true);
  }

  hideDrawer() {
    this.showDrawer.set(false);
  }

  saveUser() {
    if (!this.currentUser.username || !this.currentUser.full_name || !this.currentUser.role_id) {
      this.msg.add({ severity: 'error', summary: 'Validation Error', detail: 'Username, Full Name, and Role are required' });
      return;
    }
    if (!this.isEdit && !this.currentUser.password) {
      this.msg.add({ severity: 'error', summary: 'Validation Error', detail: 'Password is required for new users' });
      return;
    }

    this.saving.set(true);
    const obs = this.isEdit 
      ? this.api.updateUser(this.currentUser.id, this.currentUser)
      : this.api.createUser(this.currentUser);

    obs.subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Success', detail: 'User saved successfully' });
        this.hideDrawer();
        this.saving.set(false);
        this.loadData();
      },
      error: (err) => {
        const errorDetail = err?.error?.message || 'Failed to save user';
        this.msg.add({ severity: 'error', summary: 'Error', detail: errorDetail });
        this.saving.set(false);
      }
    });
  }

  deleteUser(id: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.api.deleteUser(id).subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: 'Deleted', detail: 'User deleted' });
          this.loadData();
        },
        error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete' })
      });
    }
  }
}
