import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../environments';
import { AuthSession } from './auth-session.service';
import { SessionService } from './middle/session.service';

/**
 * The request with the access token in its Authorization header, or as it was without a token.
 */
function withToken (request: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
	return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
}

/**
 * Sends the access token with every request to the API, except the session endpoints that
 * hand the tokens out. When the API answers 401 (the access token expired) it gets new tokens
 * with the refresh token once and repeats the request; if that fails too, the session is over and
 * the user goes to the login page, which brings them back where they were.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
	if (!request.url.startsWith(environment.apiUrl) || request.url.startsWith(`${environment.apiUrl}/session`))
		return next(request);

	const session = inject(AuthSession);
	const sessionService = inject(SessionService);
	const router = inject(Router);

	return next(withToken(request, session.accessToken())).pipe(catchError((error: unknown) => {
		const refreshToken = session.refreshToken();

		if (!(error instanceof HttpErrorResponse) || 401 !== error.status || !refreshToken)
			return throwError(() => error);

		return sessionService.refresh({ refreshToken }).pipe(
			switchMap((tokens) => {
				session.save(tokens);

				return next(withToken(request, tokens.accessToken));
			}),
			catchError(() => {
				session.clear();
				void router.navigate([ '/login' ], { queryParams: { returnUrl: router.url } });

				return throwError(() => error);
			}),
		);
	}));
};
