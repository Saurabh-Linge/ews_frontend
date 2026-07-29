import { Routes } from '@angular/router';
import { AppLayout } from './shell/layout/component/app.layout';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'ews/dashboard', pathMatch: 'full' },
      // EWS Shared screens
      {
        path: 'ews/dashboard',
        loadComponent: () =>
          import('./features/ews/dashboard/ews-dashboard.component').then(
            (m) => m.EwsDashboardComponent,
          ),
      },
      {
        path: 'ews/all-accounts',
        loadComponent: () =>
          import('./features/ews/all-accounts/all-accounts.component').then(
            (m) => m.AllAccountsComponent,
          ),
      },
      {
        path: 'ews/dashboard-cro',
        loadComponent: () =>
          import('./features/ews/dashboard-cro/dashboard-cro.component').then(
            (m) => m.DashboardCroComponent,
          ),
      },
      {
        path: 'ews/watch-list',
        loadComponent: () =>
          import('./features/ews/watch-list/watch-list.component').then(
            (m) => m.WatchListComponent,
          ),
      },
      {
        path: 'ews/account/:id',
        loadComponent: () =>
          import('./features/ews/account-detail/account-detail.component').then(
            (m) => m.AccountDetailComponent,
          ),
      },
      {
        path: 'ews/investigations',
        loadComponent: () =>
          import('./features/ews/investigations/investigations.component').then(
            (m) => m.InvestigationsComponent,
          ),
      },
      {
        path: 'ews/escalations',
        loadComponent: () =>
          import('./features/ews/escalations/escalations.component').then(
            (m) => m.EscalationsComponent,
          ),
      },
      {
        path: 'ews/resolved',
        loadComponent: () =>
          import('./features/ews/resolved/resolved.component').then(
            (m) => m.ResolvedComponent,
          ),
      },
      {
        path: 'ews/disputes',
        loadComponent: () =>
          import('./features/ews/disputes/disputes.component').then(
            (m) => m.DisputesComponent,
          ),
      },
      {
        path: 'masters/branches',
        loadComponent: () =>
          import('./features/ews/masters/branches-master/branches-master.component').then((m) => m.BranchesMasterComponent),
      },
      {
        path: 'masters/roles',
        loadComponent: () =>
          import('./features/ews/masters/roles-master/roles-master.component').then((m) => m.RolesMasterComponent),
      },
      {
        path: 'masters/users',
        loadComponent: () =>
          import('./features/ews/masters/users-master/users-master.component').then((m) => m.UsersMasterComponent),
      },
      {
        path: 'ews/cbs-upload',
        loadComponent: () =>
          import('./features/ews/cbs-upload/cbs-upload.component').then(
            (m) => m.CbsUploadComponent,
          ),
      },
      {
        path: 'ews/manual-flag',
        loadComponent: () =>
          import('./features/ews/manual-flag/manual-flag.component').then(
            (m) => m.ManualFlagComponent,
          ),
      },
      {
        path: 'ews/reports',
        loadComponent: () =>
          import('./features/ews/reports/ews-reports.component').then(
            (m) => m.EwsReportsComponent,
          ),
      },
      {
        path: 'ews/reports/:reportSlug',
        loadComponent: () =>
          import('./features/ews/reports/report-viewer/ews-report-viewer.component').then(
            (m) => m.EwsReportViewerComponent,
          ),
      },
      {
        path: 'ews/audit-trail',
        loadComponent: () =>
          import('./features/ews/audit-trail/audit-trail.component').then(
            (m) => m.AuditTrailComponent,
          ),
      },
      // Admin sub-routes
      {
        path: 'ews/admin',
        loadChildren: () =>
          import('./features/ews/admin/ews-admin.routes').then(
            (m) => m.EWS_ADMIN_ROUTES,
          ),
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  { path: '**', redirectTo: '/ews/dashboard' },
];
