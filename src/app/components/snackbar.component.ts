import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SnackbarKind, SnackbarService } from '../services/snackbar.service';

/**
 * Border and text colors of each kind of snackbar.
 */
const KIND_CLASSES: Record<SnackbarKind, string> = {
	success: 'border-emerald-400/40 text-emerald-200',
	error: 'border-red-400/40 text-red-200',
	info: 'border-blue-400/40 text-blue-200',
};

/**
 * Draws the message of `SnackbarService` at the bottom center of the screen. It goes once in the
 * root component.
 */
@Component({
	selector: 'app-snackbar',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" aria-live="polite">
			@if (snackbar.message(); as message) {
				<div
					class="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border bg-(--surface) px-4 py-3 text-[0.92rem] shadow-[0_10px_30px_var(--shadow)] backdrop-blur-[6px]"
					[class]="kindClasses[message.kind]"
					[attr.role]="'error' === message.kind ? 'alert' : 'status'"
				>
					<span>{{ message.text }}</span>
					<button type="button" class="cursor-pointer text-lg leading-none opacity-70 hover:opacity-100" aria-label="Cerrar" (click)="snackbar.dismiss()">×</button>
				</div>
			}
		</div>
	`,
})
export class SnackbarComponent {
	/**
	 * The service that holds the message to show.
	 */
	protected readonly snackbar = inject(SnackbarService);

	/**
	 * The classes of each kind of message.
	 */
	protected readonly kindClasses = KIND_CLASSES;
}
