import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * What the API answers after a login.
 */
export type TokenResponse = {
	/**
	 * Token that authorizes requests.
	 */
	accessToken: string;

	/**
	 * Token used to get a new access token.
	 */
	refreshToken: string;

	/**
	 * Seconds the access token stays valid.
	 */
	expiresIn: number;
};

/**
 * The data needed to create an account.
 */
export type RegisterPayload = {
	/**
	 * The name the user logs in with.
	 */
	username: string;

	/**
	 * The user's email address.
	 */
	email: string;

	/**
	 * The user's age in years.
	 */
	age: number;

	/**
	 * The password for the new account.
	 */
	password: string;
};

/**
 * Talks to the API's session endpoints.
 */
@Injectable({ providedIn: 'root' })
export class SessionApi {
	/**
	 * Sends the HTTP requests.
	 */
	private readonly http = inject(HttpClient);

	/**
	 * Address of the session endpoints.
	 */
	private readonly endpoint = 'http://localhost:5038/session';

	/**
	 * Logs in with a username and a password.
	 */
	login (username: string, password: string): Observable<TokenResponse> {
		return this.http.post<TokenResponse>(`${this.endpoint}/login`, { username, password });
	}

	/**
	 * Creates an account.
	 */
	register (user: RegisterPayload): Observable<unknown> {
		return this.http.post(`${this.endpoint}/register`, user);
	}
}