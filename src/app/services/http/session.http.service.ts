import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '@environment';
import { Availability, EmailParams, GoogleLoginPayload, GoogleSessionResponse, GoogleSignupPayload, LoginPayload, RefreshPayload, RegisterPayload, TokenResponse, UsernameParams } from '../../models';

/**
 * Talks to the API's session endpoints.
 */
@Injectable({ providedIn: 'root' })
export class SessionHttpService {
	/**
	 * Sends the HTTP requests.
	 */
	private readonly http = inject(HttpClient);

	/**
	 * Address of the session endpoints.
	 */
	private readonly endpoint = `${environment.apiUrl}/session`;

	/**
	 * Logs in with a username (or an email) and a password.
	 */
	login (payload: LoginPayload): Observable<TokenResponse> {
		return this.http.post<TokenResponse>(`${this.endpoint}/login`, payload).pipe(
			tap((response) => console.log('Login', response)),
		);
	}

	/**
	 * Creates an account.
	 */
	register (payload: RegisterPayload): Observable<unknown> {
		return this.http.post(`${this.endpoint}/register`, payload).pipe(
			tap((response) => console.log('Account registered', response)),
		);
	}

	/**
	 * Exchanges a refresh token for a new pair of tokens.
	 */
	refresh (payload: RefreshPayload): Observable<TokenResponse> {
		return this.http.post<TokenResponse>(`${this.endpoint}/refresh`, payload).pipe(
			tap((response) => console.log('Session refreshed', response)),
		);
	}

	/**
	 * Signs in with the ID token Google gave the browser.
	 */
	google (payload: GoogleLoginPayload): Observable<GoogleSessionResponse> {
		return this.http.post<GoogleSessionResponse>(`${this.endpoint}/google`, payload).pipe(
			tap((response) => console.log('Google sign-in', response)),
		);
	}

	/**
	 * Creates the account of a Google user with the age and the username they chose.
	 */
	completeGoogle (payload: GoogleSignupPayload): Observable<TokenResponse> {
		return this.http.post<TokenResponse>(`${this.endpoint}/google/complete`, payload).pipe(
			tap((response) => console.log('Google account created', response)),
		);
	}

	/**
	 * Asks whether an email is free.
	 */
	emailAvailable (params: EmailParams): Observable<Availability> {
		return this.http.get<Availability>(`${this.endpoint}/email-available`, { params }).pipe(
			tap((response) => console.log('Email availability', response)),
		);
	}

	/**
	 * Asks whether a username is free.
	 */
	usernameAvailable (params: UsernameParams): Observable<Availability> {
		return this.http.get<Availability>(`${this.endpoint}/username-available`, { params }).pipe(
			tap((response) => console.log('Username availability', response)),
		);
	}
}
