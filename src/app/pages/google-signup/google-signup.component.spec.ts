import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '@environment';
import { AuthSession } from '../../services/auth-session.service';
import { GoogleSignupService } from '../../services/google-signup.service';
import { SnackbarService } from '../../services/snackbar.service';
import { GoogleSignupPage } from './google-signup.component';

/**
 * Tokens as the API gives them.
 */
const TOKENS = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

/**
 * Where the API answers whether a username is free.
 */
const AVAILABLE = `${environment.apiUrl}/session/username-available`;

/**
 * Where the API creates the account.
 */
const COMPLETE = `${environment.apiUrl}/session/google/complete`;

/**
 * Creates the page with a Google signup in progress.
 */
function createPage (returnUrl: string | null = null) {
	TestBed.configureTestingModule({ providers: [ provideRouter([]), provideHttpClient(), provideHttpClientTesting() ] });

	const signup = TestBed.inject(GoogleSignupService);
	signup.start({ signupToken: 'signup-1', email: 'gina@gmail.com', returnUrl });

	const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
	const fixture = TestBed.createComponent(GoogleSignupPage);
	fixture.detectChanges();

	const element = fixture.nativeElement as HTMLElement;

	return {
		fixture,
		element,
		navigate,
		signup,
		server: TestBed.inject(HttpTestingController),
		session: TestBed.inject(AuthSession),
		snackbar: TestBed.inject(SnackbarService),

		/**
		 * The text of the page.
		 */
		text: () => element.textContent?.replace(/\s+/g, ' ') ?? '',

		/**
		 * Moves the slider to an age.
		 */
		slide (age: number) {
			const slider = element.querySelector('input[type="range"]') as HTMLInputElement;

			slider.value = String(age);
			slider.dispatchEvent(new Event('input'));
			fixture.detectChanges();
		},

		/**
		 * Types in the username box and, unless told not to, waits as long as the page does before looking the name up.
		 */
		type (name: string, wait = true) {
			const box = element.querySelector('input[formControlName="username"]') as HTMLInputElement;

			box.value = name;
			box.dispatchEvent(new Event('input'));

			if (wait)
				vi.advanceTimersByTime(400);

			fixture.detectChanges();
		},

		/**
		 * Presses the button of the form (or the one that says `label`).
		 */
		press (label: string) {
			const button = [ ...element.querySelectorAll('button') ].find((candidate) => candidate.textContent?.trim().startsWith(label));

			button?.click();
			fixture.detectChanges();
		},

		/**
		 * The main button of the form.
		 */
		submitButton: () => element.querySelector('button[type="submit"]') as HTMLButtonElement,
	};
}

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
	vi.useRealTimers();
	localStorage.clear();
});

describe('GoogleSignupPage', () => {
	it('starts by asking the age on a slider, and says which Google account is being used', () => {
		const { element, text } = createPage();
		const slider = element.querySelector('input[type="range"]') as HTMLInputElement;

		expect(text()).toContain('¿Cuántos años tienes?');
		expect(text()).toContain('Paso 1 de 2');
		expect(text()).toContain('gina@gmail.com');
		expect(slider.value).toBe('18');
		expect(element.querySelector('input[formControlName="username"]')).toBeNull();
	});

	it('shows the age while the slider moves', () => {
		const { element, slide } = createPage();

		slide(42);

		expect(element.querySelector('output')?.textContent?.trim()).toBe('42');
	});

	it('asks the username in a second step, and can go back to the age', () => {
		const { element, text, press, slide, fixture } = createPage();

		slide(30);
		press('Siguiente');

		expect(text()).toContain('Elige tu nombre');
		expect(text()).toContain('Paso 2 de 2');
		expect(element.querySelector('input[type="range"]')).toBeNull();

		press('Atrás');

		expect(text()).toContain('¿Cuántos años tienes?');
		expect((element.querySelector('input[type="range"]') as HTMLInputElement).value).toBe('30');
		fixture.detectChanges();
	});

	it('looks the username up once the user stops typing, and only asks for what was typed last', () => {
		const { server, type, press } = createPage();

		press('Siguiente');
		type('zo');
		server.expectNone(AVAILABLE);

		type('zoe', false);
		type('zoey');
		const request = server.expectOne((candidate) => candidate.url === AVAILABLE);
		expect(request.request.params.get('username')).toBe('zoey');
	});

	it('only lets the account be created when the username is free', () => {
		const { server, type, press, text, submitButton, fixture } = createPage();

		press('Siguiente');

		expect(submitButton().disabled).toBe(true);

		type('zo');
		expect(text()).toContain('Entre 3 y 50 caracteres.');
		expect(submitButton().disabled).toBe(true);

		type('zoe');
		expect(text()).toContain('Comprobando');
		expect(submitButton().disabled).toBe(true);

		server.expectOne((candidate) => candidate.url === AVAILABLE).flush({ available: false });
		fixture.detectChanges();
		expect(text()).toContain('Ese nombre ya está en uso');
		expect(submitButton().disabled).toBe(true);

		type('zoe2');
		server.expectOne((candidate) => candidate.url === AVAILABLE).flush({ available: true });
		fixture.detectChanges();
		expect(text()).toContain('Está libre.');
		expect(submitButton().disabled).toBe(false);
	});

	it('does not trust an old answer when the name changes after it', () => {
		const { server, type, press, submitButton, fixture } = createPage();

		press('Siguiente');
		type('zoe');
		server.expectOne((candidate) => candidate.url === AVAILABLE).flush({ available: true });
		fixture.detectChanges();
		expect(submitButton().disabled).toBe(false);

		type('zoer');

		expect(submitButton().disabled).toBe(true);
		server.expectOne((candidate) => candidate.url === AVAILABLE);
	});

	it('lets the API have the last word when it cannot say whether the name is free', () => {
		const { server, type, press, text, submitButton, fixture } = createPage();

		press('Siguiente');
		type('zoe');
		server.expectOne((candidate) => candidate.url === AVAILABLE).error(new ProgressEvent('error'));
		fixture.detectChanges();

		expect(text()).toContain('No pudimos comprobarlo');
		expect(submitButton().disabled).toBe(false);
	});

	it('creates the account with the age and username, signs in and goes home', () => {
		const { server, type, press, slide, fixture, session, signup, navigate, snackbar } = createPage();

		slide(30);
		press('Siguiente');
		type('  zoe  ');
		server.expectOne((candidate) => candidate.url === AVAILABLE).flush({ available: true });
		fixture.detectChanges();
		press('Crear cuenta');

		const request = server.expectOne(COMPLETE);
		expect(request.request.body).toEqual({ signupToken: 'signup-1', age: 30, username: 'zoe' });
		request.flush(TOKENS);

		expect(session.accessToken()).toBe('access-1');
		expect(signup.pending()).toBeNull();
		expect(snackbar.message()?.text).toContain('zoe');
		expect(navigate).toHaveBeenCalledWith('/inicio');
	});

	it('goes back to the page that asked for the login', () => {
		const { server, type, press, fixture, navigate } = createPage('/editor');

		press('Siguiente');
		type('zoe');
		server.expectOne((candidate) => candidate.url === AVAILABLE).flush({ available: true });
		fixture.detectChanges();
		press('Crear cuenta');
		server.expectOne(COMPLETE).flush(TOKENS);

		expect(navigate).toHaveBeenCalledWith('/editor');
	});

	it('says so when somebody took the username in the meantime, and keeps the signup', () => {
		const { server, type, press, text, fixture, session, signup, submitButton } = createPage();

		press('Siguiente');
		type('zoe');
		server.expectOne((candidate) => candidate.url === AVAILABLE).flush({ available: true });
		fixture.detectChanges();
		press('Crear cuenta');
		server.expectOne(COMPLETE).flush({ message: 'Ese nombre de usuario ya está en uso.' }, { status: 409, statusText: 'Conflict' });
		fixture.detectChanges();

		expect(text()).toContain('Ese nombre de usuario ya está en uso.');
		expect(submitButton().disabled).toBe(true);
		expect(session.signedIn()).toBe(false);
		expect(signup.pending()).not.toBeNull();
	});

	it('sends the user to log in again when the signup expired', () => {
		const { server, type, press, fixture, signup, navigate, snackbar } = createPage();

		press('Siguiente');
		type('zoe');
		server.expectOne((candidate) => candidate.url === AVAILABLE).flush({ available: true });
		fixture.detectChanges();
		press('Crear cuenta');
		server.expectOne(COMPLETE).flush({ message: 'Tu sesión de Google expiró. Vuelve a elegir tu cuenta.' }, { status: 401, statusText: 'Unauthorized' });

		expect(signup.pending()).toBeNull();
		expect(snackbar.message()?.kind).toBe('error');
		expect(navigate).toHaveBeenCalledWith('/login');
	});

	it('forgets the signup and goes back to the login page when cancelled', () => {
		const { press, signup, navigate } = createPage();

		press('Cancelar');

		expect(signup.pending()).toBeNull();
		expect(navigate).toHaveBeenCalledWith('/login');
	});
});
