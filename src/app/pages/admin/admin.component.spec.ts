import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '@environment';
import { PreviewVideos, RecordResult } from '../../cube';
import { AdminCreation } from '../../models';
import { PreviewRecorder } from '../../services/preview-recorder.service';
import { AdminPage } from './admin.component';

/**
 * Stands in for the recorder: browsers in tests have no WebGL or WebCodecs.
 */
const recorder = { supported: () => true, record: vi.fn<PreviewRecorder['record']>() };

/**
 * A recording, as the recorder gives it.
 */
function recording (): RecordResult {
	const blob = new Blob([ 'video' ], { type: 'video/webm' });

	return { blob, url: 'blob:video', mimeType: blob.type, sizeBytes: blob.size, durationSeconds: 15, width: 480, height: 480 };
}

/**
 * What the recorder answers in these tests.
 */
const VIDEOS: PreviewVideos = { dark: recording(), light: recording(), thumbnail: new Blob([ 'png' ], { type: 'image/png' }) };

/**
 * A creation of the list.
 */
function creation (id: number, hasVideo: boolean): AdminCreation {
	return { id, title: `Creación ${id}`, authorId: 10 + id, authorUsername: `autor${id}`, hasVideo, isPublic: false, createdAt: '2026-11-18T00:00:00Z', updatedAt: '2026-11-18T00:00:00Z' };
}

/**
 * The program file of every creation.
 */
const PROGRAM_FILE = { version: 1, program: { version: 1, objects: [], scripts: [] }, environment: {} };

/**
 * Opens the panel and answers the list of creations.
 */
function createPage (creations: AdminCreation[]) {
	TestBed.configureTestingModule({ providers: [ provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: PreviewRecorder, useValue: recorder } ] });

	const fixture = TestBed.createComponent(AdminPage);
	const server = TestBed.inject(HttpTestingController);

	fixture.detectChanges();
	server.expectOne(`${environment.apiUrl}/admin/creations`).flush(creations);
	fixture.detectChanges();

	return { fixture, server, element: fixture.nativeElement as HTMLElement };
}

/**
 * Lets the pending promises and timers of the queue run.
 */
async function settle (): Promise<void> {
	await vi.advanceTimersByTimeAsync(100);
}

/**
 * Answers the program of a creation and, once recorded, the upload of its preview.
 */
async function recordOne (server: HttpTestingController, id: number): Promise<void> {
	server.expectOne(`${environment.apiUrl}/creations/${id}`).flush({ ...creation(id, false), programFile: PROGRAM_FILE });
	await settle();

	const upload = server.expectOne(`${environment.apiUrl}/admin/creations/${id}/preview`);
	upload.flush({ ...creation(id, true), userId: 10 + id, description: null });
	await settle();
}

describe('AdminPage', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		recorder.record.mockReset().mockResolvedValue(VIDEOS);
	});

	afterEach(() => vi.useRealTimers());

	it('lists every creation, with its author, and filters the ones without video', () => {
		const { fixture, element } = createPage([ creation(1, true), creation(2, false), creation(3, false) ]);
		const rows = (): string[] => [ ...element.querySelectorAll('li') ].map((row) => row.textContent ?? '');

		expect(rows()).toHaveLength(3);
		expect(rows()[1]).toContain('@autor2');
		expect(element.textContent).toContain('Generar las que faltan (2)');

		([ ...element.querySelectorAll('[role="tab"]') ].find((tab) => tab.textContent?.includes('Sin video')) as HTMLElement).click();
		fixture.detectChanges();

		expect(rows()).toHaveLength(2);
		expect(rows().every((row) => row.includes('Sin video'))).toBe(true);
	});

	it('records the creations without video one after another and uploads each preview', async () => {
		const { fixture, server, element } = createPage([ creation(1, true), creation(2, false), creation(3, false) ]);

		([ ...element.querySelectorAll('button') ].find((button) => button.textContent?.includes('Generar las que faltan')) as HTMLElement).click();
		fixture.detectChanges();

		await recordOne(server, 2);
		fixture.detectChanges();
		expect(element.textContent).toContain('Grabando 2 de 2');

		await recordOne(server, 3);
		fixture.detectChanges();

		expect(recorder.record).toHaveBeenCalledTimes(2);
		expect(element.textContent).toContain('Generar las que faltan (0)');
		server.expectNone(`${environment.apiUrl}/creations/1`);
		server.verify();
	});

	it('keeps going when one fails, and marks it', async () => {
		recorder.record.mockRejectedValueOnce(new Error('no WebGL'));

		const { fixture, server, element } = createPage([ creation(1, false), creation(2, false) ]);

		([ ...element.querySelectorAll('button') ].find((button) => button.textContent?.includes('Generar las que faltan')) as HTMLElement).click();

		server.expectOne(`${environment.apiUrl}/creations/1`).flush({ ...creation(1, false), programFile: PROGRAM_FILE });
		await settle();
		server.expectNone(`${environment.apiUrl}/admin/creations/1/preview`);

		await recordOne(server, 2);
		fixture.detectChanges();

		const [ failed, done ] = [ ...element.querySelectorAll('li') ].map((row) => row.textContent ?? '');

		expect(failed).toContain('Falló');
		expect(done).toContain('Listo');
		server.verify();
	});

	it('stops after the one being recorded when the queue is stopped', async () => {
		const { fixture, server, element } = createPage([ creation(1, false), creation(2, false), creation(3, false) ]);

		([ ...element.querySelectorAll('button') ].find((button) => button.textContent?.includes('Generar las que faltan')) as HTMLElement).click();
		fixture.detectChanges();

		([ ...element.querySelectorAll('button') ].find((button) => button.textContent?.includes('Detener la cola')) as HTMLElement).click();
		await recordOne(server, 1);

		server.expectNone(`${environment.apiUrl}/creations/2`);
		expect(recorder.record).toHaveBeenCalledTimes(1);
		server.verify();
	});
});
