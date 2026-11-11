import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CubeLinkService, LinkState } from '../../cube';
import { AuthSession } from '../../services/auth-session.service';
import { UserSearchModalComponent } from '../user-search.component';

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
	{ path: '/inicio', label: 'Inicio', icon: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
	{ path: '/editor', label: 'Editor', icon: 'M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3' },
	{ path: '/gallery', label: 'Galería', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
	{ path: '/setup', label: 'Cubo', icon: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5' },
];

/**
 * How the state of the link to the cube is told to the user, and in which colors. The classes are
 * written in full so Tailwind finds them.
 */
const STATUS: Record<LinkState, { label: string; classes: string; dot: string }> = {
	open: { label: 'Cubo conectado', classes: 'border-green-400/30 bg-green-500/10 text-green-200', dot: 'bg-led-green shadow-[0_0_8px_var(--color-led-green)]' },
	connecting: { label: 'Conectando…', classes: 'border-amber-400/30 bg-amber-500/10 text-amber-200', dot: 'bg-led-yellow animate-pulse motion-reduce:animate-none' },
	closed: { label: 'Sin cubo', classes: 'border-slate-400/25 bg-slate-400/10 text-slate-300', dot: 'bg-slate-400' },
};

/**
 * The top of the main pages: the logo, the navigation, whether a cube is connected and the way to
 * the account. On a phone the navigation moves to a bar at the bottom of the screen, where the
 * thumb reaches it. The theme button floats at the top right of every page, so the header leaves
 * room for it.
 */
@Component({
	selector: 'app-site-header',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ RouterLink, RouterLinkActive, UserSearchModalComponent ],
	host: { class: 'contents' },
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
}
