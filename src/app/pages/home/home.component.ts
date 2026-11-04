import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteHeaderComponent } from '../../components/site-header.component';
import { AnimationRowComponent } from './animation-row.component';
import { SECTIONS } from './home-data';

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
	 * Likes the animation, or takes the like back if it was already liked.
	 */
	protected toggle (id: string): void {
		this.liked.update((liked) => {
			const next = new Set(liked);

			if (!next.delete(id))
				next.add(id);

			return next;
		});
	}
}
