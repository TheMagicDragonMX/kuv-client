import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '@environment';

/**
 * What Google hands to the page when the user chooses an account.
 */
type GoogleCredentialResponse = {
	/**
	 * The ID token: a JWT signed by Google that says who the user is.
	 */
	credential: string;
};

/**
 * How the Google button looks.
 */
export type GoogleButtonOptions = {
	/**
	 * `outline` for light pages, `filled_black` for dark ones.
	 */
	theme: 'outline' | 'filled_black';

	/**
	 * Width of the button in pixels (Google accepts 200 to 400).
	 */
	width: number;
};

/**
 * The part of Google Identity Services this app uses.
 */
type GoogleAccountsId = {
	/**
	 * Starts the library with the client ID and what to call when the user chooses an account.
	 */
	initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;

	/**
	 * Draws Google's own sign-in button inside an element.
	 */
	renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
};

declare global {
	/**
	 * Google's script adds `google` to the window.
	 */
	interface Window {
		/**
		 * Google Identity Services, once its script has loaded.
		 */
		google?: { accounts: { id: GoogleAccountsId } };
	}
}

/**
 * Where Google serves the script of Identity Services.
 */
const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/**
 * The bridge to "Sign in with Google". It loads Google's script the first time a button is drawn,
 * starts it with the client ID of the project and passes on the ID token every time the user
 * chooses an account. It only gets the token: what it means is up to the API (`SessionService`).
 */
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
	/**
	 * The document the script is added to.
	 */
	private readonly document = inject(DOCUMENT);

	/**
	 * Feeds `credential$`.
	 */
	private readonly credentials = new Subject<string>();

	/**
	 * Google's library once it is loaded and started, or null before that (or after it failed to load).
	 */
	private ready: Promise<GoogleAccountsId> | null = null;

	/**
	 * True when the project has a Google client ID. Without it nothing about Google is shown.
	 */
	readonly enabled = '' !== environment.googleClientId;

	/**
	 * The ID tokens of the accounts the user chooses.
	 */
	readonly credential$: Observable<string> = this.credentials.asObservable();

	/**
	 * Draws Google's sign-in button inside an element, replacing what it held. The token of the account
	 * the user chooses comes out of `credential$`.
	 */
	async renderButton (parent: HTMLElement, options: GoogleButtonOptions): Promise<void> {
		const google = await this.load();

		parent.replaceChildren();
		google.renderButton(parent, {
			type: 'standard',
			theme: options.theme,
			size: 'large',
			text: 'continue_with',
			shape: 'pill',
			logo_alignment: 'left',
			locale: 'es',
			width: options.width,
		});
	}

	/**
	 * Adds Google's script once and starts it. If the script cannot load (offline, blocked by an
	 * extension) the next call tries again.
	 */
	private load (): Promise<GoogleAccountsId> {
		this.ready ??= new Promise<GoogleAccountsId>((resolve, reject) => {
			const script = this.document.createElement('script');

			script.src = SCRIPT_URL;
			script.async = true;
			script.onload = () => {
				const google = this.document.defaultView?.google?.accounts.id;

				if (!google) {
					this.ready = null;
					reject(new Error('Google Identity Services did not start.'));
					return;
				}

				google.initialize({
					client_id: environment.googleClientId,
					callback: (response) => this.credentials.next(response.credential),
				});
				resolve(google);
			};
			script.onerror = () => {
				this.ready = null;
				script.remove();
				reject(new Error('Google Identity Services could not be loaded.'));
			};
			this.document.head.appendChild(script);
		});

		return this.ready;
	}
}
