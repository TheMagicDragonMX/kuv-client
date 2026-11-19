import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MenuSoundService } from '../../services/menu-sound.service';

/**
 * The button that turns the sounds of the menus on or off, with a pixel speaker that shows its
 * waves while they are on. It goes on a `<button>` so each screen gives it its own place and look.
 */
@Component({
	selector: 'button[appSoundToggle]',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		type: 'button',
		'aria-label': 'Sonidos del menú',
		'[attr.aria-pressed]': 'sound.enabled()',
		'[title]': 'sound.enabled() ? "Silenciar sonidos" : "Activar sonidos"',
		'(click)': 'sound.toggle()',
	},
	template: `
		<svg class="size-4.5" viewBox="0 0 9 8" shape-rendering="crispEdges" aria-hidden="true">
			<rect x="0" y="3" width="2" height="2" fill="currentColor" /><rect x="2" y="2" width="1" height="4" fill="currentColor" /><rect x="3" y="1" width="1" height="6" fill="currentColor" /><rect x="4" y="0" width="1" height="8" fill="currentColor" />
			@if (sound.enabled()) {
				<rect x="6" y="3" width="1" height="2" fill="currentColor" /><rect x="7" y="1" width="1" height="1" fill="currentColor" /><rect x="8" y="2" width="1" height="4" fill="currentColor" /><rect x="7" y="6" width="1" height="1" fill="currentColor" />
			} @else {
				<rect x="6" y="2" width="1" height="1" fill="currentColor" /><rect x="7" y="3" width="1" height="2" fill="currentColor" /><rect x="8" y="2" width="1" height="1" fill="currentColor" /><rect x="6" y="5" width="1" height="1" fill="currentColor" /><rect x="8" y="5" width="1" height="1" fill="currentColor" />
			}
		</svg>
	`,
})
export class SoundToggleComponent {
	/**
	 * The sounds of the menus.
	 */
	protected readonly sound = inject(MenuSoundService);
}
