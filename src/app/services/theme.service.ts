import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'kuv-theme';

/**
 * Light/dark theme. The choice is remembered in localStorage and applied as a `light` class on
 * the root element; the colors themselves live in styles.css.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
	private readonly document = inject(DOCUMENT);

	private readonly state = signal<Theme>(this.initial());

	readonly theme = this.state.asReadonly();

	constructor () {
		effect(() => {
			const theme = this.state();

			this.document.documentElement.classList.toggle('light', theme === 'light');

			try {
				localStorage.setItem(STORAGE_KEY, theme);
			}

			catch {
				// Storage can be blocked; the theme still applies for this session.
			}
		});
	}

	toggle (): void {
		this.state.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
	}

	private initial (): Theme {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);

			if (saved === 'dark' || saved === 'light')
				return saved;
		}

		catch {
			// Fall through to the system preference.
		}

		return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
	}
}
