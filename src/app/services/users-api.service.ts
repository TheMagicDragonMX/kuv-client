import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api-url';

/**
 * A user's profile, as the signed-in user sees it.
 */
export type Profile = {
	/**
	 * Identifies the user.
	 */
	id: number;

	/**
	 * Their username.
	 */
	username: string;

	/**
	 * Their email; only on the signed-in user's own profile.
	 */
	email: string | null;

	/**
	 * What they tell about themselves, if anything.
	 */
	description: string | null;

	/**
	 * Their picture as a data URL, if any.
	 */
	photo: string | null;

	/**
	 * How many users follow them.
	 */
	followers: number;

	/**
	 * How many users they follow.
	 */
	following: number;

	/**
	 * Whether they follow the signed-in user.
	 */
	followsYou: boolean;

	/**
	 * Whether the signed-in user follows them.
	 */
	youFollow: boolean;

	/**
	 * Whether it is the signed-in user's own profile.
	 */
	isYou: boolean;
};

/**
 * A user in a list: followers, followed or search results.
 */
export type UserSummary = {
	/**
	 * Identifies the user.
	 */
	id: number;

	/**
	 * Their username.
	 */
	username: string;

	/**
	 * What they tell about themselves, if anything.
	 */
	description: string | null;

	/**
	 * Their picture as a data URL, if any.
	 */
	photo: string | null;

	/**
	 * How many users follow them.
	 */
	followers: number;

	/**
	 * Whether they follow the signed-in user.
	 */
	followsYou: boolean;

	/**
	 * Whether the signed-in user follows them.
	 */
	youFollow: boolean;
};

/**
 * What can be changed of one's own profile. A blank field is cleared.
 */
export type ProfileChanges = {
	/**
	 * What the user tells about themselves.
	 */
	description: string | null;

	/**
	 * Their picture as a data URL.
	 */
	photo: string | null;
};

/**
 * Longest description a profile can have, as the API allows it.
 */
export const MAX_DESCRIPTION = 280;

/**
 * Talks to the API's profile and follow endpoints. They all need a signed-in user; the auth
 * interceptor sends the token.
 */
@Injectable({ providedIn: 'root' })
export class UsersApi {
	/**
	 * Sends the HTTP requests.
	 */
	private readonly http = inject(HttpClient);

	/**
	 * Address of the user endpoints.
	 */
	private readonly endpoint = `${API_URL}/users`;

	/**
	 * The signed-in user's profile, with their email.
	 */
	me (): Observable<Profile> {
		return this.http.get<Profile>(`${this.endpoint}/me`);
	}

	/**
	 * Changes the signed-in user's description and picture.
	 */
	updateMe (changes: ProfileChanges): Observable<Profile> {
		return this.http.put<Profile>(`${this.endpoint}/me`, changes);
	}

	/**
	 * Another user's profile.
	 */
	profile (id: number): Observable<Profile> {
		return this.http.get<Profile>(`${this.endpoint}/${id}`);
	}

	/**
	 * Who follows a user, the most recent first.
	 */
	followers (id: number): Observable<UserSummary[]> {
		return this.http.get<UserSummary[]>(`${this.endpoint}/${id}/followers`);
	}

	/**
	 * Who a user follows, the most recent first.
	 */
	following (id: number): Observable<UserSummary[]> {
		return this.http.get<UserSummary[]>(`${this.endpoint}/${id}/following`);
	}

	/**
	 * Users whose name contains the text.
	 */
	search (text: string): Observable<UserSummary[]> {
		return this.http.get<UserSummary[]>(this.endpoint, { params: new HttpParams().set('search', text) });
	}

	/**
	 * The signed-in user follows another.
	 */
	follow (id: number): Observable<Profile> {
		return this.http.put<Profile>(`${this.endpoint}/${id}/follow`, null);
	}

	/**
	 * The signed-in user stops following another.
	 */
	unfollow (id: number): Observable<Profile> {
		return this.http.delete<Profile>(`${this.endpoint}/${id}/follow`);
	}
}
