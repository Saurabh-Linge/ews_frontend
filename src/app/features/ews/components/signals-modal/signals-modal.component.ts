import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroComponent } from '../../../../shared/components/ui/hero/hero';

@Component({
  selector: 'app-signals-modal',
  standalone: true,
  imports: [CommonModule, HeroComponent],
  template: `
    <app-hero title="Signals Modal"></app-hero>
    <div class="modal-overlay" *ngIf="show" (click)="close.emit()">
      <div class="dashboard-panel" style="width: 100%; max-width: 600px; max-height: 90vh; padding: 0; display: flex; flex-direction: column;" (click)="$event.stopPropagation()">
        
        <div style="background: linear-gradient(135deg, var(--primary-800, #1e3a8a) 0%, var(--primary-600, #3b82f6) 100%); padding: 1.5rem; border-top-left-radius: 16px; border-top-right-radius: 16px; display: flex; justify-content: space-between; align-items: center; color: white;">
          <div>
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700;">Signals & Trigger Rules</h3>
            <span style="font-size: 0.85rem; opacity: 0.8;">The following signals triggered the EWS alert</span>
          </div>
          <button class="close-btn" (click)="close.emit()"><i class="pi pi-times"></i></button>
        </div>

        <div class="panel-body" style="padding: 1.5rem; overflow-y: auto;">
          <div *ngIf="!signalsData || signalsData.length === 0" style="padding: 2rem; text-align: center; color: var(--text-color-secondary); border: 1px dashed var(--surface-border); border-radius: 12px; font-weight: 600;">
            No detailed rule data available for this account.
          </div>

          <div class="signal-list">
            <div *ngFor="let sig of signalsData" class="metric-card theme-red" style="padding: 1rem; border-radius: 12px; margin-bottom: 1rem; align-items: flex-start; flex-direction: column; gap: 0.75rem;">
              <div class="card-glow"></div>
              
              <div style="display: flex; align-items: center; gap: 0.75rem; width: 100%;">
                <div class="card-icon" style="width: 32px; height: 32px; font-size: 1rem;"><i class="pi pi-exclamation-triangle"></i></div>
                <div class="card-details">
                  <span class="card-title" style="font-size: 1rem; color: var(--text-color);">{{ sig.name }}</span>
                </div>
              </div>
              
              <div class="rules-list" *ngIf="sig.rules && sig.rules.length > 0" style="width: 100%; display: flex; flex-direction: column; gap: 0.5rem; padding-left: 2.75rem;">
                <div *ngFor="let rule of sig.rules" class="rule-item" style="display: flex; align-items: center; gap: 0.5rem; background: var(--surface-ground); border: 1px solid var(--surface-border); padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.9rem; font-weight: 500; color: var(--text-color-secondary);">
                  <i class="pi pi-check-circle" style="color: var(--emerald-500, #10B981);"></i>
                  <span>{{ rule.name || rule }}</span>
                </div>
              </div>
              
              <div *ngIf="!sig.rules || sig.rules.length === 0" class="no-rules" style="padding-left: 2.75rem; font-size: 0.85rem; color: var(--text-color-secondary); font-style: italic;">
                Triggered automatically or manually without specific CBS rule details.
              </div>
            </div>
          </div>
        </div>
        
        <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--surface-border); background: var(--surface-ground); border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; text-align: right;">
          <button class="verify-btn" (click)="close.emit()" style="background: var(--primary-color); color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 8px; font-weight: bold; cursor: pointer;">Close</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
    }
    .close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: white; opacity: 0.7; transition: opacity 0.2s; }
    .close-btn:hover { opacity: 1; }
  `]
})
export class SignalsModalComponent {
  @Input() show: boolean = false;
  @Input() signalsData: any[] = [];
  @Output() close = new EventEmitter<void>();
}
