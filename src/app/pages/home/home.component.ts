import { ChangeDetectionStrategy, Component, DestroyRef, WritableSignal, computed, inject, signal } from '@angular/core';
import { MascotMood } from '../../components/kuv-mascot/kuv-mascot.component';
import { MascotSaysComponent } from '../../components/mascot-says/mascot-says.component';
import { WipeLinkDirective } from '../../components/wipe-link.directive';
import { CurrentUser } from '../../services/current-user.service';
import { MenuSoundService } from '../../services/menu-sound.service';
import { SnackbarService } from '../../services/snackbar.service';
import { AnimationRowComponent } from './animation-row.component';
import { COMMUNITY, SECTIONS } from './home-data';

/**
 * Milliseconds the mascot keeps a mood after reacting to something, before it calms down again.
 */
const MOOD_TIME = 1600;

/**
 * The home page: the animations the community made for the cube, in rows to look through, and the
 * way to make one's own. It looks like the menus of the login: the mascot greets the user from its
 * bubble and reacts to what they do, the buttons have pixel borders and every action has a sound.
 * The animations are examples until the shared library has a server.
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
	 * How the mascot feels: happy for a moment when the user keeps an animation, sad when one
	 * cannot be seen.
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
	 * Shows short messages at the bottom of the screen.
	 */
	private readonly snackbar = inject(SnackbarService);

	/**
	 * The sounds of the menus.
	 */
	private readonly sound = inject(MenuSoundService);

	/**
	 * The timer that calms the mascot down, while one is pending.
	 */
	private calming: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Clears the pending timer when the page goes away.
	 */
	constructor () {
		inject(DestroyRef).onDestroy(() => clearTimeout(this.calming));
	}

	/**
	 * The user asked to see an animation. The animations of the page are examples with no program
	 * behind them yet, so it says so instead of pretending to show one, and the mascot is sad.
	 */
	protected view (id: string): void {
		const animation = COMMUNITY.find((candidate) => id === candidate.id);

		this.sound.deny();
		this.react('sad');
		this.snackbar.show(`"${animation?.title ?? id}" todavía no se puede visualizar: las animaciones de Inicio son ejemplos hasta que la biblioteca compartida tenga servidor.`);
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
}
