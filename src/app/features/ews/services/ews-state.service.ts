import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { APP_CONFIG } from '../../../core/services/config/config.token';

export type EwsRole = 'cro' | 'ro' | 'branch' | 'admin';

export interface RoleConfig {
  name: string;
  initials: string;
  color: string;
  accent: string;
  nav: Array<{ sec?: string; id?: string; icon?: string; label?: string; badge?: string; bc?: string }>;
}

export const ROLE_CONFIG: Record<EwsRole, RoleConfig> = {
  cro: {
    name: 'Chief Risk Officer',
    initials: 'CR',
    color: '#DC2626',
    accent: '#DC2626',
    nav: [
      { sec: 'Overview' },
      { id: 'dashboard', icon: 'pi pi-home', label: 'Dashboard' },
      { id: 'all-accounts', icon: 'pi pi-folder-open', label: 'All Accounts' },
      { id: 'watchlist', icon: 'pi pi-exclamation-triangle', label: 'Watch List', badge: '12', bc: 'p-badge-danger' },
      { sec: 'Actions' },
      { id: 'escalations', icon: 'pi pi-arrow-circle-up', label: 'Escalations', badge: '3', bc: 'p-badge-danger' },
      { id: 'investigations', icon: 'pi pi-search', label: 'Investigations', badge: '5', bc: 'p-badge-warning' },
      { id: 'disputes', icon: 'pi pi-comments', label: 'Disputes', bc: 'p-badge-danger' },
      { id: 'resolved', icon: 'pi pi-check-circle', label: 'Resolved', badge: '8', bc: 'p-badge-success' },
      { sec: 'Reports' },
      { id: 'reports', icon: 'pi pi-chart-bar', label: 'Reports' },
      { id: 'audit-trail', icon: 'pi pi-history', label: 'Audit Trail' },
    ],
  },
  ro: {
    name: 'Risk Officer',
    initials: 'RO',
    color: '#1B4FD8',
    accent: '#1B4FD8',
    nav: [
      { sec: 'Overview' },
      { id: 'dashboard', icon: 'pi pi-home', label: 'Dashboard' },
      { id: 'all-accounts', icon: 'pi pi-folder-open', label: 'All Accounts' },
      { id: 'watchlist', icon: 'pi pi-exclamation-triangle', label: 'Watch List', badge: '7', bc: 'p-badge-danger' },
      { sec: 'Work' },
      { id: 'account-detail', icon: 'pi pi-file', label: 'Account Detail' },
      { id: 'investigations', icon: 'pi pi-search', label: 'Investigations', badge: '3', bc: 'p-badge-warning' },
      { id: 'disputes', icon: 'pi pi-comments', label: 'Disputes', bc: 'p-badge-danger' },
      { id: 'resolved', icon: 'pi pi-check-circle', label: 'Resolved' },
      { sec: 'Tools' },
      { id: 'cbs-upload', icon: 'pi pi-upload', label: 'CBS Upload' },
      { id: 'reports', icon: 'pi pi-chart-bar', label: 'Reports' },
      { id: 'manual-flag', icon: 'pi pi-plus', label: 'Flag Account' },
    ],
  },
  branch: {
    name: 'Branch Manager — Ajara',
    initials: 'BM',
    color: '#059669',
    accent: '#059669',
    nav: [
      { sec: 'Overview' },
      { id: 'dashboard', icon: 'pi pi-home', label: 'My Dashboard' },
      { sec: 'Investigations' },
      { id: 'inv-pending', icon: 'pi pi-clock', label: 'Pending Response', badge: '2', bc: 'p-badge-danger' },
      { id: 'inv-respond', icon: 'pi pi-send', label: 'Submit Response' },
      { id: 'inv-dispute', icon: 'pi pi-times-circle', label: 'Dispute Signal' },
      { id: 'inv-history', icon: 'pi pi-history', label: 'Account History' },
      { sec: 'Watch List' },
      { id: 'watchlist', icon: 'pi pi-exclamation-triangle', label: 'My Branch List' },
    ],
  },
  admin: {
    name: 'System Admin',
    initials: 'AD',
    color: '#7C3AED',
    accent: '#7C3AED',
    nav: [
      { sec: 'Signal Mapping' },
      { id: 'dashboard', icon: 'pi pi-home', label: 'Overview' },
      { id: 'all-accounts', icon: 'pi pi-folder-open', label: 'All Accounts' },
      { id: 'admin/signal-mapping', icon: 'pi pi-list', label: 'Audit → Signals', badge: '44', bc: 'p-badge-success' },
      { id: 'admin/cbs-rules', icon: 'pi pi-database', label: 'CBS Rules', badge: '8', bc: 'p-badge-success' },
      { id: 'admin/manual-signals', icon: 'pi pi-sliders-h', label: 'Manual Signals' },
      { sec: 'Config' },
      { id: 'admin/risk-weights', icon: 'pi pi-sliders-v', label: 'Risk Weights' },
      { id: 'admin/loan-config', icon: 'pi pi-building', label: 'Loan Type Config' },
      { id: 'admin/change-log', icon: 'pi pi-history', label: 'Change Log' },
      { sec: 'Masters' },
      { id: 'masters/users', icon: 'pi pi-users', label: 'Users' },
      { id: 'masters/branches', icon: 'pi pi-sitemap', label: 'Branches' },
      { id: 'masters/roles', icon: 'pi pi-id-card', label: 'Roles' },
    ],
  },
};

@Injectable({ providedIn: 'root' })
export class EwsStateService {
  private http = inject(HttpClient);
  private config = inject(APP_CONFIG);

  private _role = signal<EwsRole | null>(
    (sessionStorage.getItem('ews_role') as EwsRole) || null,
  );
  
  private _user = signal<any>(
    JSON.parse(sessionStorage.getItem('ews_user') || 'null')
  );

  private _softwareDate = signal<string | null>(null);

  readonly role = this._role.asReadonly();
  readonly user = this._user.asReadonly();
  readonly softwareDate = this._softwareDate.asReadonly();

  constructor() {
    this.loadSoftwareDate();
  }

  loadSoftwareDate() {
    const url = `${this.config.apiUrl}/api/ews/risk-config`;
    this.http.get<Record<string, string>>(url).subscribe({
      next: (cfg) => {
        if (cfg && cfg['software_date']) {
          this._softwareDate.set(cfg['software_date']);
        } else {
          this._softwareDate.set(null);
        }
      },
      error: () => {
        this._softwareDate.set(null);
      }
    });
  }

  readonly roleConfig = computed(() => {
    const r = this._role();
    return r ? ROLE_CONFIG[r] : null;
  });

  setRole(role: EwsRole, userObj?: any) {
    this._role.set(role);
    sessionStorage.setItem('ews_role', role);
    if (userObj) {
      this._user.set(userObj);
      sessionStorage.setItem('ews_user', JSON.stringify(userObj));
    }
  }

  clearRole() {
    this._role.set(null);
    this._user.set(null);
    sessionStorage.removeItem('ews_role');
    sessionStorage.removeItem('ews_user');
  }

  getBranchIds(): number[] | null {
    const u = this._user();
    if (!u || !u.branches || u.branches.length === 0) return null;
    return u.branches;
  }

  isRole(...roles: EwsRole[]): boolean {
    return roles.includes(this._role()!);
  }
}
