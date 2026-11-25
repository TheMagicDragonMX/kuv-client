import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AvatarComponent } from '../avatar/avatar.component';
import { NotificationItem } from '../../models';
import { NotificationsService } from '../../services/notifications.service';

type FilterTab = 'all' | 'unread';

const CATEGORY_META: Record<string, { label: string; badgeClass: string }> = {
	comment: { label: 'Comentario', badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
	comment_reply: { label: 'Respuesta', badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
	mention: { label: 'Mención', badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' },
	comment_like: { label: 'Me gusta', badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
	follow: { label: 'Seguidor', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
	followed_creation: { label: 'Publicación', badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
	popularity_milestone: { label: 'Hito', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
	trending_creation: { label: 'Tendencia', badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
	report_status: { label: 'Reporte', badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
	moderation_notice: { label: 'Moderación', badgeClass: 'bg-red-500/15 text-red-300 border-red-500/30' },
	cube_chat: { label: 'Cube Chat', badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
};

/**
 * Modal panel displaying user notifications with unread filtering, mark-all-read,
 * deletion, and click-through navigation.
 */
@Component({
	selector: 'app-notifications-modal',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ AvatarComponent ],
	host: { '(document:keydown.escape)': 'close.emit()' },
	template: `
		<div
			class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 backdrop-blur-sm sm:pt-20"
			role="dialog"
			aria-modal="true"
			aria-labelledby="notifications-modal-title"
			(click)="close.emit()"
		>
			<div
				class="flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl"
				(click)="$event.stopPropagation()"
			>
				<!-- Header -->
				<div class="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
					<div class="flex items-center gap-2.5">
						<svg viewBox="0 0 24 24" class="size-5 text-accent-pink" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
							<path d="M13.73 21a2 2 0 0 1-3.46 0" />
						</svg>
						<h2 id="notifications-modal-title" class="font-display text-lg font-bold text-slate-100">
							Notificaciones
						</h2>
						@if (unreadCount() > 0) {
							<span class="rounded-full bg-accent-pink/20 border border-accent-pink/40 px-2 py-0.5 text-xs font-bold text-accent-pink">
								{{ unreadCount() }}
							</span>
						}
					</div>

					<div class="flex items-center gap-2">
						@if (unreadCount() > 0) {
							<button
								type="button"
								class="cursor-pointer rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
								(click)="markAll()"
							>
								Marcar todas leídas
							</button>
						}
						<button
							type="button"
							class="cursor-pointer rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
							title="Cerrar notificaciones"
							(click)="close.emit()"
						>
							<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>

				<!-- Filter tabs -->
				<div class="flex gap-2 border-b border-slate-800/80 px-5 py-2.5">
					<button
						type="button"
						class="cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition"
						[class]="tab() === 'all' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
						(click)="setTab('all')"
					>
						Todas
					</button>
					<button
						type="button"
						class="cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition"
						[class]="tab() === 'unread' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
						(click)="setTab('unread')"
					>
						No leídas
					</button>
				</div>

				<!-- List -->
				<div class="max-h-[62vh] overflow-y-auto p-2">
					@if (loading()) {
						<div class="py-12 text-center text-sm text-slate-400">
							Cargando notificaciones…
						</div>
					} @else if (visibleItems().length === 0) {
						<div class="py-12 text-center text-sm text-slate-400">
							{{ tab() === 'unread' ? 'No tienes notificaciones sin leer.' : 'Aún no tienes notificaciones.' }}
						</div>
					} @else {
						<ul class="flex flex-col gap-1" role="list">
							@for (item of visibleItems(); track item.id) {
								<li>
									<div
										class="group flex items-start justify-between gap-3 rounded-2xl p-3 transition hover:bg-slate-800/80"
										[class]="item.isRead ? 'opacity-80' : 'bg-slate-800/40 border border-slate-700/60'"
									>
										<button
											type="button"
											class="flex flex-1 cursor-pointer items-start gap-3 text-left min-w-0"
											(click)="openItem(item)"
										>
											@if (item.actorUsername) {
												<app-avatar class="size-10 shrink-0 text-base" [name]="item.actorUsername" [photo]="item.actorPhoto" />
											} @else {
												<div class="grid size-10 shrink-0 place-items-center rounded-full border border-slate-700 bg-slate-800 text-amber-300">
													<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
														<path d="M12 2l3 7h7l-5.5 4.2L18.5 21 12 16.5 5.5 21l2-7.8L2 9h7z" />
													</svg>
												</div>
											}

											<div class="flex flex-col gap-1 min-w-0 flex-1">
												<div class="flex flex-wrap items-center gap-2">
													<span class="rounded-full border px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide" [class]="metaOf(item.type).badgeClass">
														{{ metaOf(item.type).label }}
													</span>
													<span class="text-xs font-bold text-slate-100 truncate">
														{{ item.title }}
													</span>
													@if (!item.isRead) {
														<span class="size-2 rounded-full bg-accent-pink shadow-[0_0_6px_var(--accent-pink)]" title="No leída"></span>
													}
												</div>
												<p class="text-xs leading-relaxed text-slate-300">
													{{ item.message }}
												</p>
												<span class="text-[0.7rem] text-slate-500">
													{{ formatRelative(item.createdAt) }}
												</span>
											</div>
										</button>

										<button
											type="button"
											class="cursor-pointer rounded-lg p-1.5 text-slate-500 opacity-70 transition hover:bg-slate-700/70 hover:text-red-400 group-hover:opacity-100"
											title="Eliminar notificación"
											(click)="deleteItem(item.id, $event)"
										>
											<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								</li>
							}
						</ul>
					}
				</div>
			</div>
		</div>
	`,
})
export class NotificationsModalComponent implements OnInit {
	private readonly notifications = inject(NotificationsService);

	private readonly router = inject(Router);

	readonly close = output<void>();

	protected readonly tab = signal<FilterTab>('all');

	protected readonly loading = this.notifications.loading;

	protected readonly unreadCount = this.notifications.unreadCount;

	protected readonly visibleItems = computed(() => {
		const list = this.notifications.items();
		return 'unread' === this.tab() ? list.filter((item) => !item.isRead) : list;
	});

	ngOnInit (): void {
		void this.notifications.load(false);
	}

	protected setTab (next: FilterTab): void {
		this.tab.set(next);
	}

	protected async markAll (): Promise<void> {
		await this.notifications.markAllAsRead();
	}

	protected async openItem (item: NotificationItem): Promise<void> {
		if (!item.isRead)
			await this.notifications.markAsRead(item.id);

		this.close.emit();

		if (item.link)
			void this.router.navigateByUrl(item.link);
	}

	protected async deleteItem (id: number, event: MouseEvent): Promise<void> {
		event.stopPropagation();
		await this.notifications.remove(id);
	}

	protected metaOf (type: string): { label: string; badgeClass: string } {
		return CATEGORY_META[type] ?? { label: 'Aviso', badgeClass: 'bg-slate-700 text-slate-200 border-slate-600' };
	}

	protected formatRelative (isoDate: string): string {
		const timestamp = new Date(isoDate).getTime();
		const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

		if (60 > diffSeconds)
			return 'Hace unos segundos';

		const diffMinutes = Math.floor(diffSeconds / 60);

		if (60 > diffMinutes)
			return `Hace ${diffMinutes} min`;

		const diffHours = Math.floor(diffMinutes / 60);

		if (24 > diffHours)
			return `Hace ${diffHours} h`;

		const diffDays = Math.floor(diffHours / 24);
		return `Hace ${diffDays} d`;
	}
}
