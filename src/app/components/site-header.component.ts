import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CubeLinkService, LinkState } from '../cube-link';
import { AuthSession } from '../services/auth-session.service';

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
	imports: [ RouterLink, RouterLinkActive ],
	host: { class: 'contents' },
	template: `
		<header class="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-400/20 bg-(--surface) py-3 pr-18 pl-4 backdrop-blur-[10px] sm:pl-10">
			<a routerLink="/inicio" class="flex items-center gap-3 text-slate-100 no-underline focus-visible:outline-2 focus-visible:outline-accent" aria-label="Kü-V, inicio">
				<svg viewBox="0 0 32 32" class="size-8.5" aria-hidden="true">
					<polygon points="16,3 29,10 16,17 3,10" class="fill-led-cyan" />
					<polygon points="3,10 16,17 16,30 3,23" class="fill-led-pink" />
					<polygon points="29,10 16,17 16,30 29,23" class="fill-led-yellow" />
				</svg>
				<span class="font-display text-3xl font-bold tracking-wide">Kü-V</span>
			</a>

			<nav class="hidden gap-1.5 md:flex" aria-label="Navegación principal">
				@for (item of items; track item.path) {
					<a
						[routerLink]="item.path"
						routerLinkActive="bg-slate-400/15 text-accent"
						ariaCurrentWhenActive="page"
						class="inline-flex min-h-11 items-center rounded-full px-4 text-[0.95rem] font-bold text-slate-300 no-underline transition duration-150 hover:bg-slate-400/15 focus-visible:outline-2 focus-visible:outline-accent"
					>{{ item.label }}</a>
				}
			</nav>

			<div class="flex items-center gap-3">
				<a routerLink="/setup" class="inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-[0.8rem] font-bold focus-visible:outline-2 focus-visible:outline-accent sm:px-3.5" [class]="status().classes">
					<span class="size-2 rounded-full" [class]="status().dot" aria-hidden="true"></span>
					<span class="sr-only sm:not-sr-only">{{ status().label }}</span>
				</a>
				<a
					routerLink="/perfil"
					routerLinkActive="ring-2 ring-accent ring-offset-2 ring-offset-(--page)"
					ariaCurrentWhenActive="page"
					class="grid size-11 place-items-center rounded-full border-2 border-white/40 bg-accent-pink text-on-accent-pink focus-visible:outline-2 focus-visible:outline-accent"
					[attr.aria-label]="signedIn() ? 'Tu perfil' : 'Iniciar sesión o crear cuenta'"
					[title]="signedIn() ? 'Tu perfil' : 'Iniciar sesión o crear cuenta'"
				>
					<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4-6 8-6s7 1.5 8 6" /></svg>
				</a>
			</div>
		</header>

		<nav class="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-400/20 bg-(--surface) px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-[10px] md:hidden" aria-label="Navegación principal">
			@for (item of items; track item.path) {
				<a
					[routerLink]="item.path"
					routerLinkActive="text-accent"
					ariaCurrentWhenActive="page"
					class="flex min-h-14 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[0.72rem] font-bold text-slate-300 no-underline focus-visible:outline-2 focus-visible:outline-accent"
				>
					<svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
					{{ item.label }}
				</a>
			}
		</nav>
	`,
})
export class SiteHeaderComponent {
	/**
	 * The places of the navigation.
	 */
	protected readonly items = ITEMS;

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
