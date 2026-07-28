import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-hero">
      <div class="hero-left">
        <div class="hero-tag" *ngIf="tag">{{ tag }}</div>
        <h1>{{ title }}</h1>
        <p *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="hero-right" *ngIf="roleBadge || roleIcon">
        <span class="role-badge">
          <i class="pi" [ngClass]="roleIcon" *ngIf="roleIcon"></i> {{ roleBadge }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      margin-bottom: 2rem;
    }

    .dashboard-hero {
      background: linear-gradient(135deg, #2f55e0 0%, #4361ee 100%);
      border-radius: 16px;
      padding: 2.25rem 2rem;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
      box-shadow: 0 10px 30px rgba(37, 69, 184, 0.2);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -20%;
        width: 300px;
        height: 300px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.12);
        filter: blur(50px);
        pointer-events: none;
      }

      .hero-left {
        flex: 1;
        min-width: 280px;

        .hero-tag {
          display: inline-block;
          text-transform: uppercase;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          background: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 30px;
          margin-bottom: 0.75rem;
          backdrop-filter: blur(4px);
          color: #ffffff;
        }

        h1 {
          margin: 0;
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
          color: #152347;
        }

        p {
          margin: 0.5rem 0 0 0;
          font-size: 1.05rem;
          opacity: 0.95;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.95);
        }
      }

      .hero-right {
        display: flex;
        align-items: center;

        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.6rem 1.2rem;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 700;
          color: #ffffff;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);

          i {
            font-size: 1.1rem;
            color: #ffffff;
          }
        }
      }
    }
  `]
})
export class HeroComponent {
  @Input() title: string = '';
  @Input() subtitle?: string;
  @Input() tag?: string;
  @Input() roleBadge?: string;
  @Input() roleIcon?: string;
}
