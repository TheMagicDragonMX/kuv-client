import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginPayload, RefreshPayload, RegisterPayload, TokenResponse } from '../../models';
import { SessionHttpService } from '../http/session.http.service';

/**
 * What the components use to log in, create accounts and renew tokens. The calls are made by
 * `SessionHttpService`; this one adjusts what goes out. Keeping the tokens is up to `AuthSession`.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
	/**
	 * Makes the calls to the session endpoints.
	 */
	private readonly http = inject(SessionHttpService);

	/**
	 * Logs in with a username and a password, ignoring the spaces around the username.
	 */
	login (payload: LoginPayload): Observable<TokenResponse> {
		return this.http.login({ ...payload, username: payload.username.trim() });
	}

	/**
	 * Creates an account, ignoring the spaces around the username and the email.
	 */
	register (payload: RegisterPayload): Observable<unknown> {
		return this.http.register({ ...payload, username: payload.username.trim(), email: payload.email.trim() });
	}

	/**
	 * Exchanges a refresh token for a new pair of tokens.
	 */
	refresh (payload: RefreshPayload): Observable<TokenResponse> {
		return this.http.refresh(payload);
	}
}
