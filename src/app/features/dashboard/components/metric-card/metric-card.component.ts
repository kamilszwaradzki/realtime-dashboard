import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricAggregate } from '../../../../core/models/metric.model';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <div [class]="iconWrapperClass()">
            <svg class="w-6 h-6" [class]="iconClass()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="iconPath()" />
            </svg>
          </div>
          <h3 class="ml-3 text-sm font-medium text-gray-700">
            {{ title() }}
          </h3>
        </div>
        
        <!-- Trend Indicator -->
        <div [class]="trendClass()">
          @if (metric().trend === 'up') {
            ↑
          } @else if (metric().trend === 'down') {
            ↓
          } @else {
            →
          }
        </div>
      </div>

      <!-- Current Value -->
      <div class="mb-4">
        <div class="flex items-baseline">
          <span [class]="valueClass()" class="text-3xl font-bold">
            {{ metric().current | number:'1.0-1' }}
          </span>
          <span class="ml-2 text-sm text-gray-500">%</span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div>
          <p class="text-xs text-gray-500 mb-1">Avg</p>
          <p class="text-sm font-semibold text-gray-900">
            {{ metric().avg | number:'1.0-1' }}%
          </p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Min</p>
          <p class="text-sm font-semibold text-gray-900">
            {{ metric().min | number:'1.0-1' }}%
          </p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Max</p>
          <p class="text-sm font-semibold text-gray-900">
            {{ metric().max | number:'1.0-1' }}%
          </p>
        </div>
      </div>

      <!-- Sparkline (mini chart) -->
      <div class="mt-4 h-12">
        <svg class="w-full h-full" preserveAspectRatio="none">
          <polyline
            [attr.points]="sparklinePoints()"
            fill="none"
            [attr.stroke]="sparklineColor()"
            stroke-width="2"
            class="transition-all duration-300"
          />
        </svg>
      </div>

      <!-- Alert Badge -->
      @if (isOverThreshold()) {
        <div class="mt-3 flex items-center text-xs text-red-600 bg-red-50 rounded px-2 py-1">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          Above threshold ({{ threshold() }}%)
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCardComponent {
  metric = input.required<MetricAggregate>();

  threshold = input<number>(80);

  readonly isOverThreshold = computed(() =>
    this.metric().current > this.threshold()
  );
  readonly title = computed(() => {
    const titles: Record<string, string> = {
      cpu: 'CPU Usage',
      memory: 'Memory',
      network: 'Network',
      disk: 'Disk I/O',
    };
    return titles[this.metric().type] || this.metric().type.toUpperCase();
  });

  readonly iconPath = computed(() => {
    const paths: Record<string, string> = {
      cpu: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
      memory: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
      network: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
      disk: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    };
    return paths[this.metric().type] || paths['cpu'];
  });

  readonly valueClass = computed(() => {
    const value = this.metric().current;
    if (value > this.threshold()) return 'text-red-600';
    if (value > this.threshold() * 0.8) return 'text-yellow-600';
    return 'text-green-600';
  });

  readonly iconClass = computed(() => {
    const value = this.metric().current;
    if (value > this.threshold()) return 'text-red-500';
    if (value > this.threshold() * 0.8) return 'text-yellow-500';
    return 'text-blue-500';
  });

  readonly iconWrapperClass = computed(() => {
    const value = this.metric().current;
    if (value > this.threshold()) return 'p-2 bg-red-50 rounded-lg';
    if (value > this.threshold() * 0.8) return 'p-2 bg-yellow-50 rounded-lg';
    return 'p-2 bg-blue-50 rounded-lg';
  });

  readonly trendClass = computed(() => {
    const base = 'text-sm font-semibold';
    const trend = this.metric().trend;
    if (trend === 'up') return `${base} text-red-600`;
    if (trend === 'down') return `${base} text-green-600`;
    return `${base} text-gray-400`;
  });

  readonly sparklineColor = computed(() => {
    const value = this.metric().current;
    if (value > this.threshold()) return '#dc2626'; // red-600
    if (value > this.threshold() * 0.8) return '#ca8a04'; // yellow-600
    return '#2563eb'; // blue-600
  });

  readonly sparklinePoints = computed(() => {
    const history = this.metric().history;
    if (history.length < 2) return '';

    const width = 100; // SVG viewBox width
    const height = 100; // SVG viewBox height
    const padding = 10;

    const maxValue = Math.max(...history, 100);
    const minValue = Math.min(...history, 0);
    const range = maxValue - minValue || 1;

    return history
      .map((value, index) => {
        const x = padding + (index / (history.length - 1 || 1)) * (width - 2 * padding);
        const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
        return `${x},${y}`;
      })
      .join(' ');
  });
}