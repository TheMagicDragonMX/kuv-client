import { Injectable, effect, inject, signal } from '@angular/core';
import { Profile } from '../models';
import { AuthSession } from './auth-session.service';

/**
 * Remembers the signed-in user's profile, so parts of the page that are not the profile (the
 * header) show their name and photo, and change as soon as they do. `UsersService` fills it each
 * time the API answers with the signed-in user's own profile; it empties itself when the session
 * ends, so the next user never sees the last one's photo.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
	/**
	 * The signed-in user's profile, or null while it is not known.
	 */
	readonly profile = signal<Profile | null>(null);

	/**
	 * Whose session it is.
	 */
	private readonly session = inject(AuthSession);

	constructor () {
		effect(() => {
			if (!this.session.signedIn())
				this.profile.set(null);
		});
	}

	/**
	 * Keeps the profile the API answered with.
	 */
	set (profile: Profile): void {
		this.profile.set(profile);
	}
}
