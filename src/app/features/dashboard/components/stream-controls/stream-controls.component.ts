import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy,
  signal 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StreamConfig, BackpressureStrategy } from '../../../../core/models/stream-config.model';

@Component({
  selector: 'app-stream-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div class="flex flex-wrap items-center justify-between gap-4">
        
        <!-- Left: Playback Controls -->
        <div class="flex items-center space-x-2">
          @if (!isConnected) {
            <button
              (click)="start.emit()"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
              </svg>
              Start
            </button>
          } @else {
            @if (isPaused) {
              <button
                (click)="resume.emit()"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                </svg>
                Resume
              </button>
            } @else {
              <button
                (click)="pause.emit()"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Pause
              </button>
            }

            <button
              (click)="stop.emit()"
              class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
              </svg>
              Stop
            </button>
          }

          <button
            (click)="clear.emit()"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            title="Clear all metrics"
          >
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
        </div>

        <!-- Right: Configuration -->
        <div class="flex items-center space-x-4">
          <!-- Strategy Selector -->
          <div class="flex items-center space-x-2">
            <label for="strategy" class="text-sm font-medium text-gray-700 whitespace-nowrap">
              Strategy:
            </label>
            <select
              id="strategy"
              [(ngModel)]="selectedStrategy"
              (ngModelChange)="onStrategyChange($event)"
              class="block w-32 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="throttle">Throttle</option>
              <option value="debounce">Debounce</option>
              <option value="buffer">Buffer</option>
              <option value="sample">Sample</option>
            </select>
          </div>

          <!-- Interval Input -->
          <div class="flex items-center space-x-2">
            <label for="interval" class="text-sm font-medium text-gray-700 whitespace-nowrap">
              Interval:
            </label>
            <input
              id="interval"
              type="number"
              [(ngModel)]="selectedInterval"
              (ngModelChange)="onIntervalChange($event)"
              min="100"
              max="5000"
              step="100"
              class="block w-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <span class="text-sm text-gray-500">ms</span>
          </div>

          <!-- Settings Toggle -->
          <button
            (click)="showAdvanced.set(!showAdvanced())"
            class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Advanced settings"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Advanced Settings Panel -->
      @if (showAdvanced()) {
        <div class="mt-4 pt-4 border-t border-gray-200">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <!-- Strategy Description -->
            <div class="md:col-span-2">
              <h4 class="text-sm font-medium text-gray-900 mb-2">
                {{ getStrategyTitle(selectedStrategy) }}
              </h4>
              <p class="text-sm text-gray-600">
                {{ getStrategyDescription(selectedStrategy) }}
              </p>
            </div>

            <!-- Buffer Size (only for buffer strategy) -->
            @if (selectedStrategy === 'buffer') {
              <div>
                <label for="bufferSize" class="block text-sm font-medium text-gray-700 mb-1">
                  Buffer Size
                </label>
                <input
                  id="bufferSize"
                  type="number"
                  [(ngModel)]="selectedBufferSize"
                  (ngModelChange)="onBufferSizeChange($event)"
                  min="1"
                  max="100"
                  class="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p class="mt-1 text-xs text-gray-500">
                  Max items per batch
                </p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreamControlsComponent {
  @Input() isPaused = false;
  @Input() isConnected = false;
  @Input() set config(value: StreamConfig) {
    this.selectedStrategy = value.strategy;
    this.selectedInterval = value.interval;
    this.selectedBufferSize = value.bufferSize || 10;
  }

  @Output() start = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() resume = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() configChange = new EventEmitter<Partial<StreamConfig>>();

  // Component state
  showAdvanced = signal(false);
  selectedStrategy: BackpressureStrategy = 'throttle';
  selectedInterval = 1000;
  selectedBufferSize = 10;

  onStrategyChange(strategy: BackpressureStrategy): void {
    this.configChange.emit({ strategy });
  }

  onIntervalChange(interval: number): void {
    this.configChange.emit({ interval });
  }

  onBufferSizeChange(bufferSize: number): void {
    this.configChange.emit({ bufferSize });
  }

  getStrategyTitle(strategy: BackpressureStrategy): string {
    const titles: Record<BackpressureStrategy, string> = {
      throttle: 'Throttle Strategy',
      debounce: 'Debounce Strategy',
      buffer: 'Buffer Strategy',
      sample: 'Sample Strategy',
    };
    return titles[strategy];
  }

  getStrategyDescription(strategy: BackpressureStrategy): string {
    const descriptions: Record<BackpressureStrategy, string> = {
      throttle: 'Emits first value immediately, then ignores subsequent values for the specified interval. Best for rate-limiting user actions.',
      debounce: 'Waits for silence (no new values) for the specified interval before emitting. Useful for search-as-you-type.',
      buffer: 'Collects values into batches and emits them together at regular intervals. Good for batch processing.',
      sample: 'Emits the most recent value at regular intervals. Ideal for periodic sampling of high-frequency data.',
    };
    return descriptions[strategy];
  }
}