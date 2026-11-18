import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@environment';
import { PreviewVideos, RecordResult } from '../../cube';
import { CreationsService } from './creations.service';

/**
 * A recording of a type, as the recorder gives it.
 */
function recording (mimeType: string): RecordResult {
	const blob = new Blob([ 'video' ], { type: mimeType });

	return { blob, url: '', mimeType, sizeBytes: blob.size, durationSeconds: 15, width: 480, height: 480 };
}

describe('CreationsService', () => {
	beforeEach(() => TestBed.configureTestingModule({ providers: [ provideHttpClient(), provideHttpClientTesting() ] }));

	it('gives the address of the video of a theme, dark when none is given, with the token', () => {
		const service = TestBed.inject(CreationsService);

		expect(service.videoUrl({ id: 7 })).toBe(`${environment.apiUrl}/creations/7/video?theme=dark`);
		expect(service.videoUrl({ id: 7, theme: 'light', token: 'a b' })).toBe(`${environment.apiUrl}/creations/7/video?theme=light&access_token=a+b`);
	});

	it('sends both videos, each named after the kind of video it is', () => {
		const service = TestBed.inject(CreationsService);
		const server = TestBed.inject(HttpTestingController);
		const videos: PreviewVideos = { dark: recording('video/webm;codecs=vp9'), light: recording('video/mp4') };

		service.updateCreation({ id: 7 }, { title: 'Cometas', program: { version: 1, scripts: [] }, videos }).subscribe();

		const body = server.expectOne(`${environment.apiUrl}/creations/7`).request.body as FormData;

		expect((body.get('videoDark') as File).name).toBe('preview.webm');
		expect((body.get('videoLight') as File).name).toBe('preview.mp4');
		expect(body.get('video')).toBeNull();
		server.verify();
	});
});
