import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthSession } from './auth-session.service';
import { SignupService } from './signup.service';
import { SessionRenewal } from './session-renewal.service';

/**
 * Where the app goes after signing in when no page asked for it, and where the login pages send
 * someone who is already signed in.
 */
const HOME_PATH = '/inicio';

/**
 * Lets a page open only with a valid session. When the access token is missing or expired it
 * renews it with the refresh token first; when that cannot be done, it sends the user to the
 * login page, telling it which page to come back to.
 */
export const signedInGuard: CanActivateChildFn = (_route, state) => {
	const session = inject(AuthSession);
	const renewal = inject(SessionRenewal);
	const router = inject(Router);

	if (session.signedIn() && !session.accessTokenExpired())
		return true;

	return renewal.renew().pipe(
		map(() => true),
		catchError(() => of(router.createUrlTree([ '/login' ], { queryParams: { returnUrl: state.url } }))),
	);
};

/**
 * Keeps the login and register pages for those who are not signed in: whoever is, goes home.
 */
export const signedOutGuard: CanActivateFn = () => inject(AuthSession).signedIn()
	? inject(Router).createUrlTree([ HOME_PATH ])
	: true;

/**
 * Lets the page that asks for the age and username open only while a signup is in progress (with Google
 * or with a password); without one (the page was reloaded or opened by hand) it goes back to the login page.
 */
export const signupGuard: CanActivateFn = () => inject(SignupService).pending()
	? true
	: inject(Router).createUrlTree([ '/login' ]);

/**
 * Where to go after signing in: the page asked for, if it is a page of this app, or the home page.
 */
export function returnPath (returnUrl: string | null | undefined): string {
	return returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : HOME_PATH;
}
