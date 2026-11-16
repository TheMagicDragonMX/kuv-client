import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '@environment';
import { AuthSession } from '../../services/auth-session.service';
import { Profile } from '../../models';
import { ProfilePage } from './profile.component';
import { MAX_ZOOM, centeredView, clampView, cropOf, photoFileProblem } from './profile-photo';

/**
 * The signed-in user.
 */
const ME: Profile = { id: 1, username: 'ana', email: 'ana@example.com', bio: 'Me gustan los cubos.', photo: null, followers: 1, following: 0, followsYou: false, youFollow: false, isYou: true };

/**
 * Creates the page and answers the request for the profile.
 */
function createPage (profile: Profile | null = ME) {
	TestBed.configureTestingModule({ providers: [ provideRouter([]), provideHttpClient(), provideHttpClientTesting() ] });

	const fixture = TestBed.createComponent(ProfilePage);
	const server = TestBed.inject(HttpTestingController);
	fixture.detectChanges();

	const request = server.expectOne(`${environment.apiUrl}/users/me`);

	if (profile)
		request.flush(profile);

	else
		request.flush(null, { status: 500, statusText: 'Error' });

	fixture.detectChanges();

	return {
		fixture,
		server,
		element: fixture.nativeElement as HTMLElement,
		page: fixture.componentInstance as unknown as {
			edit(): void;
			draft: { set(value: string): void };
			saveBio(): void;
			changePhoto(event: Event): Promise<void>;
			cropPhoto(crop: { x: number; y: number; side: number }): Promise<void>;
			removePhoto(): void;
			signOut(): void;
		},
	};
}

describe('ProfilePage', () => {
	it('shows the name, the email, the bio and the counts of the user', () => {
		const { element } = createPage();

		expect(element.querySelector('h1')?.textContent).toContain('@ana');
		expect(element.textContent).toContain('ana@example.com');
		expect(element.textContent).toContain('Me gustan los cubos.');
		expect(element.textContent).toContain('1 seguidor');
		expect(element.textContent).toContain('0 seguidos');
		expect(element.querySelector('app-follow-section')).not.toBeNull();
	});

	it('shows the initial when there is no photo', () => {
		const { element } = createPage();

		expect(element.querySelector('section app-avatar')?.textContent?.trim()).toBe('A');
	});

	it('shows the picture from the address the API gives, with the API address in front', () => {
		const { element } = createPage({ ...ME, photo: '/users/1/photo?v=7' });

		expect(element.querySelector('section app-avatar img')?.getAttribute('src')).toBe(`${environment.apiUrl}/users/1/photo?v=7`);
	});

	it('saves the bio that was written, and only the bio', () => {
		const { fixture, server, element, page } = createPage();
		page.edit();
		page.draft.set('Hola');
		page.saveBio();

		const save = server.expectOne(`${environment.apiUrl}/users/me`);
		expect(save.request.method).toBe('PUT');
		expect(save.request.body).toEqual({ bio: 'Hola' });
		save.flush({ ...ME, bio: 'Hola' });
		fixture.detectChanges();

		expect(element.textContent).toContain('Hola');
		expect(element.querySelector('textarea')).toBeNull();
	});

	it('opens the picture the user chose in the cropper, and uploads the square they framed as a JPEG file', async () => {
		const { fixture, server, element, page } = createPage();
		const picture = new File([ 'png' ], 'me.png', { type: 'image/png' });
		const bitmap = { width: 400, height: 200, close: vi.fn() };
		const drawImage = vi.fn();
		const dialog = element.querySelector('dialog') as HTMLDialogElement;
		const showModal = vi.fn();

		dialog.showModal = showModal;
		dialog.close = () => dialog.dispatchEvent(new Event('close'));
		vi.stubGlobal('createImageBitmap', async () => bitmap);
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), drawImage } as unknown as CanvasRenderingContext2D);
		vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) => done(new Blob([ 'jpeg' ], { type: 'image/jpeg' })));

		await page.changePhoto({ target: { files: [ picture ], value: '' } } as unknown as Event);
		fixture.detectChanges();

		expect(showModal).toHaveBeenCalled();
		expect(element.querySelector('dialog app-photo-cropper')).not.toBeNull();
		server.expectNone(`${environment.apiUrl}/users/me/photo`);

		await page.cropPhoto({ x: 150, y: 50, side: 100 });

		expect(drawImage).toHaveBeenLastCalledWith(bitmap, 150, 50, 100, 100, 0, 0, 256, 256);

		const upload = server.expectOne(`${environment.apiUrl}/users/me/photo`);
		const sent = upload.request.body as FormData;
		expect(upload.request.method).toBe('PUT');
		expect((sent.get('photo') as File).type).toBe('image/jpeg');
		expect((sent.get('photo') as File).name).toBe('photo.jpg');
		upload.flush({ ...ME, photo: '/users/1/photo?v=8' });
		fixture.detectChanges();

		expect(element.querySelector('section app-avatar img')?.getAttribute('src')).toBe(`${environment.apiUrl}/users/1/photo?v=8`);
		expect(element.querySelector('dialog app-photo-cropper')).toBeNull();
		expect(bitmap.close).toHaveBeenCalled();

		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('keeps the cropper open, saying why, when the photo cannot be saved', async () => {
		const { fixture, server, element, page } = createPage();
		const dialog = element.querySelector('dialog') as HTMLDialogElement;
		const close = vi.fn();

		dialog.showModal = vi.fn();
		dialog.close = close;
		vi.stubGlobal('createImageBitmap', async () => ({ width: 100, height: 100, close: vi.fn() }));
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
		vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) => done(new Blob([ 'jpeg' ], { type: 'image/jpeg' })));

		await page.changePhoto({ target: { files: [ new File([ 'png' ], 'me.png', { type: 'image/png' }) ], value: '' } } as unknown as Event);
		fixture.detectChanges();
		await page.cropPhoto({ x: 0, y: 0, side: 100 });

		server.expectOne(`${environment.apiUrl}/users/me/photo`).flush({ message: 'La foto pesa demasiado.' }, { status: 400, statusText: 'Bad Request' });
		fixture.detectChanges();

		expect(close).not.toHaveBeenCalled();
		expect(element.querySelector('dialog app-photo-cropper [role="alert"]')?.textContent).toContain('La foto pesa demasiado.');

		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('does not upload a file that is not a picture', async () => {
		const { fixture, server, element, page } = createPage();

		await page.changePhoto({ target: { files: [ new File([ 'x' ], 'notes.txt', { type: 'text/plain' }) ], value: '' } } as unknown as Event);
		fixture.detectChanges();

		server.expectNone(`${environment.apiUrl}/users/me/photo`);
		expect(element.textContent).toContain('Elige una imagen');
	});

	it('takes the picture off the profile', () => {
		const { fixture, server, element, page } = createPage({ ...ME, photo: '/users/1/photo?v=7' });

		page.removePhoto();

		const removal = server.expectOne(`${environment.apiUrl}/users/me/photo`);
		expect(removal.request.method).toBe('DELETE');
		removal.flush({ ...ME, photo: null });
		fixture.detectChanges();

		expect(element.querySelector('section app-avatar')?.textContent?.trim()).toBe('A');
	});

	it('says so when the profile cannot be loaded, and offers to try again', () => {
		const { element } = createPage(null);

		expect(element.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar tu perfil.');
		expect(element.textContent).toContain('Reintentar');
	});

	it('ends the session and goes home when signing out', () => {
		const { page } = createPage();
		const session = TestBed.inject(AuthSession);
		const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
		session.save({ accessToken: 'a', refreshToken: 'r', expiresIn: 1 });

		page.signOut();

		expect(session.signedIn()).toBe(false);
		expect(navigate).toHaveBeenCalledWith('/inicio');
	});
});

describe('the profile photo', () => {
	it('starts on the square in the middle of the picture', () => {
		const size = { width: 400, height: 200 };

		expect(cropOf(size, centeredView(size))).toEqual({ x: 100, y: 0, side: 200 });
		expect(cropOf({ width: 100, height: 300 }, centeredView({ width: 100, height: 300 }))).toEqual({ x: 0, y: 100, side: 100 });
	});

	it('shows a smaller square the more it zooms in', () => {
		expect(cropOf({ width: 400, height: 200 }, { zoom: 2, centerX: 200, centerY: 100 })).toEqual({ x: 150, y: 50, side: 100 });
	});

	it('never zooms out past the picture nor in past the most', () => {
		const size = { width: 400, height: 200 };

		expect(clampView(size, { zoom: 0.5, centerX: 200, centerY: 100 }).zoom).toBe(1);
		expect(clampView(size, { zoom: 50, centerX: 200, centerY: 100 }).zoom).toBe(MAX_ZOOM);
	});

	it('never moves the square off the picture', () => {
		const size = { width: 400, height: 200 };

		expect(cropOf(size, { zoom: 1, centerX: -500, centerY: 900 })).toEqual({ x: 0, y: 0, side: 200 });
		expect(cropOf(size, { zoom: 2, centerX: 1000, centerY: -10 })).toEqual({ x: 300, y: 0, side: 100 });
	});

	it('only takes pictures of up to 10 MB', () => {
		expect(photoFileProblem({ type: 'image/png', size: 1000 })).toBeNull();
		expect(photoFileProblem({ type: 'text/plain', size: 10 })).toContain('Elige una imagen');
		expect(photoFileProblem({ type: 'image/jpeg', size: 11 * 1024 * 1024 })).toContain('10 MB');
	});
});
