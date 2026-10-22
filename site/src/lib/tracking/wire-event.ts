import type { EventRequest } from '@portfolio/api/events';

/** JSON body the site POSTs to `/events` before transport encoding. Matches `eventRequestSchema`. */
export type WireEventBody = EventRequest;
