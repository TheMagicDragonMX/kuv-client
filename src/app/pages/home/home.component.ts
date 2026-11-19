import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, WritableSignal, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MascotMood } from '../../components/kuv-mascot/kuv-mascot.component';
import { MascotSaysComponent } from '../../components/mascot-says/mascot-says.component';
import { WipeLinkDirective } from '../../components/wipe-link.directive';
import { FeedCreation } from '../../models';
import { AuthSession } from '../../services/auth-session.service';
import { CurrentUser } from '../../services/current-user.service';
import { MenuSoundService } from '../../services/menu-sound.service';
import { CreationsService } from '../../services/middle/creations.service';
import { FeedService } from '../../services/middle/feed.service';
import { PixelWipeService } from '../../services/pixel-wipe.service';
import { SnackbarService } from '../../services/snackbar.service';
import { AnimationRowComponent } from './animation-row.component';
import { CommunityAnimation, EMPTY_SECTIONS, HomeSection, artFor } from './home-data';

/**
 * How many of the newest animations the home page asks for.
 */
const NEW_LIMIT = 20;

/**
 * Milliseconds the mascot keeps a mood after reacting to something, before it calms down again.
 */
const MOOD_TIME = 1600;

/**
 * The home page: the animations the community made for the cube, in rows to look through, and the
 * way to make one's own. The first row has the newest animations, which come from the API; the
 * other rows have no endpoint yet, so they are empty. It looks like the menus of the login: the
 * mascot greets the user from its bubble and reacts to what they do, the buttons have pixel borders
 * and every action has a sound.
 */
@Component({
	selector: 'app-home',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ AnimationRowComponent, MascotSaysComponent, WipeLinkDirective ],
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
	 * How the mascot feels: happy for a moment when the user keeps an animation.
	 */
	protected readonly mood = signal<MascotMood>('calm');

	/**
	 * What the mascot says: hello to the user by name, once their profile is known.
	 */
	protected readonly greeting = computed(() => {
		const name = this.me()?.username;

		return `¡Hola${name ? `, ${name}` : ''}! Dale corazón a lo que te guste.`;
	});

	/**
	 * The signed-in user's profile, which the header asks for.
	 */
	private readonly me = inject(CurrentUser).profile;

	/**
	 * Shows the user a short message.
	 */
	private readonly snackbar = inject(SnackbarService);

	/**
	 * The sounds of the menus.
	 */
	private readonly sound = inject(MenuSoundService);

	/**
	 * Covers the change of page with pixels.
	 */
	private readonly wipe = inject(PixelWipeService);

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
	 * The timer that calms the mascot down, while one is pending.
	 */
	private calming: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Asks for the newest animations, and clears the timer of the mascot when the page goes away.
	 */
	constructor () {
		inject(DestroyRef).onDestroy(() => clearTimeout(this.calming));

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
	 * Goes to the detail and visualizer page of the chosen animation, behind the pixel wipe and with
	 * the sound of the menu.
	 */
	protected view (id: string): void {
		this.sound.move();
		void this.wipe.run(() => this.router.navigate([ '/animation', id ]));
	}

	/**
	 * Adds the animation to a list of the user (liked, saved or favorites), or takes it out if it
	 * was already in it. Adding it makes the mascot happy.
	 */
	protected toggle (list: WritableSignal<ReadonlySet<string>>, id: string): void {
		const added = !list().has(id);

		list.update((ids) => {
			const next = new Set(ids);

			if (added)
				next.add(id);

			else
				next.delete(id);

			return next;
		});

		if (added) {
			this.sound.start();
			this.react('happy');
		}

		else
			this.sound.move();
	}

	/**
	 * Gives the mascot a mood for a moment.
	 */
	private react (mood: MascotMood): void {
		clearTimeout(this.calming);
		this.mood.set(mood);
		this.calming = setTimeout(() => this.mood.set('calm'), MOOD_TIME);
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
