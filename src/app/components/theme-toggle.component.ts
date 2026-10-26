import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../services/theme.service';

/**
 * Floating button at the top right that switches between light and dark mode.
 */
@Component({
	selector: 'app-theme-toggle',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button
			type="button"
			class="fixed top-4 right-4 z-50 grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-slate-400/20 bg-(--surface) text-slate-100 shadow-[0_10px_30px_var(--shadow)] backdrop-blur-[6px] transition duration-150 hover:bg-slate-400/15"
			[attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
			(click)="theme.toggle()"
		>
			@if (theme.theme() === 'dark') {
				<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
				</svg>
			} @else {
				<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
				</svg>
			}
		</button>
	`,
})
export class ThemeToggleComponent {
	protected readonly theme = inject(ThemeService);
}
