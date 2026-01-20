import {
  Component,
  input,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  signal,
  effect,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { MetricAggregate } from '../../../../core/models/metric.model';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-chart-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ title() }}
        </h3>
        
        <!-- Chart Type Selector -->
        <div class="flex items-center space-x-2">
          <button
            *ngFor="let type of chartTypes"
            (click)="setChartType(type.value)"
            [class]="getChartTypeButtonClass(type.value)"
            [title]="type.label"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path [attr.d]="type.icon" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Chart Canvas -->
      <div class="relative" [style.height.px]="height()">
        <canvas #chartCanvas></canvas>
        
        <!-- Loading Overlay -->
        @if (isLoading()) {
          <div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }
      </div>

      <!-- Stats Footer -->
      <div class="mt-4 pt-4 border-t border-gray-100 grid grid-cols-4 gap-4 text-center">
        <div>
          <p class="text-xs text-gray-500 mb-1">Current</p>
          <p class="text-sm font-semibold" [class]="getValueColorClass(metric().current)">
            {{ metric().current | number:'1.0-1' }}%
          </p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Average</p>
          <p class="text-sm font-semibold text-gray-900">
            {{ metric().avg | number:'1.0-1' }}%
          </p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Peak</p>
          <p class="text-sm font-semibold text-red-600">
            {{ metric().max | number:'1.0-1' }}%
          </p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Low</p>
          <p class="text-sm font-semibold text-green-600">
            {{ metric().min | number:'1.0-1' }}%
          </p>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartWidgetComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  metric = input.required<MetricAggregate>()
  title = input<string>('Default Title');
  height = input<number>(400);

  // Signals
  private _chartType = signal<'line' | 'bar' | 'area'>('line');

  // Readonly signals
  readonly chartType = this._chartType.asReadonly();
  readonly isLoading = signal(false);

  // Chart instance
  private chart: Chart | null = null;
  private animationFrameId: number | null = null;

  // Chart types configuration
  readonly chartTypes = [
    {
      value: 'line' as const,
      label: 'Line Chart',
      icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
    },
    {
      value: 'bar' as const,
      label: 'Bar Chart',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
    {
      value: 'area' as const,
      label: 'Area Chart',
      icon: 'M7 12l3-3 3 3 4-4M3 21h18M3 10h18M3 7l4-4 4 4 4-4 4 4',
    },
  ];

  constructor() {
    // Update chart when metric changes
    effect(() => {
      const metric = this.metric();
      if (this.chart && metric.history.length > 0) {
        this.updateChart();
      }
    });

    // Recreate chart when type changes
    effect(() => {
      this._chartType();
      if (this.chart) {
        this.chart.destroy();
        this.createChart();
      }
    });
  }

  ngAfterViewInit(): void {
    // Wait for next tick to ensure canvas is rendered
    setTimeout(() => {
      this.createChart();
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.chart?.destroy();
  }

  setChartType(type: 'line' | 'bar' | 'area'): void {
    this._chartType.set(type);
  }

  /**
   * Create Chart.js instance
   */
  private createChart(): void {
    if (!this.canvasRef) return;

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const metric = this.metric();
    const config = this.getChartConfig(metric);

    this.chart = new Chart(ctx, config);
  }

  /**
   * Update chart data
   */
  private updateChart(): void {
    if (!this.chart) return;

    const metric = this.metric();
    const labels = this.generateLabels(metric.history.length);

    // Update data
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = metric.history;

    // Update colors based on current value
    const colors = this.getChartColors(metric.current);
    this.chart.data.datasets[0].borderColor = colors.border;
    this.chart.data.datasets[0].backgroundColor = colors.background;

    // Smooth update with animation
    this.chart.update('active');
  }

  /**
   * Get Chart.js configuration
   */
  private getChartConfig(metric: MetricAggregate): ChartConfiguration {
    const labels = this.generateLabels(metric.history.length);
    const colors = this.getChartColors(metric.current);
    const chartType = this._chartType();

    return {
      type: chartType === 'area' ? 'line' : chartType,
      data: {
        labels,
        datasets: [
          {
            label: this.title(),
            data: metric.history,
            borderColor: colors.border,
            backgroundColor: colors.background,
            borderWidth: 2,
            fill: chartType === 'area',
            tension: 0.4, // Smooth lines
            pointRadius: chartType === 'line' ? 0 : 3,
            pointHoverRadius: 5,
            pointBackgroundColor: colors.border,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 750,
          easing: 'easeInOutQuart',
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            borderColor: colors.border,
            borderWidth: 1,
            titleFont: {
              size: 14,
              weight: 'bold',
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: (context) => {
                const value = context.parsed.y ?? 0;
                return `${this.title()}: ${value.toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false,
            },
            ticks: {
              maxTicksLimit: 8,
              font: {
                size: 11,
              },
              color: '#6B7280',
            },
          },
          y: {
            display: true,
            beginAtZero: true,
            max: 100,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              callback: (value) => `${value}%`,
              font: {
                size: 11,
              },
              color: '#6B7280',
            },
          },
        },
      },
    };
  }

  /**
   * Generate time labels for X axis
   */
  private generateLabels(count: number): string[] {
    return Array.from({ length: count }, (_, i) => {
      const secondsAgo = (count - i - 1) * 1; // Assume 1 second intervals
      if (secondsAgo === 0) return 'now';
      if (secondsAgo < 60) return `${secondsAgo}s`;
      return `${Math.floor(secondsAgo / 60)}m`;
    });
  }

  /**
   * Get chart colors based on metric value
   */
  private getChartColors(value: number): {
    border: string;
    background: string | CanvasGradient;
  } {
    // Thresholds
    const warningThreshold = 70;
    const dangerThreshold = 85;

    let borderColor: string;
    let backgroundColor: string;

    if (value >= dangerThreshold) {
      borderColor = '#DC2626'; // red-600
      backgroundColor = 'rgba(220, 38, 38, 0.1)';
    } else if (value >= warningThreshold) {
      borderColor = '#F59E0B'; // amber-500
      backgroundColor = 'rgba(245, 158, 11, 0.1)';
    } else {
      borderColor = '#3B82F6'; // blue-600
      backgroundColor = 'rgba(59, 130, 246, 0.1)';
    }

    // Create gradient for area chart
    if (this._chartType() === 'area' && this.canvasRef) {
      const ctx = this.canvasRef.nativeElement.getContext('2d');
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height());
        
        if (value >= dangerThreshold) {
          gradient.addColorStop(0, 'rgba(220, 38, 38, 0.3)');
          gradient.addColorStop(1, 'rgba(220, 38, 38, 0.0)');
        } else if (value >= warningThreshold) {
          gradient.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
        } else {
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
        }

        return { border: borderColor, background: gradient };
      }
    }

    return { border: borderColor, background: backgroundColor };
  }

  /**
   * Get button class for chart type selector
   */
  getChartTypeButtonClass(type: 'line' | 'bar' | 'area'): string {
    const baseClass = 'p-2 rounded-md transition-colors';
    const activeClass = 'bg-blue-100 text-blue-600';
    const inactiveClass = 'text-gray-400 hover:text-gray-600 hover:bg-gray-100';

    return `${baseClass} ${this._chartType() === type ? activeClass : inactiveClass}`;
  }

  /**
   * Get color class for value display
   */
  getValueColorClass(value: number): string {
    if (value >= 85) return 'text-red-600';
    if (value >= 70) return 'text-yellow-600';
    return 'text-green-600';
  }
}