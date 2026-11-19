import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '@environment';
import { FeedCreation, FeedParams } from '../../models';

/**
 * Talks to the API's feed endpoints, one for each category of the home page. It only makes the
 * calls: adjusting the answers is up to `FeedService`.
 */
@Injectable({ providedIn: 'root' })
export class FeedHttpService {
	/**
	 * Sends the HTTP requests.
	 */
	private readonly http = inject(HttpClient);

	/**
	 * Address of the feed endpoints.
	 */
	private readonly endpoint = `${environment.apiUrl}/feed`;

	/**
	 * The newest public creations, the most recent first.
	 */
	newCreations (params: FeedParams = {}): Observable<FeedCreation[]> {
		const query = undefined === params.limit ? new HttpParams() : new HttpParams().set('limit', params.limit);

		return this.http.get<FeedCreation[]>(`${this.endpoint}/new`, { params: query }).pipe(
			tap((response) => console.log('New creations of the feed', response)),
		);
	}
}
