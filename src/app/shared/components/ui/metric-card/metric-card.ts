import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-card',
  template: `
    <div class="metric-card" [ngClass]="theme">
      <div class="card-glow"></div>
      <div class="card-icon"><i class="pi" [ngClass]="icon"></i></div>
      <div class="card-details">
        <span class="card-title">{{ title }}</span>
        <span class="card-value">{{ value }}</span>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class MetricCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() icon: string = 'pi-chart-bar';
  @Input() theme: string = 'theme-blue'; // theme-blue, theme-purple, theme-emerald, theme-amber, theme-red
}
