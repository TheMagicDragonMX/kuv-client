import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, WritableSignal, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FeedCreation } from '../../models';
import { AuthSession } from '../../services/auth-session.service';
import { FeedService } from '../../services/middle/feed.service';
import { CreationsService } from '../../services/middle/creations.service';
import { SnackbarService } from '../../services/snackbar.service';
import { AnimationRowComponent } from './animation-row.component';
import { CommunityAnimation, EMPTY_SECTIONS, HomeSection, artFor } from './home-data';

/**
 * How many of the newest animations the home page asks for.
 */
const NEW_LIMIT = 20;

/**
 * The home page: the animations the community made for the cube, in rows to look through, and the
 * way to make one's own. The first row has the newest animations, which come from the API; the
 * other rows have no endpoint yet, so they are empty.
 */
@Component({
	selector: 'app-home',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ RouterLink, AnimationRowComponent ],
	templateUrl: './home.component.html',
})
export class HomePage {
	/**
	 * The newest animations, or null while they are being fetched.
	 */
	protected readonly newest = signal<CommunityAnimation[] | null>(null);

	/**
	 * The rows of the page.
	 */
	protected readonly sections = computed<HomeSection[]>(() => [
		{ id: 'nuevas', title: 'Nuevas animaciones', animations: this.newest() ?? [], loading: null === this.newest() },
		...EMPTY_SECTIONS,
	]);

	/**
	 * The animations the user liked, by their ID.
	 */
	protected readonly liked = signal<ReadonlySet<string>>(new Set());

	/**
	 * The animations the user saved for later, by their ID.
	 */
	protected readonly saved = signal<ReadonlySet<string>>(new Set());

	/**
	 * The animations the user put into their favorites, by their ID.
	 */
	protected readonly favorites = signal<ReadonlySet<string>>(new Set());

	/**
	 * Shows the user a short message.
	 */
	private readonly snackbar = inject(SnackbarService);

	/**
	 * Router for navigating to the animation details page.
	 */
	private readonly router = inject(Router);

	/**
	 * Reads the categories of the feed.
	 */
	private readonly feed = inject(FeedService);

	/**
	 * Builds the address of the videos and thumbnails.
	 */
	private readonly creations = inject(CreationsService);

	/**
	 * The session, for the token a video needs in its address.
	 */
	private readonly session = inject(AuthSession);

	/**
	 * Asks for the newest animations.
	 */
	constructor () {
		this.feed.newCreations({ limit: NEW_LIMIT }).subscribe({
			next: (creations) => this.newest.set(creations.map((creation) => this.toAnimation(creation))),
			error: (error: HttpErrorResponse) => {
				this.newest.set([]);
				this.snackbar.show(0 === error.status
					? 'No se pudo conectar para cargar las nuevas animaciones.'
					: 'No se pudieron cargar las nuevas animaciones.');
			},
		});
	}

	/**
	 * Navigates to the detail and visualizer page for the chosen animation.
	 */
	protected view (id: string): void {
		this.router.navigate([ '/animacion', id ]);
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

	/**
	 * A creation of the feed as the card shows it. There are no likes or categories in the API yet,
	 * so those get a stand-in, and so does the thumbnail of a creation that has none (its `art`).
	 */
	private toAnimation (creation: FeedCreation): CommunityAnimation {
		const token = this.session.accessToken();

		return {
			id: String(creation.id),
			title: creation.title,
			author: creation.authorUsername,
			authorPhoto: creation.authorPhoto,
			/**
			 * The dark recording in both themes: the expanded card is a dark screen in both.
			 */
			video: creation.hasVideo ? this.creations.videoUrl({ id: creation.id, token, theme: 'dark' }) : null,
			thumbnail: creation.hasVideo ? this.creations.thumbnailUrl({ id: creation.id, token }) : null,
			likes: 0,
			createdAt: creation.createdAt.slice(0, 10),
			category: 'Nuevas',
			art: artFor(creation.id),
		};
	}
}
