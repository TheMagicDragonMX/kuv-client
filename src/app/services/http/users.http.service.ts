import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '@environment';
import { Profile, ProfileChanges, SearchUsersParams, UserParams, UserSummary } from '../../models';

/**
 * Talks to the API's profile and follow endpoints. They all need a signed-in user; the auth
 * interceptor sends the token.
 */
@Injectable({ providedIn: 'root' })
export class UsersHttpService {
	/**
	 * Sends the HTTP requests.
	 */
	private readonly http = inject(HttpClient);

	/**
	 * Address of the user endpoints.
	 */
	private readonly endpoint = `${environment.apiUrl}/users`;

	/**
	 * The signed-in user's profile, with their email.
	 */
	me (): Observable<Profile> {
		return this.http.get<Profile>(`${this.endpoint}/me`).pipe(
			tap((response) => console.log('My profile', response)),
		);
	}

	/**
	 * Changes the signed-in user's bio.
	 */
	updateMe (payload: ProfileChanges): Observable<Profile> {
		return this.http.put<Profile>(`${this.endpoint}/me`, payload).pipe(
			tap((response) => console.log('My profile updated', response)),
		);
	}

	/**
	 * Sets the signed-in user's picture, sent as a form with a `photo` file.
	 */
	updatePhoto (payload: FormData): Observable<Profile> {
		return this.http.put<Profile>(`${this.endpoint}/me/photo`, payload).pipe(
			tap((response) => console.log('My photo updated', response)),
		);
	}

	/**
	 * Removes the signed-in user's picture.
	 */
	removePhoto (): Observable<Profile> {
		return this.http.delete<Profile>(`${this.endpoint}/me/photo`).pipe(
			tap((response) => console.log('My photo removed', response)),
		);
	}

	/**
	 * Another user's profile.
	 */
	profile (params: UserParams): Observable<Profile> {
		return this.http.get<Profile>(`${this.endpoint}/${params.id}`).pipe(
			tap((response) => console.log('Profile of a user', response)),
		);
	}

	/**
	 * Who follows a user, the most recent first.
	 */
	followers (params: UserParams): Observable<UserSummary[]> {
		return this.http.get<UserSummary[]>(`${this.endpoint}/${params.id}/followers`).pipe(
			tap((response) => console.log('Followers of a user', response)),
		);
	}

	/**
	 * Who a user follows, the most recent first.
	 */
	following (params: UserParams): Observable<UserSummary[]> {
		return this.http.get<UserSummary[]>(`${this.endpoint}/${params.id}/following`).pipe(
			tap((response) => console.log('Users a user follows', response)),
		);
	}

	/**
	 * Users whose name contains the text.
	 */
	search (params: SearchUsersParams): Observable<UserSummary[]> {
		return this.http.get<UserSummary[]>(this.endpoint, { params }).pipe(
			tap((response) => console.log('User search', response)),
		);
	}

	/**
	 * The signed-in user follows another.
	 */
	follow (params: UserParams): Observable<Profile> {
		return this.http.put<Profile>(`${this.endpoint}/${params.id}/follow`, null).pipe(
			tap((response) => console.log('User followed', response)),
		);
	}

	/**
	 * The signed-in user stops following another.
	 */
	unfollow (params: UserParams): Observable<Profile> {
		return this.http.delete<Profile>(`${this.endpoint}/${params.id}/follow`).pipe(
			tap((response) => console.log('User unfollowed', response)),
		);
	}
}
