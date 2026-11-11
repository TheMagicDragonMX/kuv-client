import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments';
import { LoginPayload, RefreshPayload, RegisterPayload, TokenResponse } from '../../models';

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
	 * Logs in with a username and a password.
	 */
	login (payload: LoginPayload): Observable<TokenResponse> {
		return this.http.post<TokenResponse>(`${this.endpoint}/login`, payload);
	}

	/**
	 * Creates an account.
	 */
	register (payload: RegisterPayload): Observable<unknown> {
		return this.http.post(`${this.endpoint}/register`, payload);
	}

	/**
	 * Exchanges a refresh token for a new pair of tokens.
	 */
	refresh (payload: RefreshPayload): Observable<TokenResponse> {
		return this.http.post<TokenResponse>(`${this.endpoint}/refresh`, payload);
	}
}
