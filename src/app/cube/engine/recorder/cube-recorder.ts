/**
 * LAYER: recorder.
 *
 * Records a Program running on a 3D Cube into an MP4/WebM video with a smooth 360-degree orbit.
 * Runs completely client-side. The recording is offline: the engine is stepped frame by frame at
 * a fixed rate (it never reads a clock), each frame is drawn with WebGL and encoded with WebCodecs,
 * and mediabunny writes the frames into the file. So every video has exactly its frames, takes
 * as long as the computer needs (usually less than the video lasts), and does not depend on the
 * screen's refresh rate or on the tab being visible.
 *
 * The video has a solid background (not every browser can record transparency), so the preview of
 * a creation is recorded twice in the same pass, once over the background of each theme of the app.
 * The same pass takes its thumbnail: the face of the cube with the most LEDs on, at the frame where
 * one had the most.
 */

import type { BufferTarget, CanvasSource, Mp4OutputFormat, Output, VideoCodec, WebMOutputFormat } from 'mediabunny';
import * as THREE from 'three';
import { CubeEngine } from '../engine/cube-engine';
import { Environment } from '../environment/environment';
import { CubeState, FACE_COUNT, FACE_RESOLUTION, Face } from '../state/cube-state';
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
 * The preview of a creation: a video per theme and its thumbnail, a 64x64 PNG of the face of the
 * cube that had the most LEDs on, at the moment it had the most.
 */
export type PreviewVideos = Record<PreviewTheme, RecordResult> & {
	/**
	 * The thumbnail, as a PNG.
	 */
	thumbnail: Blob;
};

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
 * The codecs a video is encoded with, the first one the browser can encode. VP9 and VP8 go in a
 * WebM file and AVC (H.264) in an MP4.
 */
const CODECS: VideoCodec[] = [ 'vp9', 'vp8', 'avc' ];

/**
 * Checks if the browser can record videos: it needs WebCodecs to encode the frames.
 */
export function isRecordingSupported (): boolean {
	return (
		'undefined' !== typeof window &&
		'undefined' !== typeof HTMLCanvasElement &&
		'undefined' !== typeof VideoEncoder
	);
}

/**
 * Waits for the browser to handle what it has pending (painting the page, events), so a long
 * recording does not freeze it. It uses a message, not a timer or an animation frame, because
 * those slow down or stop when the tab is in the background.
 */
function yieldToPage (): Promise<void> {
	return new Promise((resolve) => {
		const channel = new MessageChannel();

		channel.port1.onmessage = () => resolve();
		channel.port2.postMessage(null);
	});
}

/**
 * Runs a program on a 3D cube model and records it to a video Blob.
 */
export async function recordCubeVideo (
	program: Program,
	options: RecordCubeOptions = {},
	onProgress?: (progress: RecordProgress) => void,
): Promise<RecordResult> {
	const { results: [ result ] } = await recordOverBackgrounds(program, options, [ options.background ?? BACKGROUND ], onProgress);

	return result;
}

/**
 * Records the preview videos of a program with `PREVIEW_VIDEO_OPTIONS`: one over the background of
 * each theme, in a single pass, so both show the same frames, and its thumbnail. The preview host
 * shows the dark one.
 */
export async function recordPreviewVideos (
	program: Program,
	options: Pick<RecordCubeOptions, 'environment' | 'previewHost'> = {},
	onProgress?: (progress: RecordProgress) => void,
): Promise<PreviewVideos> {
	const { results: [ dark, light ], thumbnail } = await recordOverBackgrounds(
		program,
		{ ...PREVIEW_VIDEO_OPTIONS, ...options },
		[ PREVIEW_BACKGROUNDS.dark, PREVIEW_BACKGROUNDS.light ],
		onProgress,
	);

	return { dark, light, thumbnail: await toPng(thumbnail) };
}

/**
 * How many LEDs of a face are on (any color but black).
 */
function litCount (pixels: Uint32Array): number {
	let count = 0;

	for (const pixel of pixels) {
		if (0 !== pixel)
			count += 1;
	}

	return count;
}

/**
 * The LEDs of a face as a PNG of their size, one pixel per LED, the ones that are off black.
 */
function toPng (pixels: Uint32Array): Promise<Blob> {
	const canvas = document.createElement('canvas');
	canvas.width = FACE_RESOLUTION;
	canvas.height = FACE_RESOLUTION;

	const context = canvas.getContext('2d');

	if (!context)
		return Promise.reject(new Error('This browser cannot draw the thumbnail.'));

	const image = context.createImageData(FACE_RESOLUTION, FACE_RESOLUTION);

	pixels.forEach((color, index) => {
		image.data[index * 4] = color >> 16 & 0xff;
		image.data[index * 4 + 1] = color >> 8 & 0xff;
		image.data[index * 4 + 2] = color & 0xff;
		image.data[index * 4 + 3] = 0xff;
	});

	context.putImageData(image, 0, 0);

	return new Promise((resolve, reject) => canvas.toBlob(
		(blob) => blob ? resolve(blob) : reject(new Error('This browser cannot encode the thumbnail.')),
		'image/png',
	));
}

/**
 * Keeps the LEDs of the face that had the most on so far, frame after frame, for the thumbnail.
 */
class ThumbnailPicker {
	/**
	 * The LEDs of the chosen face, row after row. Black until a frame lights one.
	 */
	pixels = new Uint32Array(FACE_RESOLUTION * FACE_RESOLUTION);

	/**
	 * How many LEDs the chosen face had on.
	 */
	private best = 0;

	/**
	 * Looks at the faces of a frame and keeps the one with more LEDs on than any face before it.
	 * On a tie the earlier one stays.
	 */
	look (state: CubeState): void {
		for (let face: Face = 0; face < FACE_COUNT; face += 1) {
			const pixels = state.facePixels(face);
			const count = litCount(pixels);

			if (count > this.best) {
				this.best = count;
				this.pixels = pixels.slice();
			}
		}
	}
}

/**
 * One video being recorded: the canvas it is drawn on, its renderer and the file it is written to.
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
	 * Encodes what the canvas shows as the next frame of the video.
	 */
	source: CanvasSource;

	/**
	 * The video file being written, in memory.
	 */
	output: Output<WebMOutputFormat | Mp4OutputFormat, BufferTarget>;
};

/**
 * What one pass records: a video per background and the LEDs of the face for the thumbnail.
 */
type Recording = {
	/**
	 * The videos, in the order of the backgrounds.
	 */
	results: RecordResult[];

	/**
	 * The LEDs of the face with the most on, row after row.
	 */
	thumbnail: Uint32Array;
};

/**
 * Runs a program once and records it into one video per background. Every frame is drawn on the
 * canvas of each video, so they all show the same moment; only the color behind the cube (and the
 * fog, which fades into it) changes. Every frame is also looked at for the thumbnail.
 */
async function recordOverBackgrounds (
	program: Program,
	options: RecordCubeOptions,
	backgrounds: readonly string[],
	onProgress?: (progress: RecordProgress) => void,
): Promise<Recording> {
	if (!isRecordingSupported())
		throw new Error('This browser cannot record videos: it has no WebCodecs.');

	const durationSeconds = options.durationSeconds ?? 15;
	const fps = options.fps ?? 30;
	const width = options.width ?? 480;
	const height = options.height ?? 480;
	const bitrate = options.bitrate ?? 2_500_000;
	const rotations = options.rotations ?? 1;
	const frameCount = Math.round(durationSeconds * fps);

	/**
	 * Loaded only when a video is recorded: it is big, and most visits never record one.
	 */
	const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, WebMOutputFormat, getFirstEncodableVideoCodec } = await import('mediabunny');

	const codec = await getFirstEncodableVideoCodec(CODECS, { width, height, quality: new Quality({ bitrate, bitrateMode: 'variable' }), frameRate: fps });

	if (!codec)
		throw new Error('This browser cannot encode any of the video codecs (VP9, VP8, H.264).');

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

		const output = new Output({
			format: 'avc' === codec ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
			target: new BufferTarget(),
		});
		const source = new CanvasSource(canvas, { codec, quality: new Quality({ bitrate, bitrateMode: 'variable' }) });

		output.addVideoTrack(source, { frameRate: fps });

		return { background, canvas, renderer, source, output };
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
	const thumbnail = new ThumbnailPicker();

	try {
		await Promise.all(takes.map((take) => take.output.start()));

		engine.start(0);

		for (let frame = 0; frame < frameCount; frame += 1) {
			const seconds = frame / fps;
			const progress = frame / frameCount;

			engine.tick(seconds * 1000);
			model.syncIfChanged();
			thumbnail.look(engine.state);

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

				/**
				 * Waiting here keeps the encoder from falling behind with frames piling up in memory.
				 */
				await take.source.add(seconds, 1 / fps);
			}

			onProgress?.({
				currentSecond: Math.min(Math.floor(seconds) + 1, durationSeconds),
				totalSeconds: durationSeconds,
				percent: Math.round((frame + 1) / frameCount * 100),
			});

			await yieldToPage();
		}

		await Promise.all(takes.map((take) => take.output.finalize()));

		const results = takes.map((take) => {
			const blob = new Blob([ take.output.target.buffer as ArrayBuffer ], { type: take.output.format.mimeType });

			return { blob, url: URL.createObjectURL(blob), mimeType: blob.type, sizeBytes: blob.size, durationSeconds, width, height };
		});

		return { results, thumbnail: thumbnail.pixels };
	}

	catch (error) {
		await Promise.all(takes.map((take) => take.output.cancel().catch(() => undefined)));

		throw error;
	}

	finally {
		model.dispose();
		stage.dispose();

		for (const take of takes) {
			take.renderer.dispose();

			if (!options.previewHost)
				take.canvas.remove();
		}
	}
}
