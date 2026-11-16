import { Injectable, computed, signal } from '@angular/core';
import { TokenResponse } from '../models';

/**
 * Where the access token is kept in localStorage. The cube chat reads it from there too.
 */
const ACCESS_KEY = 'accessToken';

/**
 * Where the refresh token is kept in localStorage.
 */
const REFRESH_KEY = 'refreshToken';

/**
 * Reads a value from localStorage, or null when it is not there or storage is blocked.
 */
function read (key: string): string | null {
	try {
		return localStorage.getItem(key);
	}

	catch {
		return null;
	}
}

/**
 * Seconds before its real expiry when an access token already counts as expired, so a request
 * made right after a check does not reach the API with a dead token.
 */
const EXPIRY_MARGIN = 10;

/**
 * True when the access token says it has expired. The token is a JWT: its middle part holds the
 * moment it expires (`exp`, in seconds). A token that cannot be read does not count as expired,
 * because the API is the one that decides; it answers 401 and the interceptor renews it then.
 */
function expired (token: string): boolean {
	try {
		const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
		const { exp } = JSON.parse(atob(payload)) as { exp?: unknown };

		return 'number' === typeof exp && exp - EXPIRY_MARGIN <= Date.now() / 1000;
	}

	catch {
		return false;
	}
}

/**
 * The session of the user: the tokens the API gave at login, kept in localStorage so the session
 * survives reloading the page. It only stores them; `SessionService` gets them and the auth
 * interceptor sends them.
 */
@Injectable({ providedIn: 'root' })
export class AuthSession {
	/**
	 * The access token, or null when nobody is signed in.
	 */
	private readonly access = signal<string | null>(read(ACCESS_KEY));

	/**
	 * True while someone is signed in.
	 */
	readonly signedIn = computed(() => null !== this.access());

	/**
	 * The token that authorizes requests, or null.
	 */
	accessToken (): string | null {
		return this.access();
	}

	/**
	 * True when there is an access token and it has expired.
	 */
	accessTokenExpired (): boolean {
		const token = this.access();

		return null !== token && expired(token);
	}

	/**
	 * The token that gets a new access token, or null.
	 */
	refreshToken (): string | null {
		return read(REFRESH_KEY);
	}

	/**
	 * Keeps the tokens of a new session.
	 */
	save (tokens: TokenResponse): void {
		try {
			localStorage.setItem(ACCESS_KEY, tokens.accessToken);
			localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
		}

		catch {

			/**
			 * Without storage the session still works until the page is reloaded.
			 */
		}

		this.access.set(tokens.accessToken);
	}

	/**
	 * Ends the session.
	 */
	clear (): void {
		try {
			localStorage.removeItem(ACCESS_KEY);
			localStorage.removeItem(REFRESH_KEY);
		}

		catch {

			/**
			 * Nothing was stored, so there is nothing to remove.
			 */
		}

		this.access.set(null);
	}
}
