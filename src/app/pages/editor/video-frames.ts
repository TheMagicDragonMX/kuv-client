/**
 * Turns a video file into the frames the cube plays. Browser code (it needs a <video> and a
 * canvas); the shrinking of each frame is `pixelate`, the same as for pictures.
 *
 * The video is read by seeking: for each frame, jump to its time, wait for the browser to have
 * it, copy the chosen square into a canvas and shrink it. That is slower than playing the video
 * through, but it gives exactly the frames asked for, whatever the speed of the computer.
 */

import { pixelate } from '../../cube';
import { Crop } from './crop';

/**
 * Frames per second the cube plays a video at.
 */
export const FRAMES_PER_SECOND = 15;

/**
 * Longest part of a video that is used, from its start, in seconds. Each second costs
 * `FRAMES_PER_SECOND` frames of 16 KB.
 */
export const MAX_SECONDS = 10;

/**
 * Biggest side, in pixels, a frame is copied at before `pixelate` shrinks it to a face (four
 * source pixels per LED). Keeps the work per frame small.
 */
const MAX_FRAME_SIDE = 256;

/**
 * Longest wait, in milliseconds, for the browser to reach a time of the video.
 */
const SEEK_TIMEOUT = 5000;

/**
 * A video the user chose, ready to be cropped and cut.
 */
export interface OpenedVideo {
	element: HTMLVideoElement;

	/**
	 * Its first frame, to crop on.
	 */
	poster: ImageBitmap;

	/**
	 * Seconds that will be used (the length of the video, up to `MAX_SECONDS`).
	 */
	seconds: number;

	url: string;
}

/**
 * Loads a video file and its first frame. Throws if the browser cannot play it.
 */
export async function openVideo (file: File): Promise<OpenedVideo> {
	const url = URL.createObjectURL(file);
	const element = document.createElement('video');

	element.muted = true;
	element.playsInline = true;
	element.preload = 'auto';

	try {
		await new Promise<void>((resolve, reject) => {
			element.onloadeddata = () => resolve();
			element.onerror = () => reject(new Error('The browser cannot play this video'));
			element.src = url;
		});

		if (!Number.isFinite(element.duration) || 0 === element.videoWidth)
			throw new Error('The video has no length or no picture');

		return { element, poster: await createImageBitmap(element), seconds: Math.min(element.duration, MAX_SECONDS), url };
	}

	catch (error) {
		URL.revokeObjectURL(url);
		throw error;
	}
}

/**
 * Frees a video opened with `openVideo`. Its `poster` is left alone: it may still be on
 * screen, and whoever shows it closes it.
 */
export function closeVideo (video: OpenedVideo): void {
	video.element.removeAttribute('src');
	video.element.load();
	URL.revokeObjectURL(video.url);
}

/**
 * Reads the frames of the chosen square of a video, shrunk to the pixels of a face.
 * @param onProgress Called after each frame with how many are done and how many there are.
 * @param isCancelled Asked before each frame; when it answers true the work stops.
 * @returns The frames, or `null` if it was cancelled.
 */
export async function extractFrames (
	video: OpenedVideo,
	crop: Crop,
	onProgress: (done: number, total: number) => void,
	isCancelled: () => boolean,
): Promise<Uint32Array[] | null> {
	const total = Math.max(1, Math.floor(video.seconds * FRAMES_PER_SECOND));
	const size = Math.max(1, Math.min(Math.round(crop.side), MAX_FRAME_SIDE));
	const lastTime = Math.max(0, video.element.duration - 0.05);

	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;

	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context)
		throw new Error('The browser cannot draw the video');

	context.imageSmoothingQuality = 'high';

	const frames: Uint32Array[] = [];

	for (let index = 0; index < total; index += 1) {
		if (isCancelled())
			return null;

		await seek(video.element, Math.min(index / FRAMES_PER_SECOND, lastTime));
		context.drawImage(video.element, crop.x, crop.y, crop.side, crop.side, 0, 0, size, size);
		frames.push(pixelate(context.getImageData(0, 0, size, size)));
		onProgress(index + 1, total);
	}

	return frames;
}

/**
 * Waits until the video shows the frame at a time.
 */
function seek (element: HTMLVideoElement, time: number): Promise<void> {
	if (0.001 > Math.abs(element.currentTime - time) && 2 <= element.readyState)
		return Promise.resolve();

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => finish(() => reject(new Error('The video stopped answering'))), SEEK_TIMEOUT);
		const onSeeked = (): void => finish(resolve);

		function finish (done: () => void): void {
			clearTimeout(timer);
			element.removeEventListener('seeked', onSeeked);
			done();
		}

		element.addEventListener('seeked', onSeeked);
		element.currentTime = time;
	});
}
