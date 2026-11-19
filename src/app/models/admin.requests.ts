import { PreviewVideos } from '../cube';

/**
 * What the admin panel sends to replace the preview of a creation, in the body.
 */
export type AdminPreviewPayload = {
	/**
	 * The recorded videos, one per theme, and the thumbnail.
	 */
	videos: PreviewVideos;
};

/**
 * The form data the API expects for the preview of a creation, sent in the body.
 */
export type AdminPreviewFormPayload = FormData;
