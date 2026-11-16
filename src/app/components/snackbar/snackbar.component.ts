import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SnackbarKind, SnackbarService } from '../../services/snackbar.service';

/**
 * Builds the path of a pixel drawing: one square of 1×1 for each `[ column, row ]`.
 */
function pixels (squares: [ number, number ][]): string {
	return squares.map(([ x, y ]) => `M${x} ${y}h1v1h-1z`).join('');
}

/**
 * Side, in squares, of the grid the icons are drawn on.
 */
export const ICON_GRID = 7;

/**
 * The pixel drawing of each kind: a check, a cross, an i and an exclamation mark, on a 7×7 grid.
 */
const ICONS: Record<SnackbarKind, string> = {
	success: pixels([ [ 0, 3 ], [ 1, 4 ], [ 2, 5 ], [ 3, 4 ], [ 4, 3 ], [ 5, 2 ], [ 6, 1 ] ]),
	error: pixels([ [ 0, 0 ], [ 1, 1 ], [ 2, 2 ], [ 3, 3 ], [ 4, 4 ], [ 5, 5 ], [ 6, 6 ], [ 6, 0 ], [ 5, 1 ], [ 4, 2 ], [ 2, 4 ], [ 1, 5 ], [ 0, 6 ] ]),
	info: pixels([ [ 3, 0 ], [ 2, 2 ], [ 3, 2 ], [ 3, 3 ], [ 3, 4 ], [ 3, 5 ], [ 2, 6 ], [ 3, 6 ], [ 4, 6 ] ]),
	warning: pixels([ [ 3, 0 ], [ 3, 1 ], [ 3, 2 ], [ 3, 3 ], [ 3, 4 ], [ 3, 6 ] ]),
};

/**
 * Color of the border and the icon of each kind: the colors of the LEDs. They are written in full
 * so Tailwind finds them.
 */
const KIND_COLORS: Record<SnackbarKind, { border: string; icon: string }> = {
	success: { border: 'bg-led-green', icon: 'text-led-green' },
	error: { border: 'bg-led-red', icon: 'text-led-red' },
	info: { border: 'bg-led-cyan', icon: 'text-led-cyan' },
	warning: { border: 'bg-led-yellow', icon: 'text-led-yellow' },
};

/**
 * Draws the messages of `SnackbarService` in the bottom right corner of the screen (above the
 * bottom bar on phones). The boxes and the icons are pixel art, black with a colored border; the
 * text is the normal font of the app, so it reads well. It goes once in the root component.
 */
@Component({
	selector: 'app-snackbar',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './snackbar.component.html',
})
export class SnackbarComponent {
	/**
	 * The service that holds the messages to show.
	 */
	protected readonly snackbar = inject(SnackbarService);

	/**
	 * The pixel drawing of each kind.
	 */
	protected readonly icons = ICONS;

	/**
	 * The border and icon colors of each kind.
	 */
	protected readonly colors = KIND_COLORS;

	/**
	 * Side of the icon grid, for the view box.
	 */
	protected readonly grid = ICON_GRID;

	/**
	 * What each kind is called for people who cannot see the icon.
	 */
	protected readonly names: Record<SnackbarKind, string> = {
		success: 'Éxito',
		error: 'Error',
		info: 'Información',
		warning: 'Aviso',
	};
}
