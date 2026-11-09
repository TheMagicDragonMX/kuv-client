import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../environments';
import { AuthSession } from '../../services/auth-session.service';
import { Profile } from '../../services/users.http.service';
import { ProfilePage } from './profile.component';
import { centerSquare, photoFileProblem } from './profile-photo';

/**
 * The signed-in user.
 */
const ME: Profile = { id: 1, username: 'ana', email: 'ana@example.com', description: 'Me gustan los cubos.', photo: null, followers: 1, following: 0, followsYou: false, youFollow: false, isYou: true };

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
			saveDescription(): void;
			signOut(): void;
		},
	};
}

describe('ProfilePage', () => {
	it('shows the name, the email, the description and the counts of the user', () => {
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

	it('saves the description that was written, keeping the photo', () => {
		const { fixture, server, element, page } = createPage();
		page.edit();
		page.draft.set('Hola');
		page.saveDescription();

		const save = server.expectOne(`${environment.apiUrl}/users/me`);
		expect(save.request.method).toBe('PUT');
		expect(save.request.body).toEqual({ description: 'Hola', photo: null });
		save.flush({ ...ME, description: 'Hola' });
		fixture.detectChanges();

		expect(element.textContent).toContain('Hola');
		expect(element.querySelector('textarea')).toBeNull();
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
	it('takes the square in the middle of the picture', () => {
		expect(centerSquare(400, 200)).toEqual({ x: 100, y: 0, side: 200 });
		expect(centerSquare(100, 300)).toEqual({ x: 0, y: 100, side: 100 });
	});

	it('only takes pictures of up to 10 MB', () => {
		expect(photoFileProblem({ type: 'image/png', size: 1000 })).toBeNull();
		expect(photoFileProblem({ type: 'text/plain', size: 10 })).toContain('Elige una imagen');
		expect(photoFileProblem({ type: 'image/jpeg', size: 11 * 1024 * 1024 })).toContain('10 MB');
	});
});
