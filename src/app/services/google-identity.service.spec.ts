import { TestBed } from '@angular/core/testing';
import { environment } from '@environment';
import { GoogleIdentityService } from './google-identity.service';

/**
 * Google's library as the page sees it, with every call recorded.
 */
function fakeGoogle () {
	const id = { initialize: vi.fn(), renderButton: vi.fn() };

	window.google = { accounts: { id } };

	return id;
}

/**
 * Collects the scripts the service adds to the page instead of loading them.
 */
function captureScripts (): HTMLScriptElement[] {
	const scripts: HTMLScriptElement[] = [];

	vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
		scripts.push(node as HTMLScriptElement);

		return node;
	});

	return scripts;
}

/**
 * The options of a button, whatever they are.
 */
const OPTIONS = { theme: 'outline', width: 320 } as const;

beforeEach(() => environment.googleClientId = 'client-1.apps.googleusercontent.com');

afterEach(() => {
	environment.googleClientId = '';
	delete window.google;
	vi.restoreAllMocks();
});

describe('GoogleIdentityService', () => {
	it('is off while the project has no Google client ID', () => {
		environment.googleClientId = '';

		expect(TestBed.inject(GoogleIdentityService).enabled).toBe(false);
	});

	it('loads the script once, starts it with the client ID and draws the buttons', async () => {
		const scripts = captureScripts();
		const id = fakeGoogle();
		const service = TestBed.inject(GoogleIdentityService);
		const parent = document.createElement('div');

		expect(service.enabled).toBe(true);

		const first = service.renderButton(parent, OPTIONS);
		const second = service.renderButton(parent, OPTIONS);

		expect(scripts).toHaveLength(1);
		expect(scripts[0].src).toBe('https://accounts.google.com/gsi/client');

		scripts[0].onload?.(new Event('load'));
		await Promise.all([ first, second ]);

		expect(id.initialize).toHaveBeenCalledTimes(1);
		expect(id.initialize.mock.calls[0][0].client_id).toBe('client-1.apps.googleusercontent.com');
		expect(id.renderButton).toHaveBeenCalledTimes(2);
		expect(id.renderButton.mock.calls[0][0]).toBe(parent);
		expect(id.renderButton.mock.calls[0][1]).toMatchObject({ theme: 'outline', width: 320, locale: 'es' });
	});

	it('passes on the ID token of every account the user chooses', async () => {
		const scripts = captureScripts();
		const id = fakeGoogle();
		const service = TestBed.inject(GoogleIdentityService);
		const tokens: string[] = [];
		service.credential$.subscribe((token) => tokens.push(token));

		const drawn = service.renderButton(document.createElement('div'), OPTIONS);
		scripts[0].onload?.(new Event('load'));
		await drawn;

		id.initialize.mock.calls[0][0].callback({ credential: 'id-token-1' });
		id.initialize.mock.calls[0][0].callback({ credential: 'id-token-2' });

		expect(tokens).toEqual([ 'id-token-1', 'id-token-2' ]);
	});

	it('fails when the script cannot load, and tries again the next time', async () => {
		const scripts = captureScripts();
		const id = fakeGoogle();
		const service = TestBed.inject(GoogleIdentityService);

		const failed = service.renderButton(document.createElement('div'), OPTIONS);
		scripts[0].onerror?.(new Event('error'));

		await expect(failed).rejects.toThrow('could not be loaded');

		const again = service.renderButton(document.createElement('div'), OPTIONS);

		expect(scripts).toHaveLength(2);

		scripts[1].onload?.(new Event('load'));
		await again;

		expect(id.renderButton).toHaveBeenCalledTimes(1);
	});
});
