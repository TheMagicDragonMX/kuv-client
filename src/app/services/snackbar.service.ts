import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

/**
 * What a snackbar is about, which sets its icon and color.
 */
export type SnackbarKind = 'success' | 'error' | 'info' | 'warning';

/**
 * A message the snackbar is showing.
 */
export type SnackbarMessage = {
	/**
	 * Tells it apart from the others on screen.
	 */
	id: number;

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
 * Milliseconds each kind of message stays on screen when the caller does not say. Errors stay
 * longer: they are the ones people need to read.
 */
const DURATIONS: Record<SnackbarKind, number> = {
	success: 4000,
	info: 4000,
	warning: 6000,
	error: 6000,
};

/**
 * Most messages on screen at once. When another comes, the oldest goes.
 */
const MAX_MESSAGES = 4;

/**
 * Shows short messages in a corner of the screen. Any component or service injects it and calls
 * `success`, `error`, `info`, `warning` (or `show`, for a kind chosen at runtime);
 * `SnackbarComponent`, placed once in the root component, draws them. Messages pile up, the newest
 * at the bottom, and each one hides itself after its time.
 */
@Injectable({ providedIn: 'root' })
export class SnackbarService {
	/**
	 * The messages on screen, the oldest first.
	 */
	readonly messages = signal<SnackbarMessage[]>([]);

	/**
	 * The id the next message gets.
	 */
	private nextId = 1;

	/**
	 * The timers that hide the messages, by the id of the message.
	 */
	private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

	/**
	 * Shows a message and hides it after `duration` milliseconds (by default, what its kind has).
	 * If the same message is already on screen it stays where it is and its time starts again,
	 * instead of piling up a copy.
	 */
	show (text: string, kind: SnackbarKind = 'info', duration = DURATIONS[kind]): void {
		const repeated = this.messages().find((message) => message.text === text && message.kind === kind);
		const message = repeated ?? { id: this.nextId++, text, kind };

		if (!repeated)
			this.messages.update((messages) => [ ...messages, message ]);

		this.clearTimer(message.id);
		this.timers.set(message.id, setTimeout(() => this.dismiss({ id: message.id }), duration));

		for (const old of this.messages().slice(0, -MAX_MESSAGES))
			this.dismiss({ id: old.id });
	}

	/**
	 * Shows a success message: something worked.
	 */
	success (text: string, duration?: number): void {
		this.show(text, 'success', duration);
	}

	/**
	 * Shows an error message: something failed.
	 */
	error (text: string, duration?: number): void {
		this.show(text, 'error', duration);
	}

	/**
	 * Shows an info message: something the user should know.
	 */
	info (text: string, duration?: number): void {
		this.show(text, 'info', duration);
	}

	/**
	 * Shows a warning: something worked, but not as the user may expect, or may go wrong.
	 */
	warning (text: string, duration?: number): void {
		this.show(text, 'warning', duration);
	}

	/**
	 * Shows an error for a failed request: the message the API sent if it sent one, or else
	 * `fallback`.
	 */
	failure (error: unknown, fallback: string): void {
		const sent = error instanceof HttpErrorResponse ? error.error?.message : null;

		this.error('string' === typeof sent && '' !== sent ? sent : fallback);
	}

	/**
	 * Hides a message.
	 */
	dismiss (params: { id: number }): void {
		this.clearTimer(params.id);
		this.messages.update((messages) => messages.filter((message) => message.id !== params.id));
	}

	/**
	 * Hides every message.
	 */
	clear (): void {
		for (const id of this.timers.keys())
			this.clearTimer(id);

		this.messages.set([]);
	}

	/**
	 * Cancels the pending hide of a message, if any.
	 */
	private clearTimer (id: number): void {
		const timer = this.timers.get(id);

		if (undefined !== timer)
			clearTimeout(timer);

		this.timers.delete(id);
	}
}
