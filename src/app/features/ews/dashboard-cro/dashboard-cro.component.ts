import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { EwsApiService } from '../services/ews-api.service';
import { SignalsModalComponent } from '../components/signals-modal/signals-modal.component';
import { HeroComponent } from '../../../shared/components/ui/hero/hero';

@Component({
  selector: 'app-dashboard-cro',
  standalone: true,
  imports: [CommonModule, RouterModule, SignalsModalComponent, HeroComponent],
  template: `
    <app-hero
      tag="RISK REVIEW"
      title="Chief Risk Officer Dashboard"
      subtitle="Review unit timelines, escalations, investigations, and high-risk accounts."
      roleBadge="CRO User"
      roleIcon="pi pi-shield"
    ></app-hero>

    <div *ngIf="loading()" style="padding: 60px; text-align: center; color: var(--text-color-secondary);">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem; margin-bottom: 16px"></i>
      <div>Loading CRO Dashboard...</div>
    </div>

    <div *ngIf="!loading()">
      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card theme-blue cursor-pointer" (click)="router.navigate(['/ews/all-accounts'])">
          <div class="card-glow"></div>
          <div class="card-icon"><i class="pi pi-sitemap"></i></div>
          <div class="card-details">
            <span class="card-title">Portfolio Accounts</span>
            <span class="card-value">{{ stats()?.total_portfolio_accounts || 0 }}</span>
          </div>
        </div>

        <div class="metric-card theme-red cursor-pointer" (click)="router.navigate(['/ews/watch-list'], { queryParams: { risk: 'High' } })">
          <div class="card-glow"></div>
          <div class="card-icon"><i class="pi pi-exclamation-triangle"></i></div>
          <div class="card-details">
            <span class="card-title">High Risk</span>
            <span class="card-value">{{ stats()?.high_risk || 0 }}</span>
          </div>
        </div>

        <div class="metric-card theme-amber cursor-pointer" (click)="router.navigate(['/ews/escalations'])">
          <div class="card-glow"></div>
          <div class="card-icon"><i class="pi pi-arrow-circle-up"></i></div>
          <div class="card-details">
            <span class="card-title">Escalations Pending</span>
            <span class="card-value">{{ stats()?.escalated || 0 }}</span>
          </div>
        </div>

        <div class="metric-card theme-purple cursor-pointer" (click)="router.navigate(['/ews/investigations'])">
          <div class="card-glow"></div>
          <div class="card-icon"><i class="pi pi-search"></i></div>
          <div class="card-details">
            <span class="card-title">Under Investigation</span>
            <span class="card-value">{{ stats()?.under_investigation || 0 }}</span>
          </div>
        </div>

        <div class="metric-card theme-emerald cursor-pointer" (click)="router.navigate(['/ews/watch-list'])">
          <div class="card-glow"></div>
          <div class="card-icon"><i class="pi pi-check-circle"></i></div>
          <div class="card-details">
            <span class="card-title">Total Watchlist</span>
            <span class="card-value">{{ stats()?.total_active || 0 }}</span>
          </div>
        </div>
      </div>
      
      <!-- Detail Grid -->
      <div class="dashboard-panel">
        <div class="panel-header">
          <div>
            <h3>Recent Pending Escalations</h3>
            <span class="panel-subtitle">Accounts requiring Chief Risk Officer decision</span>
          </div>
          <a (click)="router.navigate(['/ews/escalations'])" class="text-primary hover:underline text-sm font-medium cursor-pointer">View All →</a>
        </div>
        <div class="panel-body">
          <div *ngFor="let esc of escalations() | slice:0:3" style="border: 1px solid var(--surface-border, #e2e8f0); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; background: var(--surface-card, #fff);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-color, #0f172a);">{{ esc.borrower_name }} — {{ esc.account_id }}</div>
                <div style="font-size: 0.8rem; color: var(--text-color-secondary, #64748b); margin-top: 0.25rem;">{{ esc.branch }} &middot; Escalated by Risk Officer</div>
              </div>
              <span class="border-round bg-red-100 text-red-700">Awaiting CRO</span>
            </div>
            <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 0.85rem; font-size: 0.85rem; color: #991b1b; margin-bottom: 1rem;">
              {{ esc.reason }}
            </div>
            <div style="display: flex; justify-content: flex-end;">
              <button class="p-button p-button-sm p-button-outlined" (click)="router.navigate(['/ews/account', esc.watch_list_id])">
                View Full Detail &rarr;
              </button>
            </div>
          </div>
          
          <div *ngIf="escalations().length === 0" style="padding: 2rem; text-align: center; color: var(--text-color-secondary);">
            No pending escalations at this time.
          </div>
        </div>
      </div>
    </div>
    
    <app-signals-modal 
      [show]="showSignalsModal" 
      [signalsData]="selectedSignalsData" 
      (close)="showSignalsModal = false">
    </app-signals-modal>
  `,
  styleUrls: ['../dashboard/ews-dashboard.component.scss']
})
export class DashboardCroComponent implements OnInit {
  ewsApi = inject(EwsApiService);
  router = inject(Router);
  
  loading = signal(true);
  stats = signal<any>(null);
  escalations = signal<any[]>([]);

  showSignalsModal = false;
  selectedSignalsData: any[] = [];

  ngOnInit() {
    this.ewsApi.getWatchListStats().subscribe({
      next: (d: any) => {
        this.stats.set(d);
        
        this.ewsApi.getEscalations('Pending CRO').subscribe({
          next: (e: any[]) => {
            this.escalations.set(e || []);
            this.loading.set(false);
          },
          error: (err: any) => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  openSignalsModal(signalsData: any[]) {
    this.selectedSignalsData = signalsData || [];
    this.showSignalsModal = true;
  }
}
