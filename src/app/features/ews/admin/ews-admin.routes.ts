import { Routes } from '@angular/router';

export const EWS_ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'signal-mapping', pathMatch: 'full' },
  {
    path: 'signal-mapping',
    loadComponent: () =>
      import('./signal-mapping/signal-mapping.component').then(
        (m) => m.SignalMappingComponent,
      ),
  },
  {
    path: 'cbs-rules',
    loadComponent: () =>
      import('./cbs-rules/admin-cbs-rules.component').then(
        (m) => m.AdminCbsRulesComponent,
      ),
  },
  {
    path: 'manual-signals',
    loadComponent: () =>
      import('./manual-signals/manual-signals.component').then(
        (m) => m.ManualSignalsComponent,
      ),
  },
  {
    path: 'risk-weights',
    loadComponent: () =>
      import('./risk-weights/risk-weights.component').then(
        (m) => m.RiskWeightsComponent,
      ),
  },
  {
    path: 'loan-config',
    loadComponent: () =>
      import('./loan-config/loan-config.component').then(
        (m) => m.LoanConfigComponent,
      ),
  },
  {
    path: 'change-log',
    loadComponent: () =>
      import('./change-log/change-log.component').then(
        (m) => m.ChangeLogComponent,
      ),
  },
  {
    path: 'loan-questions',
    loadComponent: () =>
      import('./loan-questions/loan-questions.component').then(
        (m) => m.LoanQuestionsComponent,
      ),
  },
];
