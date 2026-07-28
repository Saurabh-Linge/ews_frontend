import { Component, ElementRef, OnInit, OnDestroy, Renderer2, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppMenu } from './app.menu';
import { LayoutService } from '../service/layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, AppMenu],
  template: ` 
    <div class="layout-sidebar" [class.no-transition]="layoutService.isSidebarResizing()" [style.width.rem]="sidebarWidth">
      <div class="sidebar-header" style="padding: 0.75rem 0.25rem; display: flex; align-items: center; gap: 0.5rem; margin: 0.25rem 0.35rem 0.5rem; border-bottom: 1px solid #e2eaf2;">
        <i class="pi pi-shield" style="font-size: 1.35rem; color: var(--primary-color);"></i>
        <span class="sidebar-brand-name" style="font-family: 'Inter', sans-serif; font-size: 1.15rem; font-weight: 800; color: #1e293b; letter-spacing: -0.02em;">EWS Platform</span>
      </div>
      <app-menu></app-menu>
      <div class="sidebar-resize-handle" 
           (mousedown)="onResizeStart($event)"
           title="Drag to resize sidebar">
      </div>
    </div>`,
  styles: [`
    .layout-sidebar {
      position: fixed;
      height: calc(100vh - 3.5rem);
      top: 3.5rem; /* Below topbar */
      left: 0;
      width: var(--sidebar-width, 15rem);
      background: linear-gradient(180deg, #f4f8fc 0%, #f8fafc 42%, #f7f9fc 100%);
      border-right: 1px solid #d9e2ec;
      box-shadow: inset -1px 0 0 rgba(31, 59, 87, 0.04);
      z-index: 999;
      transition: width 0.3s;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;

      &::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
    }

    .layout-sidebar.no-transition {
      transition: none !important;
    }

    .sidebar-resize-handle {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      cursor: ew-resize;
      background: transparent;
      transition: background-color 0.2s;
      z-index: 1000;
    }
    
    .sidebar-resize-handle:hover {
      background-color: var(--primary-color);
      opacity: 0.5;
    }
    
    .sidebar-resize-handle:active {
      background-color: var(--primary-color);
      opacity: 0.8;
    }
  `]
})
export class AppSidebar implements OnInit, OnDestroy {
  sidebarWidth: number = 15;
  private startX = 0;
  private startWidth = 0;
  private mouseMoveListener: (() => void) | null = null;
  private mouseUpListener: (() => void) | null = null;

  public layoutService = inject(LayoutService);
  public el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  ngOnInit() {
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      const parsedWidth = parseFloat(savedWidth);
      if (!Number.isNaN(parsedWidth)) {
        this.sidebarWidth = Math.max(12, Math.min(24, parsedWidth));
      }
    }
    document.documentElement.style.setProperty('--sidebar-width', `${this.sidebarWidth}rem`);
  }

  ngOnDestroy() {
    this.cleanup();
  }

  onResizeStart(event: MouseEvent) {
    event.preventDefault();
    this.layoutService.isSidebarResizing.set(true);
    this.startX = event.clientX;
    this.startWidth = this.sidebarWidth;

    this.mouseMoveListener = this.renderer.listen('document', 'mousemove', (e: MouseEvent) => {
      if (this.layoutService.isSidebarResizing()) {
        this.zone.run(() => {
          this.onResize(e);
        });
      }
    });

    this.mouseUpListener = this.renderer.listen('document', 'mouseup', () => {
      this.zone.run(() => {
        this.onResizeEnd();
      });
    });

    this.renderer.addClass(document.body, 'sidebar-resizing');
  }

  private onResize(event: MouseEvent) {
    const deltaX = event.clientX - this.startX;
    const deltaRem = deltaX / 16;
    let newWidth = this.startWidth + deltaRem;
    newWidth = Math.max(12, Math.min(24, newWidth));
    this.sidebarWidth = newWidth;
    document.documentElement.style.setProperty('--sidebar-width', `${newWidth}rem`);
    this.cdr.detectChanges();
  }

  private onResizeEnd() {
    this.layoutService.isSidebarResizing.set(false);
    this.renderer.removeClass(document.body, 'sidebar-resizing');
    localStorage.setItem('sidebarWidth', this.sidebarWidth.toString());
    this.cleanup();
  }

  private cleanup() {
    if (this.mouseMoveListener) {
      this.mouseMoveListener();
      this.mouseMoveListener = null;
    }
    if (this.mouseUpListener) {
      this.mouseUpListener();
      this.mouseUpListener = null;
    }
  }
}
