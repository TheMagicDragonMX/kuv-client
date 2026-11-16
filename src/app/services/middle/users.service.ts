import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '@environment';
import { PhotoPayload, Profile, ProfileChanges, SearchUsersParams, UserParams, UserSummary } from '../../models';
import { CurrentUser } from '../current-user.service';
import { UsersHttpService } from '../http/users.http.service';

/**
 * Gives a user the whole address of their picture. The API answers with a path on itself
 * (`/users/7/photo?v=...`), but an image on the page needs the address of the API in front.
 */
function withPhotoAddress<T extends { photo: string | null }> (user: T): T {
	return user.photo ? { ...user, photo: `${environment.apiUrl}${user.photo}` } : user;
}

/**
 * What the components use to read and change users, their profiles and who follows whom. The
 * calls are made by `UsersHttpService`; this one adjusts what goes out (building the form of a
 * picture) and what comes in (the address of the pictures), and keeps the signed-in user's own
 * profile in `CurrentUser` each time it comes.
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
	/**
	 * Makes the calls to the users endpoints.
	 */
	private readonly http = inject(UsersHttpService);

	/**
	 * Remembers the signed-in user's profile for the rest of the page.
	 */
	private readonly currentUser = inject(CurrentUser);

	/**
	 * The signed-in user's profile, with their email.
	 */
	me (): Observable<Profile> {
		return this.http.me().pipe(map(withPhotoAddress), tap((profile) => this.currentUser.set(profile)));
	}

	/**
	 * Changes the signed-in user's bio.
	 */
	updateMe (payload: ProfileChanges): Observable<Profile> {
		return this.http.updateMe(payload).pipe(map(withPhotoAddress), tap((profile) => this.currentUser.set(profile)));
	}

	/**
	 * Sets the signed-in user's picture.
	 */
	updatePhoto (payload: PhotoPayload): Observable<Profile> {
		const form = new FormData();

		/**
		 * A file part needs a name for the API to take it as a file; the API ignores what it says.
		 */
		form.append('photo', payload.photo, 'photo.jpg');

		return this.http.updatePhoto(form).pipe(map(withPhotoAddress), tap((profile) => this.currentUser.set(profile)));
	}

	/**
	 * Removes the signed-in user's picture.
	 */
	removePhoto (): Observable<Profile> {
		return this.http.removePhoto().pipe(map(withPhotoAddress), tap((profile) => this.currentUser.set(profile)));
	}

	/**
	 * Another user's profile.
	 */
	profile (params: UserParams): Observable<Profile> {
		return this.http.profile(params).pipe(map(withPhotoAddress));
	}

	/**
	 * Who follows a user, the most recent first.
	 */
	followers (params: UserParams): Observable<UserSummary[]> {
		return this.http.followers(params).pipe(map((users) => users.map(withPhotoAddress)));
	}

	/**
	 * Who a user follows, the most recent first.
	 */
	following (params: UserParams): Observable<UserSummary[]> {
		return this.http.following(params).pipe(map((users) => users.map(withPhotoAddress)));
	}

	/**
	 * Users whose name contains the text, ignoring the spaces around it.
	 */
	search (params: SearchUsersParams): Observable<UserSummary[]> {
		return this.http.search({ ...params, search: params.search.trim() }).pipe(map((users) => users.map(withPhotoAddress)));
	}

	/**
	 * The signed-in user follows another.
	 */
	follow (params: UserParams): Observable<Profile> {
		return this.http.follow(params).pipe(map(withPhotoAddress));
	}

	/**
	 * The signed-in user stops following another.
	 */
	unfollow (params: UserParams): Observable<Profile> {
		return this.http.unfollow(params).pipe(map(withPhotoAddress));
	}
}
