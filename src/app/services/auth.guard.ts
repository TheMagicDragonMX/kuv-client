import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from './auth-session.service';

/**
 * Lets a page open only when someone is signed in. Otherwise it sends the user to the login page,
 * telling it which page to come back to.
 */
export const signedInGuard: CanActivateFn = (_route, state) => inject(AuthSession).signedIn()
	? true
	: inject(Router).createUrlTree([ '/login' ], { queryParams: { returnUrl: state.url } });

/**
 * Where to go after signing in: the page asked for, if it is a page of this app, or the profile.
 */
export function returnPath (returnUrl: string | null | undefined): string {
	return returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/perfil';
}
