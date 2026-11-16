import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Availability, EmailParams, GoogleLoginPayload, GoogleSessionResponse, GoogleSignupPayload, LoginPayload, RefreshPayload, RegisterPayload, TokenResponse, UsernameParams } from '../../models';
import { SessionHttpService } from '../http/session.http.service';

/**
 * What the components use to log in (with a password or with Google), create accounts and renew tokens. The calls are made by
 * `SessionHttpService`; this one adjusts what goes out. Keeping the tokens is up to `AuthSession`.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
	/**
	 * Makes the calls to the session endpoints.
	 */
	private readonly http = inject(SessionHttpService);

	/**
	 * Logs in with a username (or an email) and a password, ignoring the spaces around the username.
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

	/**
	 * Signs in with the ID token Google gave the browser.
	 */
	google (payload: GoogleLoginPayload): Observable<GoogleSessionResponse> {
		return this.http.google(payload);
	}

	/**
	 * Creates the account of a Google user, ignoring the spaces around the username.
	 */
	completeGoogle (payload: GoogleSignupPayload): Observable<TokenResponse> {
		return this.http.completeGoogle({ ...payload, username: payload.username.trim() });
	}

	/**
	 * Asks whether an email is free, ignoring the spaces around it.
	 */
	emailAvailable (params: EmailParams): Observable<Availability> {
		return this.http.emailAvailable({ email: params.email.trim() });
	}

	/**
	 * Asks whether a username is free, ignoring the spaces around it.
	 */
	usernameAvailable (params: UsernameParams): Observable<Availability> {
		return this.http.usernameAvailable({ username: params.username.trim() });
	}
}
