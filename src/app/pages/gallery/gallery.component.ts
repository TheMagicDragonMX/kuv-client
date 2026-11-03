import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
	CubeComponent,
	EXAMPLE_PROGRAMS,
	ExampleProgram,
	Program,
	RecordProgress,
	RecordResult,
	isRecordingSupported,
	recordCubeVideo,
} from '../../cube';
import { CustomProject, ProjectStorageService } from '../../services/project-storage.service';

@Component({
	selector: 'app-gallery',
	standalone: true,
	imports: [RouterLink, CubeComponent],
	templateUrl: './gallery.component.html',
})
export class GalleryPage implements OnInit {
	@ViewChild('previewHost', { static: false })
	private previewHostRef?: ElementRef<HTMLDivElement>;

	private readonly projectStorage = inject(ProjectStorageService);
	private readonly router = inject(Router);

	protected readonly examples = EXAMPLE_PROGRAMS;
	protected readonly supported = isRecordingSupported();

	/**
	 * Custom user creations stored in IndexedDB.
	 */
	protected readonly customProjects = signal<CustomProject[]>([]);

	/**
	 * Object URLs for stored video Blobs of custom projects.
	 */
	protected readonly customVideoUrls = signal<Record<string, string>>({});

	/**
	 * Configurable recording duration in seconds for examples.
	 */
	protected readonly duration = signal<number>(15);

	/**
	 * Identifier of the item currently being recorded, or null if idle.
	 */
	protected readonly recordingId = signal<string | null>(null);

	/**
	 * Live progress of the current recording.
	 */
	protected readonly progress = signal<RecordProgress | null>(null);

	/**
	 * Map of example ID to its generated video thumbnail result.
	 */
	protected readonly thumbnails = signal<Record<string, RecordResult>>({});

	/**
	 * Selected item to preview on the live 3D cube.
	 */
	protected readonly livePreviewProgram = signal<{ name: string; description: string; program: Program }>({
		name: EXAMPLE_PROGRAMS[0].name,
		description: EXAMPLE_PROGRAMS[0].description,
		program: EXAMPLE_PROGRAMS[0].program,
	});

	/**
	 * Whether the live 3D cube side drawer is open.
	 */
	protected readonly showLiveDrawer = signal<boolean>(false);

	async ngOnInit (): Promise<void> {
		await this.loadCustomProjects();
	}

	protected async loadCustomProjects (): Promise<void> {
		try {
			const projects = await this.projectStorage.getAll();
			this.customProjects.set(projects);

			const urls: Record<string, string> = {};
			for (const p of projects) 
				if (p.videoBlob) 
					urls[p.id] = URL.createObjectURL(p.videoBlob);
				
			
			this.customVideoUrls.set(urls);
		}
		catch (error) {
			console.error('Error loading custom projects:', error);
		}
	}

	protected openInEditor (project: CustomProject): void {
		this.router.navigate(['/editor'], { queryParams: { project: project.id } });
	}

	protected async deleteProject (project: CustomProject, event: MouseEvent): Promise<void> {
		event.stopPropagation();
		if (!confirm(`¿Estás seguro de eliminar "${project.title}"?`)) 
			return;
		

		try {
			await this.projectStorage.delete(project.id);
			if (this.customVideoUrls()[project.id]) 
				URL.revokeObjectURL(this.customVideoUrls()[project.id]);
			
			await this.loadCustomProjects();
		}
		catch (error) {
			console.error('Error deleting project:', error);
		}
	}

	/**
	 * Starts recording a video thumbnail for the specified example program.
	 */
	protected async recordThumbnail (example: ExampleProgram): Promise<void> {
		if (this.recordingId()) 
			return;
		

		this.recordingId.set(example.id);
		this.progress.set({ currentSecond: 1, totalSeconds: this.duration(), percent: 0 });

		await new Promise((resolve) => setTimeout(resolve, 50));

		try {
			const result = await recordCubeVideo(
				example.program,
				{
					durationSeconds: this.duration(),
					fps: 30,
					width: 480,
					height: 480,
					bitrate: 2_500_000,
					rotations: 1,
					previewHost: this.previewHostRef?.nativeElement,
				},
				(prog) => {
					this.progress.set(prog);
				},
			);

			this.thumbnails.update((prev) => ({
				...prev,
				[example.id]: result,
			}));
		}
		catch (error) {
			console.error('Error recording cube thumbnail:', error);
			alert('Hubo un error al grabar la miniatura: ' + (error as Error).message);
		}
		finally {
			this.recordingId.set(null);
			this.progress.set(null);
		}
	}

	protected formatBytes (bytes?: number): string {
		if (!bytes) 
			return '';
		
		if (1024 * 1024 <= bytes) 
			return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
		
		return (bytes / 1024).toFixed(1) + ' KB';
	}

	protected formatDate (timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
}
