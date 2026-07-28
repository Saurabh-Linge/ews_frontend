import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { PopoverModule } from 'primeng/popover';
import { LayoutService } from '../service/layout.service';
import { EwsStateService } from '../../../features/ews/services/ews-state.service';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    TooltipModule,
    SelectModule,
    PopoverModule,
  ],
  template: `
    <div class="layout-topbar">
      <div class="layout-topbar-left">
        <button
          pTooltip="Menu"
          tooltipPosition="bottom"
          class="layout-menu-button layout-topbar-action"
          (click)="layoutService.onMenuToggle()"
        >
          <i class="pi pi-bars"></i>
        </button>
        <a class="layout-topbar-logo" routerLink="/">
          <span class="bank-name">RAJARSHI SHAHU SAHAKARI BANK LTD.</span>
        </a>
      </div>

      <div class="layout-topbar-actions">
        <!-- Language Dropdown -->
        <p-select
          [options]="languages"
          [(ngModel)]="selectedLanguage"
          (ngModelChange)="onLanguageChange($event)"
          optionLabel="label"
          optionValue="value"
          appendTo="body"
          class="hide-on-small"
        >
          <ng-template pTemplate="selectedItem">
            <div class="flex align-items-center gap-2" *ngIf="selectedLanguage">
              <i class="pi pi-language"></i>
              <span>{{ selectedLanguage === 'en' ? 'English' : 'मराठी' }}</span>
            </div>
          </ng-template>
        </p-select>

        <!-- Notification Bell Container -->
        <div class="notification-container hide-on-small">
          <p-button
            icon="pi pi-bell"
            pTooltip="Notification"
            tooltipPosition="bottom"
            severity="secondary"
            (click)="op.toggle($event)"
          >
          </p-button>
          <span *ngIf="unreadCount() > 0" class="notification-badge animate-fadein">
            {{ unreadCount() }}
          </span>
        </div>

        <p-popover #op [style]="{ width: '380px', padding: '0' }" styleClass="notification-popover-panel">
          <div class="notification-dropdown-card">
            <div class="notification-dropdown-header" style="padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb;">
              <span style="font-weight: 700; font-size: 1rem; color: #111827;">Notifications</span>
              <span *ngIf="unreadCount() > 0" class="unread-badge" style="background: #ef4444; color: #fff; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 99px;">
                {{ unreadCount() }} new
              </span>
            </div>
            <div class="notification-list-container" style="max-height: 280px; overflow-y: auto; padding: 0.5rem;">
              <div *ngIf="notifications().length === 0" style="padding: 1.5rem; text-align: center; color: #6b7280;">
                <i class="pi pi-bell" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                <p style="margin: 0; font-weight: 600;">No notifications to display</p>
              </div>
              <div *ngFor="let n of notifications()" style="padding: 0.75rem; border-bottom: 1px solid #f3f4f6; cursor: pointer;">
                <div style="font-weight: 700; font-size: 0.85rem; color: #111827;">{{ n.title }}</div>
                <div style="font-size: 0.78rem; color: #4b5563; margin-top: 0.2rem;">{{ n.message }}</div>
              </div>
            </div>
          </div>
        </p-popover>

        <!-- User Profile Chip Avatar -->
        <div
          class="topbar-profile flex align-items-center gap-3 hide-on-small"
          (click)="logout()"
          tooltipPosition="bottom"
          style="padding: 0.35rem 0.75rem; margin-right: 0.5rem; border-radius: 8px; cursor: pointer; transition: all 0.2s ease-in-out; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);"
          onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.16)';"
          onmouseout="this.style.background='rgba(255, 255, 255, 0.04)'; this.style.borderColor='rgba(255, 255, 255, 0.08)';"
        >
          <div
            class="profile-avatar flex align-items-center justify-content-center"
            style="width: 2.25rem; height: 2.25rem; border-radius: 50%; background: linear-gradient(135deg, #eaf1f8, #cbe0f2); color: #173a59; font-weight: 700; font-size: 0.95rem; border: 2px solid rgba(255, 255, 255, 0.4); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08); transition: transform 0.2s;"
            onmouseover="this.style.transform='scale(1.05)';"
            onmouseout="this.style.transform='scale(1)';"
            (click)="$event.stopPropagation()"
          >
            {{ userAvatarInitial() }}
          </div>
          <div class="flex flex-column text-left" style="line-height: 1.25;">
            <span
              class="profile-name"
              style="font-weight: 600; font-size: 0.85rem; color: #ffffff; letter-spacing: 0.02em;"
              >{{ userName() }}</span
            >
            <span
              class="profile-role"
              style="font-size: 0.68rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255, 255, 255, 0.65);"
              >{{ userRoleLabel() }}</span
            >
          </div>
        </div>

        <!-- Power Off Logout Button -->
        <div class="window-controls">
          <p-button
            icon="pi pi-power-off"
            pTooltip="Logout"
            tooltipPosition="bottom"
            styleClass="hide-on-small"
            severity="danger"
            (click)="logout()"
          ></p-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep {
      .bank-name {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 1rem !important;
        font-weight: 800 !important;
        text-transform: uppercase !important;
        letter-spacing: 0 !important;
        white-space: nowrap !important;
        color: #ffffff !important;
      }

      .layout-menu-button i {
        font-size: 1.1rem !important;
        color: #ffffff !important;
      }

      .notification-container {
        position: relative;
        display: inline-flex;
        align-items: center;
      }

      .notification-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background-color: #ef4444;
        color: #ffffff;
        font-size: 0.65rem;
        font-weight: 700;
        border-radius: 9999px;
        min-width: 1rem;
        height: 1rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        border: 1.5px solid #5c6bc0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        pointer-events: none;
        z-index: 10;
      }

      .layout-topbar-actions .p-button {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 4px;
        box-shadow: none;
      }

      .layout-topbar-actions .p-button.p-button-secondary {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }

      .layout-topbar-actions .p-button.p-button-secondary .p-button-icon {
        color: #ffffff;
        font-size: 1rem;
      }

      .layout-topbar-actions .p-button.p-button-secondary:hover {
        background: rgba(255, 255, 255, 0.16);
        border-color: rgba(255, 255, 255, 0.28);
      }

      .layout-topbar-actions .p-select {
        height: 2.25rem;
        border-radius: 4px;
        align-items: center;
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }

      .layout-topbar-actions .p-select .pi-language {
        font-size: 0.95rem;
        color: #ffffff;
      }

      .layout-topbar-actions .p-select-label {
        display: flex;
        align-items: center;
        padding-top: 0;
        padding-bottom: 0;
        font-size: 0.875rem;
        color: #ffffff;
      }

      .layout-topbar-actions .p-select-dropdown {
        color: #ffffff;
      }

      .layout-topbar-actions .p-select-dropdown .p-icon,
      .layout-topbar-actions .p-select-dropdown-icon {
        font-size: 0.8rem;
        color: #ffffff;
      }
    }

    .software-date-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 4px 10px;
      border-radius: 999px;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-left: 1rem;
    }
  `]
})
export class AppTopbar {
  private router = inject(Router);
  public layoutService = inject(LayoutService);
  public ewsState = inject(EwsStateService);
  private authService = inject(AuthService);

  languages = [
    { label: 'English', value: 'en' },
    { label: 'मराठी', value: 'mr' }
  ];
  selectedLanguage = 'en';

  notifications = signal<any[]>([]);
  unreadCount = signal<number>(43);

  onLanguageChange(lang: string) {
    this.selectedLanguage = lang;
    if (lang === 'mr') {
      document.body.classList.add('lang-mr');
    } else {
      document.body.classList.remove('lang-mr');
    }
  }

  userAvatarInitial(): string {
    const name = this.ewsState.user()?.full_name || 'Administrator';
    return name.substring(0, 1).toUpperCase() || 'A';
  }

  userName(): string {
    return this.ewsState.user()?.full_name || 'Administrator';
  }

  userRoleLabel(): string {
    const r = this.ewsState.role() || 'admin';
    if (r === 'cro') return 'CRO';
    if (r === 'ro') return 'RO';
    if (r === 'admin') return 'ADMIN';
    return 'BRANCH';
  }

  logout() {
    this.authService.logout();
  }
}
