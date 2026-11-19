import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PREVIEW_VIDEO_OPTIONS, RecordProgress } from '../../cube';
import { AdminCreation } from '../../models';
import { AuthSession } from '../../services/auth-session.service';
import { PreviewRecorder } from '../../services/preview-recorder.service';
import { SnackbarService } from '../../services/snackbar.service';
import { AdminService } from '../../services/middle/admin.service';
import { CreationsService } from '../../services/middle/creations.service';

/**
 * Which creations the list shows.
 */
export type AdminFilter = 'all' | 'missing' | 'done';

/**
 * Where a creation stands in the recording queue of this visit: waiting for its turn, being
 * recorded, recorded or failed. Creations that were never queued have none.
 */
export type RecordingStatus = 'queued' | 'recording' | 'done' | 'failed';

/**
 * The tabs that filter the list, and what each one says.
 */
const FILTERS: { value: AdminFilter; label: string }[] = [
	{ value: 'all', label: 'Todas' },
	{ value: 'missing', label: 'Sin video' },
	{ value: 'done', label: 'Con video' },
];

/**
 * The panel of the super admins. For now it lists every creation of every user, public or
 * private, and records their preview (the two videos and the thumbnail), whoever owns them: one at
 * a time from its row, or all of them in a queue. Recording happens in this tab, the same way the
 * editor and the profile do it, and each preview is uploaded as soon as it is ready, so stopping
 * halfway keeps what was done.
 */
@Component({
	selector: 'app-admin',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [ RouterLink ],
	host: { '(window:beforeunload)': 'warnBeforeLeaving($event)' },
	templateUrl: './admin.component.html',
})
export class AdminPage implements OnInit {
	/**
	 * The tabs that filter the list.
	 */
	protected readonly filters = FILTERS;

	/**
	 * Every creation, the most recent first, or null until they are loaded.
	 */
	protected readonly creations = signal<AdminCreation[] | null>(null);

	/**
	 * Why the creations could not be loaded, or null.
	 */
	protected readonly loadProblem = signal<string | null>(null);

	/**
	 * Which creations the list shows.
	 */
	protected readonly filter = signal<AdminFilter>('all');

	/**
	 * The creations the list shows, after the filter.
	 */
	protected readonly visible = computed(() => {
		const creations = this.creations() ?? [];
		const filter = this.filter();

		if ('missing' === filter)
			return creations.filter((creation) => !creation.hasVideo);

		if ('done' === filter)
			return creations.filter((creation) => creation.hasVideo);

		return creations;
	});

	/**
	 * How many creations there are, and how many have their preview.
	 */
	protected readonly counts = computed(() => {
		const creations = this.creations() ?? [];
		const done = creations.filter((creation) => creation.hasVideo).length;

		return { all: creations.length, done, missing: creations.length - done };
	});

	/**
	 * IDs of the creations waiting for their turn, in order.
	 */
	protected readonly queue = signal<number[]>([]);

	/**
	 * The creation being recorded, or null.
	 */
	protected readonly current = signal<AdminCreation | null>(null);

	/**
	 * How far the recording of the current creation has got.
	 */
	protected readonly progress = signal<RecordProgress | null>(null);

	/**
	 * Where each creation queued in this visit stands, by creation ID.
	 */
	protected readonly statuses = signal<Record<number, RecordingStatus>>({});

	/**
	 * How many creations the running batch has, counting the ones already recorded, to say "3 of
	 * 12". It starts again when the queue empties.
	 */
	protected readonly batchSize = signal(0);

	/**
	 * How many of the running batch are finished, recorded or failed.
	 */
	protected readonly batchFinished = signal(0);

	/**
	 * True once stopping was asked for: the queue is emptied, and the creation being recorded is
	 * the last one.
	 */
	protected readonly stopping = signal(false);

	/**
	 * True while the queue is being worked through.
	 */
	protected readonly running = computed(() => null !== this.current() || 0 < this.queue().length);

	/**
	 * When the thumbnail of each creation recorded in this visit was made, by creation ID. It goes
	 * at the end of the address, or the browser would keep showing the one it had before.
	 */
	private readonly versions = signal<Record<number, number>>({});

	/**
	 * IDs of the creations whose thumbnail did not load (videos made before there were
	 * thumbnails), which show a placeholder instead.
	 */
	protected readonly brokenThumbnails = signal<ReadonlySet<number>>(new Set());

	/**
	 * Where the cube is shown while a creation is recorded.
	 */
	private readonly recordingHost = viewChild<ElementRef<HTMLDivElement>>('recordingHost');

	/**
	 * Lists every creation and replaces their previews.
	 */
	private readonly admin = inject(AdminService);

	/**
	 * Reads the program of each creation and builds the address of its thumbnail.
	 */
	private readonly creationsService = inject(CreationsService);

	/**
	 * The access token, for the addresses of the thumbnails.
	 */
	private readonly session = inject(AuthSession);

	/**
	 * Tells how the recordings went.
	 */
	private readonly snackbar = inject(SnackbarService);

	/**
	 * Records the previews.
	 */
	private readonly recorder = inject(PreviewRecorder);

	ngOnInit (): void {
		this.load();
	}

	/**
	 * Loads every creation.
	 */
	protected load (): void {
		this.loadProblem.set(null);

		this.admin.allCreations().subscribe({
			next: (creations) => this.creations.set(creations),
			error: () => this.loadProblem.set('No se pudieron cargar las creaciones.'),
		});
	}

	/**
	 * The address of a creation's thumbnail, changed each time it is recorded again here.
	 */
	protected thumbnailOf (creation: AdminCreation): string {
		const url = this.creationsService.thumbnailUrl({ id: creation.id, token: this.session.accessToken() });
		const version = this.versions()[creation.id];

		if (undefined === version)
			return url;

		return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
	}

	/**
	 * Remembers that a thumbnail did not load, so its placeholder shows.
	 */
	protected thumbnailFailed (id: number): void {
		this.brokenThumbnails.update((broken) => new Set(broken).add(id));
	}

	/**
	 * Records the preview of one creation: right away, or after the ones already queued.
	 */
	protected generate (creation: AdminCreation): void {
		this.enqueue([ creation.id ]);
	}

	/**
	 * Records the preview of every creation that has none.
	 */
	protected generateMissing (): void {
		this.enqueue((this.creations() ?? []).filter((creation) => !creation.hasVideo).map((creation) => creation.id));
	}

	/**
	 * Records the preview of every creation again, the ones that have it too, after asking: it
	 * takes a while and replaces every video.
	 */
	protected regenerateAll (): void {
		const creations = this.creations() ?? [];

		if (!confirm(`¿Grabar otra vez las ${creations.length} creaciones? Se reemplazarán los videos que ya tienen.`))
			return;

		this.enqueue(creations.map((creation) => creation.id));
	}

	/**
	 * Takes a creation out of the queue before its turn.
	 */
	protected unqueue (id: number): void {
		this.queue.update((queue) => queue.filter((queued) => id !== queued));
		this.batchSize.update((size) => size - 1);
		this.statuses.update((statuses) => {
			const next = { ...statuses };
			delete next[id];

			return next;
		});
	}

	/**
	 * Empties the queue. The creation being recorded finishes and is uploaded: a recording cannot
	 * be cut halfway.
	 */
	protected stop (): void {
		const queued = this.queue();

		this.stopping.set(true);
		this.queue.set([]);
		this.batchSize.update((size) => size - queued.length);
		this.statuses.update((statuses) => {
			const next = { ...statuses };

			for (const id of queued)
				delete next[id];

			return next;
		});
	}

	/**
	 * Asks the browser to warn before leaving while previews are being recorded: leaving would lose
	 * the one being recorded and the rest of the queue.
	 */
	protected warnBeforeLeaving (event: BeforeUnloadEvent): void {
		if (this.running())
			event.preventDefault();
	}

	/**
	 * Adds creations to the end of the queue (the ones not in it already) and starts working
	 * through it when it was idle.
	 */
	private enqueue (ids: number[]): void {
		if (!this.recorder.supported()) {
			this.snackbar.error('Este navegador no puede grabar video.');
			return;
		}

		const current = this.current()?.id;
		const waiting = new Set(this.queue());
		const added = ids.filter((id) => id !== current && !waiting.has(id));

		if (0 === added.length)
			return;

		this.queue.update((queue) => [ ...queue, ...added ]);
		this.batchSize.update((size) => size + added.length);
		this.statuses.update((statuses) => {
			const next = { ...statuses };

			for (const id of added)
				next[id] = 'queued';

			return next;
		});

		if (null === this.current())
			void this.work();
	}

	/**
	 * Records the creations of the queue one after another, until it is empty or stopped, and then
	 * says how it went.
	 */
	private async work (): Promise<void> {
		let recorded = 0;
		let failed = 0;

		this.stopping.set(false);

		for (let id = this.queue()[0]; undefined !== id; id = this.queue()[0]) {
			this.queue.update((queue) => queue.slice(1));

			const creation = this.creations()?.find((candidate) => id === candidate.id);

			if (!creation)
				continue;

			if (await this.record(creation))
				recorded += 1;

			else
				failed += 1;

			this.batchFinished.update((finished) => finished + 1);
		}

		this.batchSize.set(0);
		this.batchFinished.set(0);
		this.stopping.set(false);

		if (0 < failed)
			this.snackbar.error(`Se grabaron ${recorded} y fallaron ${failed}. Puedes intentar las que fallaron otra vez.`);

		else if (1 < recorded)
			this.snackbar.success(`Se grabaron las ${recorded} creaciones.`);

		else if (1 === recorded)
			this.snackbar.success('Video generado.');
	}

	/**
	 * Records the preview of one creation and uploads it: reads its program, runs it on the cube
	 * with the usual preset (the same as the editor's) and replaces its videos and thumbnail.
	 * Answers whether it worked.
	 */
	private async record (creation: AdminCreation): Promise<boolean> {
		this.current.set(creation);
		this.progress.set({ currentSecond: 1, totalSeconds: PREVIEW_VIDEO_OPTIONS.durationSeconds, percent: 0 });
		this.setStatus(creation.id, 'recording');

		try {
			const detail = await firstValueFrom(this.creationsService.getCreation({ id: creation.id }));
			const { program, environment } = this.creationsService.parseCreation(detail);

			/**
			 * Lets the page draw the place for the cube before the recording needs it.
			 */
			await new Promise((resolve) => setTimeout(resolve, 50));

			const videos = await this.recorder.record(
				program,
				{ environment, previewHost: this.recordingHost()?.nativeElement },
				(progress) => this.progress.set(progress),
			);

			try {
				await firstValueFrom(this.admin.setPreview({ id: creation.id }, { videos }));
			}

			finally {

				/**
				 * The videos are only needed until they are uploaded, and a long queue would keep
				 * every one of them in memory otherwise.
				 */
				URL.revokeObjectURL(videos.dark.url);
				URL.revokeObjectURL(videos.light.url);
			}

			this.creations.update((creations) => creations?.map((candidate) => creation.id === candidate.id ? { ...candidate, hasVideo: true } : candidate) ?? null);
			this.versions.update((versions) => ({ ...versions, [creation.id]: Date.now() }));
			this.brokenThumbnails.update((broken) => {
				const next = new Set(broken);
				next.delete(creation.id);

				return next;
			});
			this.setStatus(creation.id, 'done');

			return true;
		}

		catch (error) {
			console.error(`The preview of creation ${creation.id} could not be recorded`, error);
			this.setStatus(creation.id, 'failed');

			return false;
		}

		finally {
			this.current.set(null);
			this.progress.set(null);
		}
	}

	/**
	 * Says where a creation stands in the queue.
	 */
	private setStatus (id: number, status: RecordingStatus): void {
		this.statuses.update((statuses) => ({ ...statuses, [id]: status }));
	}
}
