import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { environment } from '../environments';
import { returnPath, signedInGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { AuthSession } from './auth-session.service';

/**
 * Tokens as the API gives them.
 */
const TOKENS = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

/**
 * A localStorage that lives in memory, so every test starts with nothing stored.
 */
function memoryStorage (): Storage {
	const items = new Map<string, string>();

	return {
		get length () {
			return items.size;
		},
		clear: () => items.clear(),
		getItem: (key) => items.get(key) ?? null,
		key: (index) => [ ...items.keys() ][index] ?? null,
		removeItem: (key) => void items.delete(key),
		setItem: (key, value) => void items.set(key, String(value)),
	};
}

beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));

afterEach(() => vi.unstubAllGlobals());

/**
 * Sets up HTTP with the interceptor, over a fake server.
 */
function setup () {
	TestBed.configureTestingModule({
		providers: [ provideRouter([]), provideHttpClient(withInterceptors([ authInterceptor ])), provideHttpClientTesting() ],
	});

	return {
		http: TestBed.inject(HttpClient),
		server: TestBed.inject(HttpTestingController),
		session: TestBed.inject(AuthSession),
		router: TestBed.inject(Router),
	};
}

describe('AuthSession', () => {
	it('keeps the tokens of a session and forgets them when it ends', () => {
		const { session } = setup();

		expect(session.signedIn()).toBe(false);

		session.save(TOKENS);

		expect(session.signedIn()).toBe(true);
		expect(session.accessToken()).toBe('access-1');
		expect(localStorage.getItem('refreshToken')).toBe('refresh-1');

		session.clear();

		expect(session.signedIn()).toBe(false);
		expect(localStorage.getItem('accessToken')).toBeNull();
	});
});

describe('signedInGuard', () => {
	/**
	 * Runs the guard for a page.
	 */
	function guard (url: string): boolean | UrlTree {
		return TestBed.runInInjectionContext(() => signedInGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)) as boolean | UrlTree;
	}

	it('sends to the login page, with the page to come back to, when nobody is signed in', () => {
		const { router } = setup();

		expect(router.serializeUrl(guard('/perfil') as UrlTree)).toBe('/login?returnUrl=%2Fperfil');
	});

	it('lets the page open when someone is signed in', () => {
		const { session } = setup();
		session.save(TOKENS);

		expect(guard('/perfil')).toBe(true);
	});

	it('only comes back to pages of this app', () => {
		expect(returnPath('/perfil')).toBe('/perfil');
		expect(returnPath(null)).toBe('/perfil');
		expect(returnPath('https://elsewhere.example')).toBe('/perfil');
		expect(returnPath('//elsewhere.example')).toBe('/perfil');
	});
});

describe('authInterceptor', () => {
	it('sends the access token to the API, but not to the session endpoints or other sites', () => {
		const { http, server, session } = setup();
		session.save(TOKENS);

		http.get(`${environment.apiUrl}/users/me`).subscribe();
		http.post(`${environment.apiUrl}/session/login`, {}).subscribe();
		http.get('https://elsewhere.example/data').subscribe();

		expect(server.expectOne(`${environment.apiUrl}/users/me`).request.headers.get('Authorization')).toBe('Bearer access-1');
		expect(server.expectOne(`${environment.apiUrl}/session/login`).request.headers.has('Authorization')).toBe(false);
		expect(server.expectOne('https://elsewhere.example/data').request.headers.has('Authorization')).toBe(false);
	});

	it('gets new tokens when the access token expired, and repeats the request with them', () => {
		const { http, server, session } = setup();
		const answers: unknown[] = [];
		session.save(TOKENS);

		http.get(`${environment.apiUrl}/users/me`).subscribe((answer) => answers.push(answer));
		server.expectOne(`${environment.apiUrl}/users/me`).flush(null, { status: 401, statusText: 'Unauthorized' });

		const refresh = server.expectOne(`${environment.apiUrl}/session/refresh`);
		expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
		refresh.flush({ accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 900 });

		const again = server.expectOne(`${environment.apiUrl}/users/me`);
		expect(again.request.headers.get('Authorization')).toBe('Bearer access-2');
		again.flush({ username: 'ana' });

		expect(answers).toEqual([ { username: 'ana' } ]);
		expect(session.accessToken()).toBe('access-2');
	});

	it('ends the session and goes to the login page when the refresh fails too', () => {
		const { http, server, session, router } = setup();
		const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
		let failed = false;
		session.save(TOKENS);

		http.get(`${environment.apiUrl}/users/me`).subscribe({ error: () => failed = true });
		server.expectOne(`${environment.apiUrl}/users/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
		server.expectOne(`${environment.apiUrl}/session/refresh`).flush(null, { status: 401, statusText: 'Unauthorized' });

		expect(failed).toBe(true);
		expect(session.signedIn()).toBe(false);
		expect(navigate).toHaveBeenCalledWith([ '/login' ], { queryParams: { returnUrl: '/' } });
	});
});
