import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { CubeLinkService, LinkState } from '../../cube';
import { AuthSession } from '../../services/auth-session.service';
import { CurrentUser } from '../../services/current-user.service';
import { MenuSoundService } from '../../services/menu-sound.service';
import { NotificationsService } from '../../services/notifications.service';
import { UsersService } from '../../services/middle/users.service';
import { AvatarComponent } from '../avatar/avatar.component';
import { CubeLogoComponent } from '../cube-logo/cube-logo.component';
import { NotificationsModalComponent } from '../notifications-modal/notifications-modal.component';
import { SoundToggleComponent } from '../sound-toggle/sound-toggle.component';
import { UserSearchModalComponent } from '../user-search.component';
import { WipeLinkDirective } from '../wipe-link.directive';

/**
 * A place the main navigation leads to.
 */
type NavItem = {
	/**
	 * Where the link goes.
	 */
	path: string;

	/**
	 * What the link says.
	 */
	label: string;

	/**
	 * The drawing of its icon (an SVG path, in a 24 × 24 box), shown in the bottom bar of phones.
	 */
	icon: string;
};

/**
 * The places of the main navigation.
 */
const ITEMS: NavItem[] = [
	{ path: '/home', label: 'Inicio', icon: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
	{ path: '/editor', label: 'Editor', icon: 'M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3' },
	{ path: '/gallery', label: 'Galería', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
	{ path: '/test-cube', label: 'Ejemplos', icon: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM10 8.5v7l6-3.5z' },
	{ path: '/setup', label: 'Cubo', icon: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5' },
];

/**
 * How the state of the link to the cube is told to the user, and in which colors: the pixel border
 * and the background of the badge, and its square LED. The classes are written in full so Tailwind
 * finds them.
 */
const STATUS: Record<LinkState, { label: string; classes: string; dot: string }> = {
	open: { label: 'Cubo conectado', classes: 'bg-green-500/10 text-green-200 [--frame-color:color-mix(in_srgb,var(--color-green-400)_35%,transparent)]', dot: 'bg-led-green shadow-[0_0_8px_var(--color-led-green)]' },
	connecting: { label: 'Conectando…', classes: 'bg-amber-500/10 text-amber-200 [--frame-color:color-mix(in_srgb,var(--color-amber-400)_35%,transparent)]', dot: 'bg-led-yellow animate-pulse motion-reduce:animate-none' },
	closed: { label: 'Sin cubo', classes: 'bg-slate-400/10 text-slate-300 [--frame-color:var(--login-card-line)]', dot: 'bg-slate-400' },
};

/**
 * How far, in pixels, the page has to scroll for the header to turn into a floating bubble.
 */
const BUBBLE_AFTER = 8;

/**
 * The top of the main pages: the logo, the navigation, the sounds of the menus, whether a cube is
 * connected and the way to the account, with the user's photo. On a phone the navigation moves to
 * a bar at the bottom of the screen, where the thumb reaches it. The theme button floats at the top
 * right of every page, so the header leaves room for it.
 *
 * It looks like the menu of the login: pixel borders, the pixel font, and the arrow of the menu
 * pointing at the page that is open. Its links change page behind the pixel wipe, with a sound.
 *
 * At the top of the page the header is a see-through bar across it; once the page scrolls it
 * becomes a box with a pixel border floating over the content. It always takes the same height
 * (`--header-height`), so the page does not jump when it changes.
 */
@Component({
	selector: 'app-site-header',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ AvatarComponent, CubeLogoComponent, NotificationsModalComponent, SoundToggleComponent, UserSearchModalComponent, WipeLinkDirective ],
	host: { class: 'contents', '(window:scroll)': 'onScroll()' },
	templateUrl: './site-header.component.html',
})
export class SiteHeaderComponent {
	/**
	 * The places of the navigation.
	 */
	protected readonly items = ITEMS;

	/**
	 * State of the search modal.
	 */
	protected readonly searchOpen = signal(false);

	/**
	 * State of the notifications modal.
	 */
	protected readonly notificationsOpen = signal(false);

	/**
	 * Notification store for unread badge and modal state.
	 */
	private readonly notificationsService = inject(NotificationsService);

	/**
	 * Unread notification count shown in the header badge.
	 */
	protected readonly unreadCount = this.notificationsService.unreadCount;

	/**
	 * Where the link to the cube stands, as the service tells it.
	 */
	private readonly state = toSignal(inject(CubeLinkService).state$, { initialValue: 'closed' as LinkState });

	/**
	 * How the state of the cube is shown.
	 */
	protected readonly status = computed(() => STATUS[this.state()]);

	/**
	 * True while someone is signed in, to say where the account button leads.
	 */
	protected readonly signedIn = inject(AuthSession).signedIn;

	/**
	 * The signed-in user's profile, for their name and photo, or null while it is not known.
	 */
	protected readonly me = inject(CurrentUser).profile;

	/**
	 * True once the page has scrolled down: the header is a floating bubble.
	 */
	protected readonly scrolled = signal(this.scrollTop() > BUBBLE_AFTER);

	/**
	 * Asks for the profile of the user who is signed in.
	 */
	private readonly usersService = inject(UsersService);

	/**
	 * The sounds of the menus.
	 */
	private readonly sound = inject(MenuSoundService);

	/**
	 * Knows which page is open.
	 */
	private readonly router = inject(Router);

	/**
	 * The address of the page that is open, without its query or fragment.
	 */
	private readonly path = toSignal(
		this.router.events.pipe(
			filter((event) => event instanceof NavigationEnd),
			map(() => this.cleanPath()),
		),
		{ initialValue: this.cleanPath() },
	);

	constructor () {

		/**
		 * The header is on every page, so it is the one that asks for the profile when nobody has
		 * yet. Failing is fine: the account button shows a plain icon instead of the photo.
		 */
		effect(() => {
			if (this.signedIn() && !this.me())
				untracked(() => this.usersService.me().subscribe({ error: () => undefined }));
		});

		effect(() => {
			if (this.signedIn())
				untracked(() => void this.notificationsService.refreshUnreadCount());
			else
				untracked(() => this.notificationsService.clear());
		});
	}

	/**
	 * True when the page that is open is the one of the path, or one inside it (another user's
	 * profile counts as the profile).
	 */
	protected isActive (path: string): boolean {
		const open = this.path();

		return path === open || open.startsWith(`${path}/`);
	}

	/**
	 * Opens the search of users, with the sound of the menu.
	 */
	protected openSearch (): void {
		this.sound.move();
		this.searchOpen.set(true);
	}

	/**
	 * Opens the notifications panel, with the sound of the menu.
	 */
	protected openNotifications (): void {
		this.sound.move();
		this.notificationsOpen.set(true);
	}

	/**
	 * Turns the header into a bubble, or back into a bar, as the page scrolls.
	 */
	protected onScroll (): void {
		this.scrolled.set(this.scrollTop() > BUBBLE_AFTER);
	}

	/**
	 * How far the page has scrolled down, in pixels.
	 */
	private scrollTop (): number {
		return 'undefined' === typeof window ? 0 : window.scrollY;
	}

	/**
	 * The address the router is on, without its query or fragment.
	 */
	private cleanPath (): string {
		return this.router.url.split(/[?#]/)[0];
	}
}
