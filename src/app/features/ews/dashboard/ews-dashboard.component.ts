import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { EwsStateService } from '../services/ews-state.service';
import { EwsApiService } from '../services/ews-api.service';
import { forkJoin } from 'rxjs';
import { HeroComponent } from '../../../shared/components/ui/hero/hero';

@Component({
  selector: 'app-ews-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ProgressBarModule, RouterModule, HeroComponent],
  templateUrl: './ews-dashboard.component.html',
  styleUrls: ['./ews-dashboard.component.scss'],
})
export class EwsDashboardComponent implements OnInit {
  ewsState = inject(EwsStateService);
  ewsApi = inject(EwsApiService);
  router = inject(Router);

  stats = signal<any>(null);
  branchStats = signal<any[]>([]);
  escalations = signal<any[]>([]);
  adminStats = signal<{ signals: number; cbsRules: number; manualRules: number; auditRules: number; loanTypes: number; changes: number }>({
    signals: 0, cbsRules: 0, manualRules: 0, auditRules: 0, loanTypes: 0, changes: 0
  });
  loading = signal(true);

  // Data comes strictly from the backend
  // No sample fallback

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const filters: any = {};
    const branchIds = this.ewsState.getBranchIds();
    if (branchIds) {
      filters.branch_ids = branchIds.join(',');
    }
    const role = this.ewsState.role();
    if (role) {
      filters.role = role;
    }

    if (this.ewsState.isRole('admin')) {
      forkJoin({
        signals: this.ewsApi.getSignals(),
        cbsRules: this.ewsApi.getCbsRules(),
        loanTypes: this.ewsApi.getLoanTypeConfigSummary(),
        changes: this.ewsApi.getConfigChangelog()
      }).subscribe({
        next: (res) => {
          const rules = res.cbsRules || [];
          this.adminStats.set({
            signals: res.signals?.length || 0,
            cbsRules: rules.filter((r: any) => (r.tag || 'cbs') === 'cbs').length,
            manualRules: rules.filter((r: any) => r.tag === 'manual').length,
            auditRules: rules.filter((r: any) => r.tag === 'audit').length,
            loanTypes: res.loanTypes?.length || 0,
            changes: res.changes?.length || 0
          });
        }
      });
    }

    this.ewsApi.getWatchListStats(filters).subscribe({
      next: (s) => { this.stats.set(s); this.loading.set(false); },
      error: () => {
        this.stats.set({ total_active: 0, high_risk: 0, escalated: 0, under_investigation: 0, resolved_this_month: 0 });
        this.loading.set(false);
      },
    });
    
    this.ewsApi.getBranchStats(filters).subscribe({
      next: (b) => this.branchStats.set(b || []),
      error: () => this.branchStats.set([]),
    });
  }

  goWatchList(filters?: any) { this.router.navigate(['/ews/watch-list'], { queryParams: filters }); }
  goAllAccounts(filters?: any) { this.router.navigate(['/ews/all-accounts'], { queryParams: filters }); }
  goEscalations() { this.router.navigate(['/ews/escalations']); }
  goInvestigations() { this.router.navigate(['/ews/investigations']); }

  getRiskSeverity(risk: string): 'danger' | 'warning' | 'success' | 'info' {
    switch (risk) {
      case 'High': return 'danger';
      case 'Medium': return 'warning';
      default: return 'success';
    }
  }
}
