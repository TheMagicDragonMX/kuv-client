import { Injectable, signal } from '@angular/core';

/**
 * What a snackbar is about, which sets its color.
 */
export type SnackbarKind = 'success' | 'error' | 'info';

/**
 * A message the snackbar is showing.
 */
export type SnackbarMessage = {
	/**
	 * What the snackbar says.
	 */
	text: string;

	/**
	 * What it is about.
	 */
	kind: SnackbarKind;
};

/**
 * Milliseconds a snackbar stays on screen when the caller does not say.
 */
const DEFAULT_DURATION = 4000;

/**
 * Shows short messages at the bottom of the screen. Any component injects it and calls `show`;
 * `SnackbarComponent`, placed once in the root component, draws it.
 */
@Injectable({ providedIn: 'root' })
export class SnackbarService {
	/**
	 * The message on screen, or null when there is none.
	 */
	readonly message = signal<SnackbarMessage | null>(null);

	/**
	 * The timer that hides the current message.
	 */
	private timer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Shows a message, replacing the one on screen, and hides it after `duration` milliseconds.
	 */
	show (text: string, kind: SnackbarKind = 'info', duration = DEFAULT_DURATION): void {
		this.clearTimer();
		this.message.set({ text, kind });
		this.timer = setTimeout(() => this.dismiss(), duration);
	}

	/**
	 * Shows a success message.
	 */
	success (text: string, duration = DEFAULT_DURATION): void {
		this.show(text, 'success', duration);
	}

	/**
	 * Shows an error message.
	 */
	error (text: string, duration = DEFAULT_DURATION): void {
		this.show(text, 'error', duration);
	}

	/**
	 * Hides the message on screen.
	 */
	dismiss (): void {
		this.clearTimer();
		this.message.set(null);
	}

	/**
	 * Cancels the pending hide, if any.
	 */
	private clearTimer (): void {
		if (null !== this.timer)
			clearTimeout(this.timer);

		this.timer = null;
	}
}
