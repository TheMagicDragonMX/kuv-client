import { Injectable, signal } from '@angular/core';

/**
 * A Google account the API verified but has no user yet: the user still has to choose their age and username.
 */
export type PendingGoogleSignup = {
	/**
	 * The token the API wants back with the age and the username.
	 */
	signupToken: string;

	/**
	 * The email of the Google account, to tell the user which account they are using.
	 */
	email: string;

	/**
	 * The page to go to once the account exists, from the address that sent the user to log in, or null.
	 */
	returnUrl: string | null;
};

/**
 * Holds the Google signup that is in progress while the user moves from the login page to the page that asks
 * for their age and username. It lives in memory only: reloading the page starts over with Google.
 */
@Injectable({ providedIn: 'root' })
export class GoogleSignupService {
	/**
	 * The signup in progress, writable only from this service.
	 */
	private readonly state = signal<PendingGoogleSignup | null>(null);

	/**
	 * The signup in progress, or null when there is none.
	 */
	readonly pending = this.state.asReadonly();

	/**
	 * Starts a signup.
	 */
	start (signup: PendingGoogleSignup): void {
		this.state.set(signup);
	}

	/**
	 * Forgets the signup in progress.
	 */
	clear (): void {
		this.state.set(null);
	}
}
