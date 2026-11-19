import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@environment';
import { PreviewVideos, RecordResult } from '../../cube';
import { AdminService } from './admin.service';

/**
 * A recording of a type, as the recorder gives it.
 */
function recording (mimeType: string): RecordResult {
	const blob = new Blob([ 'video' ], { type: mimeType });

	return { blob, url: '', mimeType, sizeBytes: blob.size, durationSeconds: 15, width: 480, height: 480 };
}

describe('AdminService', () => {
	beforeEach(() => TestBed.configureTestingModule({ providers: [ provideHttpClient(), provideHttpClientTesting() ] }));

	it('lists every creation', () => {
		const service = TestBed.inject(AdminService);
		const server = TestBed.inject(HttpTestingController);
		let titles: string[] = [];

		service.allCreations().subscribe((creations) => titles = creations.map((creation) => creation.title));
		server.expectOne(`${environment.apiUrl}/admin/creations`).flush([
			{ id: 2, title: 'Lluvia', authorId: 4, authorUsername: 'toño', hasVideo: false, isPublic: false, createdAt: '2026-11-18T00:00:00Z', updatedAt: '2026-11-18T00:00:00Z' },
		]);

		expect(titles).toEqual([ 'Lluvia' ]);
		server.verify();
	});

	it('replaces the preview of a creation with only its two videos and its thumbnail', () => {
		const service = TestBed.inject(AdminService);
		const server = TestBed.inject(HttpTestingController);
		const videos: PreviewVideos = { dark: recording('video/webm'), light: recording('video/mp4'), thumbnail: new Blob([ 'png' ], { type: 'image/png' }) };

		service.setPreview({ id: 7 }, { videos }).subscribe();

		const request = server.expectOne(`${environment.apiUrl}/admin/creations/7/preview`);
		const body = request.request.body as FormData;

		expect(request.request.method).toBe('PUT');
		expect([ ...body.keys() ]).toEqual([ 'videoDark', 'videoLight', 'thumbnail' ]);
		expect((body.get('videoDark') as File).name).toBe('preview.webm');
		expect((body.get('videoLight') as File).name).toBe('preview.mp4');
		expect((body.get('thumbnail') as File).name).toBe('thumbnail.png');
		server.verify();
	});
});
