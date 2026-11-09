import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
	CreateCommand,
	CubeComponent,
	DEFAULT_BRIGHTNESS,
	Environment,
	Face,
	ObjectMove,
	RecordProgress,
	recordCubeVideo,
} from '../../cube';
import { ProjectStorageService } from '../../services/project-storage.service';
import { BackgroundPanelComponent } from './background-panel.component';
import { backgroundsOf, normalizeBackgrounds } from './backgrounds';
import { BlocksTabComponent } from './blocks-tab.component';
import { ObjectsPanelComponent } from './objects-panel.component';
import { ProgramAreaComponent } from './program-area.component';

/**
 * The editor: a cube on one side, and on the other a panel with four tabs: the blocks, the
 * objects they move, the background and the program (the JSON the blocks are turned into, read
 * only).
 */
@Component({
	selector: 'app-editor',
	standalone: true,
	imports: [
		RouterLink,
		FormsModule,
		CubeComponent,
		ProgramAreaComponent,
		BackgroundPanelComponent,
		BlocksTabComponent,
		ObjectsPanelComponent,
	],
	templateUrl: './editor.component.html',
})
export class EditorPage implements OnInit {
	@ViewChild('blocks', { static: false })
	protected blocksRef?: BlocksTabComponent;

	@ViewChild('cube', { static: false })
	protected cubeRef?: CubeComponent;

	@ViewChild('exportPreviewHost', { static: false })
	private exportPreviewHostRef?: ElementRef<HTMLDivElement>;

	private readonly projectStorage = inject(ProjectStorageService);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);

	/**
	 * The tabs of the side panel.
	 */
	protected readonly tabs = [
		{ id: 'blocks', label: 'Blocks' },
		{ id: 'objects', label: 'Objects' },
		{ id: 'background', label: 'Background' },
		{ id: 'program', label: 'Program' },
	] as const;

	/**
	 * The tab being shown.
	 */
	protected readonly tab = signal<(typeof this.tabs)[number]['id']>('blocks');

	/**
	 * The objects of the program, made in the Objects tab and moved by the blocks.
	 */
	protected readonly objects = signal<CreateCommand[]>([]);

	/**
	 * Names of the objects the user has hidden to see what is behind them.
	 */
	protected readonly hiddenObjects = signal<string[]>([]);

	/**
	 * The object being handled: the one the cube drags, picked in the Objects tab or on the cube.
	 */
	protected readonly selectedObject = signal<string | null>(null);

	/**
	 * The stage of the cube, edited by the background panel. It starts with the objects brighter than
	 * the background.
	 */
	protected readonly environment = signal<Environment>(normalizeBackgrounds({ brightness: { ...DEFAULT_BRIGHTNESS } }));

	/**
	 * Names of the backgrounds of the Background tab, which the background blocks switch to.
	 */
	protected readonly backgroundNames = computed(() => backgroundsOf(this.environment()).map((background) => background.name));

	/**
	 * The cube stops its slow rotation while the user works on the blocks or the objects, so the
	 * face being edited does not turn away. The Spin button brings the rotation back.
	 */
	protected holdCube (cube: CubeComponent): void {
		if ('blocks' === this.tab() || 'objects' === this.tab())
			cube.holdStill();
	}

	/**
	 * The user dragged an object on the cube: its starting place is now the cell it was dropped on.
	 */
	protected moveObject (move: ObjectMove): void {
		this.objects.update((objects) => objects.map((object) => object.name === move.name
			? { ...object, face: move.face, x: move.x, y: move.y }
			: object));
	}

	/**
	 * Faces the camera can turn to.
	 */
	protected readonly faces = [
		{ value: Face.FRONT, label: 'Front' },
		{ value: Face.RIGHT, label: 'Right' },
		{ value: Face.LEFT, label: 'Left' },
		{ value: Face.BACK, label: 'Back' },
		{ value: Face.TOP, label: 'Top' },
	];

	// --- Export & Thumbnail Modal ---
	protected readonly showExportModal = signal(false);
	protected readonly exportTitle = signal('My Animation');
	protected readonly exportDescription = signal('');
	protected readonly exportDuration = signal<number>(15);
	protected readonly exportCameraMode = signal<'orbit' | 'front'>('orbit');
	protected readonly isExporting = signal(false);
	protected readonly exportProgress = signal<RecordProgress | null>(null);
	protected readonly exportSuccess = signal(false);

	async ngOnInit (): Promise<void> {
		const projectId = this.route.snapshot.queryParamMap.get('project');
		if (projectId) 
			try {
				const project = await this.projectStorage.get(projectId);
				if (project) {
					this.exportTitle.set(project.title);
					this.exportDescription.set(project.description);
					if (project.environment) 
						this.environment.set(normalizeBackgrounds(project.environment));
					

					setTimeout(() => {
						this.blocksRef?.loadProgram(project.program);
						this.cubeRef?.run(project.program);
					}, 100);
				}
			}
			catch (err) {
				console.error('Error loading project into editor:', err);
			}
		
	}

	protected openExportModal (): void {
		this.exportSuccess.set(false);
		this.exportProgress.set(null);
		this.showExportModal.set(true);
	}

	protected closeExportModal (): void {
		if (this.isExporting()) 
			return;
		
		this.showExportModal.set(false);
	}

	protected async startExport (): Promise<void> {
		const program = this.blocksRef?.program();
		if (!program) {
			alert('The program is not ready to export yet.');
			return;
		}

		this.isExporting.set(true);
		this.exportProgress.set({ currentSecond: 1, totalSeconds: this.exportDuration(), percent: 0 });

		await new Promise((resolve) => setTimeout(resolve, 50));

		try {
			const rotations = 'orbit' === this.exportCameraMode() ? 1 : 0;
			const result = await recordCubeVideo(
				program,
				{
					durationSeconds: this.exportDuration(),
					fps: 30,
					width: 480,
					height: 480,
					bitrate: 2_500_000,
					rotations,
					environment: this.environment(),
					previewHost: this.exportPreviewHostRef?.nativeElement,
				},
				(prog) => {
					this.exportProgress.set(prog);
				},
			);

			const id = 'proj_' + Date.now();
			await this.projectStorage.save({
				id,
				title: this.exportTitle().trim() || 'Untitled',
				description: this.exportDescription().trim(),
				createdAt: Date.now(),
				durationSeconds: this.exportDuration(),
				program,
				environment: this.environment(),
				videoBlob: result.blob,
				videoMimeType: result.mimeType,
			});

			this.exportSuccess.set(true);
		}
		catch (error) {
			console.error('Error recording project thumbnail:', error);
			alert('Error generating thumbnail: ' + (error as Error).message);
		}
		finally {
			this.isExporting.set(false);
		}
	}

	protected goToGallery (): void {
		this.showExportModal.set(false);
		this.router.navigate([ '/gallery' ]);
	}
}
