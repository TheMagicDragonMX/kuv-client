import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environment';
import { FeedCreation, FeedParams } from '../../models';
import { FeedHttpService } from '../http/feed.http.service';

/**
 * What the components use to read the categories of the feed. The calls are made by
 * `FeedHttpService`; this one gives the pictures of the authors their whole address, since the API
 * answers with a path on itself.
 */
@Injectable({ providedIn: 'root' })
export class FeedService {
	/**
	 * Makes the calls to the feed endpoints.
	 */
	private readonly http = inject(FeedHttpService);

	/**
	 * The newest public creations, the most recent first.
	 */
	newCreations (params: FeedParams = {}): Observable<FeedCreation[]> {
		return this.http.newCreations(params).pipe(
			map((creations) => creations.map((creation) => creation.authorPhoto
				? { ...creation, authorPhoto: `${environment.apiUrl}${creation.authorPhoto}` }
				: creation)),
		);
	}
}
