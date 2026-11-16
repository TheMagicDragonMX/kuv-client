import { Injectable, signal } from '@angular/core';

/**
 * A signup that started with Google: the API verified the Google account, which has no user yet.
 */
export type GoogleSignup = {
	/**
	 * Tells which kind of signup this is.
	 */
	kind: 'google';

	/**
	 * The token the API wants back with the age and the username.
	 */
	signupToken: string;

	/**
	 * The email of the Google account.
	 */
	email: string;

	/**
	 * The page to go to once the account exists, from the address that sent the user to log in, or null.
	 */
	returnUrl: string | null;
};

/**
 * A signup that started with an email and a password, which the register page already checked.
 */
export type PasswordSignup = {
	/**
	 * Tells which kind of signup this is.
	 */
	kind: 'password';

	/**
	 * The email of the new account. The API said nobody had it.
	 */
	email: string;

	/**
	 * The password of the new account. It only lives in memory until the account is created.
	 */
	password: string;

	/**
	 * The page to go to once the account exists, from the address that sent the user to log in, or null.
	 */
	returnUrl: string | null;
};

/**
 * A signup in progress, whichever way it started.
 */
export type PendingSignup = GoogleSignup | PasswordSignup;

/**
 * Holds the signup in progress while the user moves to the page that asks for their age and username: the
 * same two steps for an account made with Google and one made with a password. It lives in memory only:
 * reloading the page starts over.
 */
@Injectable({ providedIn: 'root' })
export class SignupService {
	/**
	 * The signup in progress, writable only from this service.
	 */
	private readonly state = signal<PendingSignup | null>(null);

	/**
	 * The signup in progress, or null when there is none.
	 */
	readonly pending = this.state.asReadonly();

	/**
	 * Starts a signup.
	 */
	start (signup: PendingSignup): void {
		this.state.set(signup);
	}

	/**
	 * Forgets the signup in progress.
	 */
	clear (): void {
		this.state.set(null);
	}
}
