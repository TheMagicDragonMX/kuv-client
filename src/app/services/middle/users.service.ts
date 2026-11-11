import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Profile, ProfileChanges, SearchUsersParams, UserParams, UserSummary } from '../../models';
import { UsersHttpService } from '../http/users.http.service';

/**
 * What the components use to read and change users, their profiles and who follows whom. The
 * calls are made by `UsersHttpService`; this one adjusts what goes out.
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
	/**
	 * Makes the calls to the users endpoints.
	 */
	private readonly http = inject(UsersHttpService);

	/**
	 * The signed-in user's profile, with their email.
	 */
	me (): Observable<Profile> {
		return this.http.me();
	}

	/**
	 * Changes the signed-in user's description and picture.
	 */
	updateMe (payload: ProfileChanges): Observable<Profile> {
		return this.http.updateMe(payload);
	}

	/**
	 * Another user's profile.
	 */
	profile (params: UserParams): Observable<Profile> {
		return this.http.profile(params);
	}

	/**
	 * Who follows a user, the most recent first.
	 */
	followers (params: UserParams): Observable<UserSummary[]> {
		return this.http.followers(params);
	}

	/**
	 * Who a user follows, the most recent first.
	 */
	following (params: UserParams): Observable<UserSummary[]> {
		return this.http.following(params);
	}

	/**
	 * Users whose name contains the text, ignoring the spaces around it.
	 */
	search (params: SearchUsersParams): Observable<UserSummary[]> {
		return this.http.search({ ...params, search: params.search.trim() });
	}

	/**
	 * The signed-in user follows another.
	 */
	follow (params: UserParams): Observable<Profile> {
		return this.http.follow(params);
	}

	/**
	 * The signed-in user stops following another.
	 */
	unfollow (params: UserParams): Observable<Profile> {
		return this.http.unfollow(params);
	}
}
