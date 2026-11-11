import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AvatarComponent } from './avatar/avatar.component';
import { UserSummary } from '../models';
import { UsersService } from '../services/middle/users.service';
import { relationOf } from '../pages/profile/follow-section.component';

const SEARCH_DELAY = 250;
const MIN_SEARCH = 2;

@Component({
	selector: 'app-user-search',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ AvatarComponent ],
	template: `
		<div
			class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 backdrop-blur-sm sm:pt-24"
			role="dialog"
			aria-modal="true"
			aria-labelledby="search-modal-title"
			(click)="closeOnBackdrop($event)"
		>
			<div
				class="flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl"
				(click)="$event.stopPropagation()"
			>
				<!-- Cabecera de búsqueda -->
				<div class="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
					<svg class="size-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>

					<input
						#searchInput
						type="search"
						id="search-modal-title"
						class="flex-1 bg-transparent text-base text-slate-100 placeholder:text-slate-400 focus:outline-none"
						placeholder="Buscar creadores por nombre de usuario…"
						autocomplete="off"
						[value]="query()"
						(input)="onInput($any($event.target).value)"
						(keydown.escape)="close.emit()"
					/>

					@if (loading()) {
						<div class="size-4 animate-spin rounded-full border-2 border-accent-pink border-t-transparent"></div>
					}

					<button
						type="button"
						class="cursor-pointer rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
						title="Cerrar búsqueda"
						(click)="close.emit()"
					>
						<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- Resultados -->
				<div class="max-h-[60vh] overflow-y-auto p-2">
					@if (query().trim().length < 2) {
						<div class="py-10 text-center text-sm text-slate-400">
							<p>Escribe al menos 2 letras para buscar usuarios.</p>
						</div>
					} @else if (loading()) {
						<div class="py-10 text-center text-sm text-slate-400">
							<p>Buscando creadores…</p>
						</div>
					} @else if (results().length > 0) {
						<ul class="flex flex-col gap-1" role="list">
							@for (user of results(); track user.id) {
								<li>
									<button
										type="button"
										class="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-800/80 focus:bg-slate-800/80 focus:outline-none"
										(click)="goToProfile(user.id)"
									>
										<div class="flex items-center gap-3.5 min-w-0">
											<app-avatar class="size-11 text-lg shrink-0" [name]="user.username" [photo]="user.photo" />
											<div class="flex flex-col min-w-0">
												<span class="truncate font-bold text-slate-100 group-hover:text-accent-pink transition">
													&#64;{{ user.username }}
												</span>
												@if (user.description) {
													<span class="truncate text-xs text-slate-400 max-w-xs sm:max-w-md">
														{{ user.description }}
													</span>
												}
												<span class="text-[0.75rem] text-slate-500">
													{{ user.followers }} {{ 1 === user.followers ? 'seguidor' : 'seguidores' }}
												</span>
											</div>
										</div>

										<div class="flex items-center gap-2 shrink-0">
											@if (relationOf(user); as relation) {
												<span class="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300">
													{{ relation }}
												</span>
											}
											<span class="rounded-xl bg-accent-pink/15 px-3 py-1.5 text-xs font-bold text-accent-pink group-hover:bg-accent-pink group-hover:text-on-accent-pink transition">
												Ver perfil
											</span>
										</div>
									</button>
								</li>
							}
						</ul>
					} @else {
						<div class="py-10 text-center text-sm text-slate-400">
							<p>No se encontraron usuarios que coincidan con "{{ query() }}".</p>
						</div>
					}
				</div>
			</div>
		</div>
	`,
})
export class UserSearchModalComponent {
	readonly close = output<void>();

	protected readonly query = signal('');
	protected readonly results = signal<UserSummary[]>([]);
	protected readonly loading = signal(false);
	protected readonly relationOf = relationOf;

	private readonly usersService = inject(UsersService);
	private readonly router = inject(Router);
	private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

	private searchTimer: ReturnType<typeof setTimeout> | null = null;

	constructor () {
		inject(DestroyRef).onDestroy(() => this.cancelSearch());

		// Autofocus on open
		setTimeout(() => {
			this.searchInput()?.nativeElement.focus();
		}, 50);
	}

	protected onInput (text: string): void {
		this.query.set(text);
		this.cancelSearch();

		const trimmed = text.trim();
		if (trimmed.length < MIN_SEARCH) {
			this.results.set([]);
			this.loading.set(false);
			return;
		}

		this.loading.set(true);
		this.searchTimer = setTimeout(() => {
			this.searchTimer = null;
			this.usersService.search({ search: trimmed }).subscribe({
				next: (users) => {
					if (text === this.query()) {
						this.results.set(users);
						this.loading.set(false);
					}
				},
				error: () => {
					this.results.set([]);
					this.loading.set(false);
				},
			});
		}, SEARCH_DELAY);
	}

	protected goToProfile (userId: number): void {
		this.close.emit();
		void this.router.navigate(['/perfil', userId]);
	}

	protected closeOnBackdrop (event: MouseEvent): void {
		if (event.target === event.currentTarget) {
			this.close.emit();
		}
	}

	private cancelSearch (): void {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer);
			this.searchTimer = null;
		}
	}
}

