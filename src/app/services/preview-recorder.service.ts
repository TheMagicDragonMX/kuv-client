import { Injectable } from '@angular/core';
import { Environment, PreviewVideos, Program, RecordProgress, isRecordingSupported, recordPreviewVideos } from '../cube';

/**
 * What a preview is recorded with: the environment of the program and where the cube is shown
 * while it is recorded.
 */
export type PreviewRecordOptions = {
	/**
	 * The environment the program runs in.
	 */
	environment?: Environment;

	/**
	 * Where the cube is shown while it is recorded.
	 */
	previewHost?: HTMLElement;
};

/**
 * Records the preview of a program (its two videos and its thumbnail) for the pages that inject it
 * rather than calling the recorder, so their tests can give them a fake one.
 */
@Injectable({ providedIn: 'root' })
export class PreviewRecorder {
	/**
	 * Whether this browser can record videos.
	 */
	supported (): boolean {
		return isRecordingSupported();
	}

	/**
	 * Records the preview of a program with the usual preset.
	 */
	record (program: Program, options: PreviewRecordOptions, onProgress?: (progress: RecordProgress) => void): Promise<PreviewVideos> {
		return recordPreviewVideos(program, options, onProgress);
	}
}
