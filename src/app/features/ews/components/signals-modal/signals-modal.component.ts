import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-signals-modal',
  standalone: true,
  imports: [CommonModule, DrawerModule, ButtonModule],
  template: `
    <p-drawer
      [visible]="show"
      (visibleChange)="$event ? null : close.emit()"
      (onHide)="close.emit()"
      position="right"
      [style]="{ width: '560px', maxWidth: '96vw' }"
      [modal]="true"
      [dismissible]="true"
      [showCloseIcon]="false"
      styleClass="drawer-layout"
      appendTo="body"
    >
      <ng-template pTemplate="header">
        <div class="drawer-header-row flex align-items-center justify-content-between w-full">
          <div class="drawer-title-wrap flex align-items-center gap-3">
            <span class="drawer-title-icon flex align-items-center justify-content-center border-round-lg bg-red-50 text-red-600" style="width: 40px; height: 40px; min-width: 40px;">
              <i class="pi pi-exclamation-triangle text-xl"></i>
            </span>
            <div>
              <div class="text-900 font-bold text-xl">Signals & Trigger Rules</div>
              <div class="text-600 text-sm mt-1">The following signals triggered the EWS alert</div>
            </div>
          </div>
          <button pButton pRipple type="button" icon="pi pi-times" class="p-button-text p-button-rounded p-button-secondary" (click)="close.emit()"></button>
        </div>
      </ng-template>

      <ng-template pTemplate="content">
        <div class="py-2">
          <div *ngIf="!signalsData || signalsData.length === 0" class="p-4 text-center text-600 border-1 border-dashed surface-border border-round-xl font-medium">
            <i class="pi pi-info-circle text-2xl text-400 mb-2 block"></i>
            No detailed rule data available for this account.
          </div>

          <div class="flex flex-column gap-3" *ngIf="signalsData && signalsData.length > 0">
            <div *ngFor="let sig of signalsData" class="surface-card border-1 surface-border border-round-xl p-3 shadow-xs">
              <div class="flex align-items-center gap-3 mb-2">
                <div class="flex align-items-center justify-content-center border-round-lg bg-red-100 text-red-700 font-bold" style="width: 32px; height: 32px; min-width: 32px;">
                  <i class="pi pi-shield text-base"></i>
                </div>
                <span class="font-bold text-base text-900">{{ sig.name }}</span>
              </div>

              <div *ngIf="sig.rules && sig.rules.length > 0" class="flex flex-column gap-2 pl-4 mt-2">
                <div *ngFor="let rule of sig.rules" class="flex align-items-center gap-2 surface-ground border-1 surface-border p-2.5 border-round-lg text-sm text-700">
                  <i class="pi pi-check-circle text-green-500 flex-shrink-0"></i>
                  <span class="font-medium">{{ rule.name || rule }}</span>
                </div>
              </div>

              <div *ngIf="!sig.rules || sig.rules.length === 0" class="pl-4 text-xs text-500 font-italic mt-1">
                Triggered automatically or manually without specific CBS rule details.
              </div>
            </div>
          </div>
        </div>
      </ng-template>

      <ng-template pTemplate="footer">
        <div class="flex justify-content-end w-full pt-3 border-top-1 surface-border">
          <button pButton pRipple label="Close" icon="pi pi-times" class="p-button-outlined p-button-secondary" (click)="close.emit()"></button>
        </div>
      </ng-template>
    </p-drawer>
  `
})
export class SignalsModalComponent {
  @Input() show: boolean = false;
  @Input() signalsData: any[] = [];
  @Output() close = new EventEmitter<void>();
}
