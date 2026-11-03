/**
 * LAYER: recorder.
 *
 * Records a Program running on a 3D Cube into an MP4/WebM video with a smooth 360-degree orbit.
 * Runs completely client-side using WebGL rendering and MediaRecorder.
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
};

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
		typeof window !== 'undefined' &&
		typeof HTMLCanvasElement !== 'undefined' &&
		'captureStream' in HTMLCanvasElement.prototype &&
		typeof MediaRecorder !== 'undefined'
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
	if (!isRecordingSupported()) 
		throw new Error('Canvas recording is not supported in this browser environment.');
	

	const durationSeconds = options.durationSeconds ?? 15;
	const durationMs = durationSeconds * 1000;
	const fps = options.fps ?? 30;
	const width = options.width ?? 480;
	const height = options.height ?? 480;
	const bitrate = options.bitrate ?? 2_500_000;
	const rotations = options.rotations ?? 1;

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.style.width = '100%';
	canvas.style.height = '100%';
	canvas.style.objectFit = 'contain';

	if (options.previewHost) 
		options.previewHost.replaceChildren(canvas);
	

	const engine = new CubeEngine();
	engine.load(program);
	if (options.environment) 
		engine.setEnvironment(options.environment);
	

	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		alpha: false,
		preserveDrawingBuffer: true,
	});
	renderer.setSize(width, height, false);
	renderer.setClearColor(BACKGROUND, 1);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	const stage = new Stage();
	const model = new CubeModel(engine.state);
	stage.add(model.group);

	const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
	const target = new THREE.Vector3(0, 0.6, 0);
	const radius = 7.5;
	const phi = SIDE_VIEW_POLAR;

	const stream = (canvas as any).captureStream(fps);

	// Select best supported MIME type
	const mimeCandidates = [
		'video/webm;codecs=vp9',
		'video/webm;codecs=vp8',
		'video/webm',
		'video/mp4;codecs=avc1',
		'video/mp4',
	];
	const mimeType = mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';

	const mediaRecorder = new MediaRecorder(stream, {
		mimeType,
		videoBitsPerSecond: bitrate,
	});

	const chunks: Blob[] = [];
	mediaRecorder.ondataavailable = (event) => {
		if (event.data && 0 < event.data.size) 
			chunks.push(event.data);
		
	};

	return new Promise<RecordResult>((resolve, reject) => {
		let animationFrameId: number;
		let startTime: number | null = null;
		let aborted = false;

		const cleanup = () => {
			if (animationFrameId) 
				cancelAnimationFrame(animationFrameId);
			
			model.dispose();
			stage.dispose();
			renderer.dispose();
			if (!options.previewHost) 
				canvas.remove();
			
		};

		mediaRecorder.onerror = (err) => {
			aborted = true;
			cleanup();
			reject(err);
		};

		mediaRecorder.onstop = () => {
			cleanup();
			const blob = new Blob(chunks, { type: mimeType });
			const url = URL.createObjectURL(blob);
			resolve({
				blob,
				url,
				mimeType,
				sizeBytes: blob.size,
				durationSeconds,
				width,
				height,
			});
		};

		// Start engine & recorder
		engine.start(0);
		mediaRecorder.start(100); // 100ms slices

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

			// Advance simulation
			engine.tick(elapsed);
			model.syncIfChanged();

			// Orbit camera 360 degrees
			const theta = progress * Math.PI * 2 * rotations;
			const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
			const y = target.y + radius * Math.cos(phi);
			const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

			camera.position.set(x, y, z);
			camera.lookAt(target);

			renderer.render(stage.scene, camera);

			if (elapsed < durationMs) 
				animationFrameId = requestAnimationFrame(renderStep);
			else 
				mediaRecorder.stop();
			
		};

		animationFrameId = requestAnimationFrame(renderStep);
	});
}

