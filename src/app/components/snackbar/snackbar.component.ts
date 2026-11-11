import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SnackbarKind, SnackbarService } from '../../services/snackbar.service';

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
	templateUrl: './snackbar.component.html',
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
