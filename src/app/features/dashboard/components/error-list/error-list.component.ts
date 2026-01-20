import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppError } from '../../../../core/models/error.model';

@Component({
  selector: 'app-error-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
      <!-- Header -->
      <div class="px-4 py-3 bg-red-100 flex items-center justify-between">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <h3 class="text-sm font-semibold text-red-900">
            Errors ({{ errors.length }})
          </h3>
        </div>
        
        <button
          (click)="clearErrors.emit()"
          class="text-xs font-medium text-red-700 hover:text-red-900 hover:underline"
        >
          Clear All
        </button>
      </div>

      <!-- Error List -->
      <div class="divide-y divide-red-200">
        @for (error of errors; track error.timestamp) {
          <div class="px-4 py-3 hover:bg-red-100 transition-colors">
            <div class="flex items-start justify-between">
              <!-- Error Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center mb-1">
                  <!-- Severity Badge -->
                  <span [class]="getSeverityBadgeClass(error.severity)">
                    {{ error.severity }}
                  </span>
                  
                  <!-- Error Code -->
                  <span class="ml-2 text-xs font-mono text-gray-600">
                    {{ error.code }}
                  </span>

                  <!-- Retryable Indicator -->
                  @if (error.retryable) {
                    <span class="ml-2 text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                      Retryable
                    </span>
                  }
                </div>
                
                <!-- Error Message -->
                <p class="text-sm text-red-800 mt-1">
                  {{ error.message }}
                </p>

                <!-- Metadata (if present) -->
                @if (error.metadata && hasMetadata(error.metadata)) {
                  <details class="mt-2">
                    <summary class="text-xs text-red-700 cursor-pointer hover:underline">
                      View details
                    </summary>
                    <pre class="mt-2 text-xs bg-red-900 text-red-100 p-2 rounded overflow-x-auto">{{ error.metadata | json }}</pre>
                  </details>
                }
              </div>

              <!-- Timestamp -->
              <div class="ml-4 flex-shrink-0 text-xs text-red-600">
                {{ formatTimestamp(error.timestamp) }}
              </div>
            </div>
          </div>
        } @empty {
          <div class="px-4 py-3 text-sm text-red-700 text-center">
            No errors
          </div>
        }
      </div>

      <!-- Footer (if many errors) -->
      @if (errors.length > 5) {
        <div class="px-4 py-2 bg-red-100 text-center text-xs text-red-700">
          Showing {{ errors.length }} most recent errors
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorListComponent {
  @Input({ required: true }) errors: AppError[] = [];
  @Output() clearErrors = new EventEmitter<void>();

  getSeverityBadgeClass(severity: AppError['severity']): string {
    const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase';
    
    switch (severity) {
      case 'critical':
        return `${base} bg-red-600 text-white`;
      case 'error':
        return `${base} bg-red-500 text-white`;
      case 'warning':
        return `${base} bg-yellow-500 text-white`;
      case 'info':
        return `${base} bg-blue-500 text-white`;
      default:
        return `${base} bg-gray-500 text-white`;
    }
  }

  formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return timestamp.toLocaleTimeString();
  }

  hasMetadata(metadata: Record<string, unknown>): boolean {
    return Object.keys(metadata).length > 0;
  }
}