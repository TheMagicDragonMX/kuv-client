import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { environment } from '@environment';
import { AuthSession } from '../../services/auth-session.service';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { SignupService } from '../../services/signup.service';
import { ThemeService } from '../../services/theme.service';
import { GoogleButtonComponent } from './google-button.component';

/**
 * Tokens as the API gives them.
 */
const TOKENS = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

/**
 * Creates the button over a fake Google, where `choose` is the user picking an account.
 */
function createButton (options: { enabled?: boolean; returnUrl?: string } = {}) {
	const credentials = new Subject<string>();
	const renderButton = vi.fn().mockResolvedValue(undefined);

	TestBed.configureTestingModule({
		providers: [
			provideRouter([]),
			provideHttpClient(),
			provideHttpClientTesting(),
			{ provide: GoogleIdentityService, useValue: { enabled: options.enabled ?? true, credential$: credentials, renderButton } },
		],
	});

	const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
	const fixture = TestBed.createComponent(GoogleButtonComponent);
	const failures: string[] = [];

	fixture.componentRef.setInput('returnUrl', options.returnUrl ?? null);
	fixture.componentInstance.failed.subscribe((message) => failures.push(message));
	fixture.detectChanges();

	return {
		fixture,
		renderButton,
		navigate,
		failures,
		choose: (idToken: string) => credentials.next(idToken),
		server: TestBed.inject(HttpTestingController),
		session: TestBed.inject(AuthSession),
		signup: TestBed.inject(SignupService),
		element: fixture.nativeElement as HTMLElement,
	};
}

afterEach(() => localStorage.clear());

describe('GoogleButtonComponent', () => {
	it('asks Google to draw its button, dark or light like the page', () => {
		const { renderButton, element } = createButton();

		expect(renderButton).toHaveBeenCalledTimes(1);
		expect(renderButton.mock.calls[0][0]).toBe(element.querySelector('div'));
		expect(renderButton.mock.calls[0][1].theme).toBe('dark' === TestBed.inject(ThemeService).theme() ? 'filled_black' : 'outline');
		expect(renderButton.mock.calls[0][1].width).toBeGreaterThanOrEqual(200);
	});

	it('draws nothing while Google is not set up', () => {
		const { renderButton, element } = createButton({ enabled: false });

		expect(renderButton).not.toHaveBeenCalled();
		expect(element.querySelector('div')).toBeNull();
	});

	it('signs in a user the API knows and goes to the page that asked for it', () => {
		const { choose, server, session, navigate } = createButton({ returnUrl: '/editor' });

		choose('id-token-1');
		const request = server.expectOne(`${environment.apiUrl}/session/google`);
		expect(request.request.body).toEqual({ idToken: 'id-token-1' });
		request.flush({ status: 'signedIn', tokens: TOKENS });

		expect(session.accessToken()).toBe('access-1');
		expect(navigate).toHaveBeenCalledWith('/editor');
	});

	it('goes home when no page asked for the login', () => {
		const { choose, server, navigate } = createButton();

		choose('id-token-1');
		server.expectOne(`${environment.apiUrl}/session/google`).flush({ status: 'signedIn', tokens: TOKENS });

		expect(navigate).toHaveBeenCalledWith('/home');
	});

	it('starts the signup of an account the API does not know yet, without signing in', () => {
		const { choose, server, session, signup, navigate } = createButton({ returnUrl: '/editor' });

		choose('id-token-1');
		server.expectOne(`${environment.apiUrl}/session/google`).flush({ status: 'needsProfile', signupToken: 'signup-1', email: 'gina@gmail.com' });

		expect(session.signedIn()).toBe(false);
		expect(signup.pending()).toEqual({ kind: 'google', signupToken: 'signup-1', email: 'gina@gmail.com', returnUrl: '/editor' });
		expect(navigate).toHaveBeenCalledWith('/signup');
	});

	it('says why it failed: what the API said, or that the server cannot be reached', () => {
		const { choose, server, failures, session } = createButton();

		choose('id-token-1');
		server.expectOne(`${environment.apiUrl}/session/google`).flush({ message: 'No se pudo verificar tu cuenta de Google.' }, { status: 401, statusText: 'Unauthorized' });

		choose('id-token-2');
		server.expectOne(`${environment.apiUrl}/session/google`).error(new ProgressEvent('error'));

		expect(failures).toEqual([ 'No se pudo verificar tu cuenta de Google.', 'No se pudo conectar con el servidor.' ]);
		expect(session.signedIn()).toBe(false);
	});

	it('says so when Google cannot be loaded', async () => {
		const { renderButton, fixture, failures } = createButton();

		renderButton.mockRejectedValueOnce(new Error('offline'));
		TestBed.inject(ThemeService).toggle();
		fixture.detectChanges();
		await fixture.whenStable();

		expect(failures).toHaveLength(1);
		expect(failures[0]).toContain('No se pudo cargar el acceso con Google');
	});
});
