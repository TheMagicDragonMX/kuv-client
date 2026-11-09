import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

/**
 * The color theme of the app.
 */
export type Theme = 'dark' | 'light';

/**
 * The localStorage key where the choice is remembered.
 */
const STORAGE_KEY = 'kuv-theme';

/**
 * Light/dark theme. The choice is remembered in localStorage and applied as a `light` class on
 * the root element; the colors themselves live in styles.css.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
	/**
	 * The document whose root element carries the `light` class.
	 */
	private readonly document = inject(DOCUMENT);

	/**
	 * The current theme, writable only from this service.
	 */
	private readonly state = signal<Theme>(this.initial());

	/**
	 * The current theme, read-only.
	 */
	readonly theme = this.state.asReadonly();

	/**
	 * Applies the theme to the page and remembers it every time it changes.
	 */
	constructor () {
		effect(() => {
			const theme = this.state();

			this.document.documentElement.classList.toggle('light', 'light' === theme);

			try {
				localStorage.setItem(STORAGE_KEY, theme);
			}

			catch {
				/**
				 * Storage can be blocked; the theme still applies for this session.
				 */
			}
		});
	}

	/**
	 * Switches between dark and light.
	 */
	toggle (): void {
		this.state.update((theme) => ('dark' === theme ? 'light' : 'dark'));
	}

	/**
	 * The saved theme, or the system preference when nothing was saved.
	 */
	private initial (): Theme {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);

			if ('dark' === saved || 'light' === saved)
				return saved;
		}

		catch {
			/**
			 * Fall through to the system preference.
			 */
		}

		return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
	}
}
