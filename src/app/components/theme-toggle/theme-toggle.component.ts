import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

/**
 * Floating button at the top right that switches between light and dark mode.
 */
@Component({
	selector: 'app-theme-toggle',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './theme-toggle.component.html',
})
export class ThemeToggleComponent {
	/**
	 * The theme service the button switches.
	 */
	protected readonly theme = inject(ThemeService);
}
