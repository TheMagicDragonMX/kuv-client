/**
 * LAYER: recorder.
 *
 * Records a Program running on a 3D Cube into an MP4/WebM video with a smooth 360-degree orbit.
 * Runs completely client-side using WebGL rendering and MediaRecorder. The video has a solid
 * background (not every browser can record transparency), so the preview of a creation is
 * recorded twice in the same pass, once over the background of each theme of the app.
 */

import * as THREE from 'three';
import { CubeEngine } from '../engine/cube-engine';
import { Environment } from '../environment/environment';
import { Program } from '../program/program';
import { CubeModel } from '../view/cube-model';
import { Stage } from '../view/stage';
import { BACKGROUND, SIDE_VIEW_POLAR } from '../view/view-settings';

/**
 * Options for recording a cube animation to video.
 */
export type RecordCubeOptions = {
	/**
	 * Total duration of the recording in seconds (default: 15).
	 */
	durationSeconds?: number;

	/**
	 * Frames per second (default: 30).
	 */
	fps?: number;

	/**
	 * Video resolution width in pixels (default: 480).
	 */
	width?: number;

	/**
	 * Video resolution height in pixels (default: 480).
	 */
	height?: number;

	/**
	 * Target video bitrate in bits per second (default: 2_500_000 / 2.5 Mbps).
	 */
	bitrate?: number;

	/**
	 * Number of full 360-degree rotations during the duration (default: 1).
	 */
	rotations?: number;

	/**
	 * Background images / textures for the cube faces, if any.
	 */
	environment?: Environment;

	/**
	 * Optional DOM container to display the live rendering while recording.
	 */
	previewHost?: HTMLElement;

	/**
	 * Color behind the cube, as `#RRGGBB` (default: the dark background of the app).
	 */
	background?: string;
};

/**
 * The themes of the app a preview video is recorded for.
 */
export type PreviewTheme = 'dark' | 'light';

/**
 * The background each preview video is recorded over: the color behind the cube on the page in
 * that theme (the `--fog` of styles.css).
 */
export const PREVIEW_BACKGROUNDS: Record<PreviewTheme, string> = {
	dark: BACKGROUND,
	light: '#eef2f7',
};

/**
 * The preview videos of a creation, one per theme.
 */
export type PreviewVideos = Record<PreviewTheme, RecordResult>;

/**
 * How the preview video of a creation is recorded, wherever it is made (the editor, the profile):
 * 15 seconds at 60 frames per second, one turn of the camera around the cube. The bitrate is
 * higher than the default because twice the frames share it.
 */
export const PREVIEW_VIDEO_OPTIONS = {
	durationSeconds: 15,
	fps: 60,
	width: 480,
	height: 480,
	bitrate: 5_000_000,
	rotations: 1,
} satisfies RecordCubeOptions;

/**
 * Progress status reported during recording.
 */
export type RecordProgress = {
	currentSecond: number;
	totalSeconds: number;
	percent: number;
};

/**
 * Result of the recording operation.
 */
export type RecordResult = {
	blob: Blob;
	url: string;
	mimeType: string;
	sizeBytes: number;
	durationSeconds: number;
	width: number;
	height: number;
};

/**
 * Checks if the browser supports canvas video recording.
 */
export function isRecordingSupported (): boolean {
	return (
		'undefined' !== typeof window &&
		'undefined' !== typeof HTMLCanvasElement &&
		'captureStream' in HTMLCanvasElement.prototype &&
		'undefined' !== typeof MediaRecorder
	);
}

/**
 * Runs a program on a 3D cube model and records it to a video Blob.
 */
export async function recordCubeVideo (
	program: Program,
	options: RecordCubeOptions = {},
	onProgress?: (progress: RecordProgress) => void,
): Promise<RecordResult> {
	const [ result ] = await recordOverBackgrounds(program, options, [ options.background ?? BACKGROUND ], onProgress);

	return result;
}

/**
 * Records the preview videos of a program with `PREVIEW_VIDEO_OPTIONS`: one over the background of
 * each theme, in a single pass, so both show the same frames. The preview host shows the dark one.
 */
export async function recordPreviewVideos (
	program: Program,
	options: Pick<RecordCubeOptions, 'environment' | 'previewHost'> = {},
	onProgress?: (progress: RecordProgress) => void,
): Promise<PreviewVideos> {
	const [ dark, light ] = await recordOverBackgrounds(
		program,
		{ ...PREVIEW_VIDEO_OPTIONS, ...options },
		[ PREVIEW_BACKGROUNDS.dark, PREVIEW_BACKGROUNDS.light ],
		onProgress,
	);

	return { dark, light };
}

/**
 * One video being recorded: the canvas it is drawn on, its renderer and its recorder.
 */
type Take = {
	/**
	 * Color behind the cube.
	 */
	background: string;

	/**
	 * The canvas the frames are drawn on.
	 */
	canvas: HTMLCanvasElement;

	/**
	 * Draws the scene on the canvas.
	 */
	renderer: THREE.WebGLRenderer;

	/**
	 * Records the canvas.
	 */
	recorder: MediaRecorder;

	/**
	 * The pieces of video recorded so far.
	 */
	chunks: Blob[];
};

/**
 * Runs a program once and records it into one video per background. Every frame is drawn on the
 * canvas of each video, so they all show the same moment; only the color behind the cube (and the
 * fog, which fades into it) changes.
 */
async function recordOverBackgrounds (
	program: Program,
	options: RecordCubeOptions,
	backgrounds: readonly string[],
	onProgress?: (progress: RecordProgress) => void,
): Promise<RecordResult[]> {
	if (!isRecordingSupported())
		throw new Error('Canvas recording is not supported in this browser environment.');

	const durationSeconds = options.durationSeconds ?? 15;
	const durationMs = durationSeconds * 1000;
	const fps = options.fps ?? 30;
	const width = options.width ?? 480;
	const height = options.height ?? 480;
	const bitrate = options.bitrate ?? 2_500_000;
	const rotations = options.rotations ?? 1;

	/**
	 * The best type the browser can record.
	 */
	const mimeCandidates = [
		'video/webm;codecs=vp9',
		'video/webm;codecs=vp8',
		'video/webm',
		'video/mp4;codecs=avc1',
		'video/mp4',
	];
	const mimeType = mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';

	const takes: Take[] = backgrounds.map((background) => {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		canvas.style.objectFit = 'contain';

		const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
		renderer.setSize(width, height, false);
		renderer.setClearColor(background, 1);

		const recorder = new MediaRecorder(canvas.captureStream(fps), { mimeType, videoBitsPerSecond: bitrate });
		const chunks: Blob[] = [];

		recorder.ondataavailable = (event) => {
			if (event.data && 0 < event.data.size)
				chunks.push(event.data);
		};

		return { background, canvas, renderer, recorder, chunks };
	});

	if (options.previewHost)
		options.previewHost.replaceChildren(takes[0].canvas);

	const engine = new CubeEngine();
	engine.load(program);

	if (options.environment)
		engine.setEnvironment(options.environment);

	const stage = new Stage();
	const model = new CubeModel(engine.state);
	stage.add(model.group);

	const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
	const target = new THREE.Vector3(0, 0.6, 0);
	const radius = 7.5;
	const phi = SIDE_VIEW_POLAR;

	return new Promise<RecordResult[]>((resolve, reject) => {
		let animationFrameId = 0;
		let startTime: number | null = null;
		let aborted = false;

		const cleanup = () => {
			if (animationFrameId)
				cancelAnimationFrame(animationFrameId);

			model.dispose();
			stage.dispose();

			for (const take of takes) {
				take.renderer.dispose();

				if (!options.previewHost)
					take.canvas.remove();
			}
		};

		const stopped = takes.map((take) => new Promise<RecordResult>((done, fail) => {
			take.recorder.onerror = (error) => {
				aborted = true;
				fail(error);
			};

			take.recorder.onstop = () => {
				const blob = new Blob(take.chunks, { type: mimeType });

				done({ blob, url: URL.createObjectURL(blob), mimeType, sizeBytes: blob.size, durationSeconds, width, height });
			};
		}));

		Promise.all(stopped).then(
			(results) => {
				cleanup();
				resolve(results);
			},
			(error) => {
				cleanup();

				for (const take of takes) {
					if ('inactive' !== take.recorder.state)
						take.recorder.stop();
				}

				reject(error);
			},
		);

		engine.start(0);

		for (const take of takes)
			take.recorder.start(100);

		const renderStep = (now: number) => {
			if (aborted)
				return;

			if (null === startTime)
				startTime = now;

			const elapsed = now - startTime;
			const progress = Math.min(elapsed / durationMs, 1);

			onProgress?.({
				currentSecond: Math.min(Math.floor(elapsed / 1000) + 1, durationSeconds),
				totalSeconds: durationSeconds,
				percent: Math.round(progress * 100),
			});

			engine.tick(elapsed);
			model.syncIfChanged();

			const theta = progress * Math.PI * 2 * rotations;
			camera.position.set(
				target.x + radius * Math.sin(phi) * Math.sin(theta),
				target.y + radius * Math.cos(phi),
				target.z + radius * Math.sin(phi) * Math.cos(theta),
			);
			camera.lookAt(target);

			for (const take of takes) {
				stage.setFogColor(take.background);
				take.renderer.render(stage.scene, camera);
			}

			if (elapsed < durationMs)
				animationFrameId = requestAnimationFrame(renderStep);

			else {
				for (const take of takes)
					take.recorder.stop();
			}
		};

		animationFrameId = requestAnimationFrame(renderStep);
	});
}
