import { Component, OnInit, inject, EffectRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { EwsStateService, EwsRole } from '../../../features/ews/services/ews-state.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule],
  template: `
    <ul class="layout-menu">
      <ng-container *ngFor="let item of model; let i = index">
        <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
        <li *ngIf="item.separator" class="menu-separator"></li>
      </ng-container>
    </ul>
  `,
})
export class AppMenu implements OnInit {
  ewsState = inject(EwsStateService);
  model: MenuItem[] = [];

  constructor() {
    effect(() => {
      this.buildMenu(this.ewsState.role() || 'branch');
    });
  }

  ngOnInit(): void {
    this.buildMenu(this.ewsState.role() || 'branch');
  }

  buildMenu(role: EwsRole): void {
    const menu: MenuItem[] = [];

    // 1. OVERVIEW Section
    const overviewItems: MenuItem[] = [];
    if (role === 'cro') {
      overviewItems.push({ label: 'CRO Dashboard', icon: 'pi pi-fw pi-chart-pie', routerLink: ['/ews/dashboard-cro'] });
    } else {
      overviewItems.push({ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/ews/dashboard'] });
    }

    if (['cro', 'ro', 'admin'].includes(role)) {
      overviewItems.push({ label: 'All Accounts', icon: 'pi pi-fw pi-folder-open', routerLink: ['/ews/all-accounts'] });
    }
    if (role !== 'branch') {
      overviewItems.push({ label: 'Watch List', icon: 'pi pi-fw pi-exclamation-triangle', routerLink: ['/ews/watch-list'] });
    }

    if (overviewItems.length > 0) {
      menu.push({ label: 'OVERVIEW', items: overviewItems });
    }

    // 2. ACTIONS / MONITORING Section
    const actionItems: MenuItem[] = [];
    if (['cro', 'ro', 'branch'].includes(role)) {
      actionItems.push({ label: 'Investigations', icon: 'pi pi-fw pi-search', routerLink: ['/ews/investigations'] });
    }
    if (['cro', 'ro'].includes(role)) {
      actionItems.push({ label: 'Disputes', icon: 'pi pi-fw pi-comments', routerLink: ['/ews/disputes'] });
    }
    if (['cro'].includes(role)) {
      actionItems.push({ label: 'Escalations', icon: 'pi pi-fw pi-arrow-circle-up', routerLink: ['/ews/escalations'] });
    }
    if (['cro', 'ro', 'branch'].includes(role)) {
      actionItems.push({ label: 'Resolved', icon: 'pi pi-fw pi-check-circle', routerLink: ['/ews/resolved'] });
    }

    if (actionItems.length > 0) {
      menu.push({ label: 'ACTIONS', items: actionItems });
    }

    // 3. MANAGEMENT Section
    const managementItems: MenuItem[] = [];
    if (['cro', 'ro', 'admin'].includes(role)) {
      managementItems.push({ label: 'CBS Upload', icon: 'pi pi-fw pi-upload', routerLink: ['/ews/cbs-upload'] });
    }
    if (['ro'].includes(role)) {
      managementItems.push({ label: 'Flag Account', icon: 'pi pi-fw pi-flag', routerLink: ['/ews/manual-flag'] });
    }

    // Admin Sub-Items
    const adminConfigItems: MenuItem[] = [];
    if (['cro', 'admin'].includes(role)) {
      adminConfigItems.push({ label: 'CBS Rules', icon: 'pi pi-fw pi-database', routerLink: ['/ews/admin/cbs-rules'] });
    }
    if (['admin'].includes(role)) {
      adminConfigItems.push({ label: 'Audit → Signals', icon: 'pi pi-fw pi-list', routerLink: ['/ews/admin/signal-mapping'] });
    }
    if (['cro', 'admin'].includes(role)) {
      adminConfigItems.push({ label: 'Loan Config', icon: 'pi pi-fw pi-building', routerLink: ['/ews/admin/loan-config'] });
    }
    if (['cro', 'admin'].includes(role)) {
      adminConfigItems.push({ label: 'Manual Signals', icon: 'pi pi-fw pi-sliders-h', routerLink: ['/ews/admin/manual-signals'] });
    }
    if (['admin'].includes(role)) {
      adminConfigItems.push({ label: 'Risk Weights', icon: 'pi pi-fw pi-sliders-v', routerLink: ['/ews/admin/risk-weights'] });
      adminConfigItems.push({ label: 'Change Log', icon: 'pi pi-fw pi-history', routerLink: ['/ews/admin/change-log'] });
    }

    if (adminConfigItems.length > 0) {
      managementItems.push({
        label: 'Rule Config',
        icon: 'pi pi-fw pi-cog',
        items: adminConfigItems
      });
    }

    // Masters
    if (['admin'].includes(role)) {
      managementItems.push({
        label: 'Masters',
        icon: 'pi pi-fw pi-id-card',
        items: [
          { label: 'Users', icon: 'pi pi-fw pi-users', routerLink: ['/masters/users'] },
          { label: 'Branches', icon: 'pi pi-fw pi-sitemap', routerLink: ['/masters/branches'] },
          { label: 'Roles', icon: 'pi pi-fw pi-lock', routerLink: ['/masters/roles'] },
        ]
      });
    }

    if (managementItems.length > 0) {
      menu.push({ label: 'MANAGEMENT', items: managementItems });
    }

    // 4. REPORTS Section
    menu.push({
      label: 'REPORTS',
      items: [
        { label: 'Reports', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/ews/reports'] },
        { label: 'Audit Trail', icon: 'pi pi-fw pi-history', routerLink: ['/ews/audit-trail'] }
      ]
    });

    this.model = menu;
  }
}
