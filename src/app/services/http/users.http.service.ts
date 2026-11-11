import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments';
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
		return this.http.get<Profile>(`${this.endpoint}/me`);
	}

	/**
	 * Changes the signed-in user's description and picture.
	 */
	updateMe (payload: ProfileChanges): Observable<Profile> {
		return this.http.put<Profile>(`${this.endpoint}/me`, payload);
	}

	/**
	 * Another user's profile.
	 */
	profile (params: UserParams): Observable<Profile> {
		return this.http.get<Profile>(`${this.endpoint}/${params.id}`);
	}

	/**
	 * Who follows a user, the most recent first.
	 */
	followers (params: UserParams): Observable<UserSummary[]> {
		return this.http.get<UserSummary[]>(`${this.endpoint}/${params.id}/followers`);
	}

	/**
	 * Who a user follows, the most recent first.
	 */
	following (params: UserParams): Observable<UserSummary[]> {
		return this.http.get<UserSummary[]>(`${this.endpoint}/${params.id}/following`);
	}

	/**
	 * Users whose name contains the text.
	 */
	search (params: SearchUsersParams): Observable<UserSummary[]> {
		return this.http.get<UserSummary[]>(this.endpoint, { params });
	}

	/**
	 * The signed-in user follows another.
	 */
	follow (params: UserParams): Observable<Profile> {
		return this.http.put<Profile>(`${this.endpoint}/${params.id}/follow`, null);
	}

	/**
	 * The signed-in user stops following another.
	 */
	unfollow (params: UserParams): Observable<Profile> {
		return this.http.delete<Profile>(`${this.endpoint}/${params.id}/follow`);
	}
}
