import { Injectable, inject } from '@angular/core';
import { Observable, finalize, shareReplay, tap, throwError } from 'rxjs';
import { TokenResponse } from '../models';
import { AuthSession } from './auth-session.service';
import { SessionService } from './middle/session.service';

/**
 * Gets a new pair of tokens with the refresh token when the access token is gone or expired. The
 * API accepts each refresh token only once, so when the guard and the interceptor ask at the same
 * time they share a single request instead of spending the token twice.
 */
@Injectable({ providedIn: 'root' })
export class SessionRenewal {
	/**
	 * Keeps the tokens of the session.
	 */
	private readonly session = inject(AuthSession);

	/**
	 * Makes the refresh call to the API.
	 */
	private readonly sessionService = inject(SessionService);

	/**
	 * The refresh in flight, or null when none is.
	 */
	private pending: Observable<TokenResponse> | null = null;

	/**
	 * Renews the session and keeps the new tokens. When there is no refresh token, or the API
	 * refuses it, the session ends and the answer is an error.
	 */
	renew (): Observable<TokenResponse> {
		if (this.pending)
			return this.pending;

		const refreshToken = this.session.refreshToken();

		if (!refreshToken) {
			this.session.clear();

			return throwError(() => new Error('There is no refresh token.'));
		}

		this.pending = this.sessionService.refresh({ refreshToken }).pipe(
			tap({
				next: (tokens) => this.session.save(tokens),
				error: () => this.session.clear(),
			}),
			finalize(() => this.pending = null),
			shareReplay({ bufferSize: 1, refCount: false }),
		);

		return this.pending;
	}
}
