import { ChangeDetectionStrategy, Component, WritableSignal, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteHeaderComponent } from '../../components/site-header/site-header.component';
import { SnackbarService } from '../../services/snackbar.service';
import { AnimationRowComponent } from './animation-row.component';
import { COMMUNITY, SECTIONS } from './home-data';

/**
 * The home page: the animations the community made for the cube, in rows to look through, and the
 * way to make one's own. The animations are examples until the shared library has a server.
 */
@Component({
	selector: 'app-home',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ RouterLink, SiteHeaderComponent, AnimationRowComponent ],
	templateUrl: './home.component.html',
})
export class HomePage {
	/**
	 * The rows of the page.
	 */
	protected readonly sections = SECTIONS;

	/**
	 * The ids of the animations the user liked. It is only kept while the page is open.
	 */
	protected readonly liked = signal<ReadonlySet<string>>(new Set());

	/**
	 * The ids of the animations the user saved. It is only kept while the page is open.
	 */
	protected readonly saved = signal<ReadonlySet<string>>(new Set());

	/**
	 * The ids of the user's favorite animations. It is only kept while the page is open.
	 */
	protected readonly favorites = signal<ReadonlySet<string>>(new Set());

	/**
	 * Shows short messages at the bottom of the screen.
	 */
	private readonly snackbar = inject(SnackbarService);

	/**
	 * The user asked to see an animation. The animations of the page are examples with no program
	 * behind them yet, so it says so instead of pretending to show one.
	 */
	protected view (id: string): void {
		const animation = COMMUNITY.find((candidate) => id === candidate.id);

		this.snackbar.show(`"${animation?.title ?? id}" todavía no se puede visualizar: las animaciones de Inicio son ejemplos hasta que la biblioteca compartida tenga servidor.`);
	}

	/**
	 * Adds the animation to a list of the user (liked, saved or favorites), or takes it out if it
	 * was already in it.
	 */
	protected toggle (list: WritableSignal<ReadonlySet<string>>, id: string): void {
		list.update((ids) => {
			const next = new Set(ids);

			if (!next.delete(id))
				next.add(id);

			return next;
		});
	}
}
