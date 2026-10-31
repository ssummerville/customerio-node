import type { RequestData, RequestDefaults, RetryOptions } from './request';
import { Region } from './regions';
import { TrackClient } from './track';
import { APIClient } from './api';
import { SendEmailRequest, SendPushRequest, SendSMSRequest, SendWhatsAppRequest, SendInboxMessageRequest, SendInAppRequest } from './api/requests';
import type { SendEmailRequestOptions, SendPushRequestOptions, SendSMSRequestOptions, SendWhatsAppRequestOptions, SendInboxMessageRequestOptions, SendInAppRequestOptions } from './api/requests';
/** Options for {@link CustomerIO}. */
export type CustomerIOOptions = RequestDefaults & {
    /** Your Customer.io secret key (`sk_…`), or a legacy App API key. */
    apiKey: string;
    /**
     * Data region. Optional for `pk_`/`sk_` keys, which carry their region; when
     * set, it must match the key's region. Legacy keys default to {@link RegionUS}.
     */
    region?: Region;
    /** Override the Track API base URL. Must use `https://`, since the key is sent with every request. */
    trackUrl?: string;
    /** Override the App API base URL. Must use `https://`, since the key is sent with every request. */
    apiUrl?: string;
    retry?: Partial<RetryOptions>;
};
/**
 * One client for tracking and transactional messages, authenticated with a
 * single secret key.
 *
 * Tracking methods (`identify`, `track`, `trackAnonymous`, `trackPageView`) go
 * to the Track API; `send*` methods go to the App API. Both send the key as a
 * Bearer token. For `sk_us_…` / `sk_eu_…` keys the region comes from the key.
 *
 * When a key can't do what a method asks, the method throws a
 * {@link KeyCapabilityError}: before the request when the key's type says so
 * (a public `pk_` key can't send transactional messages), otherwise when the
 * server answers 401 or 403.
 *
 * Other Track and App API methods are on {@link CustomerIO.trackClient} and
 * {@link CustomerIO.apiClient}.
 *
 * @example
 * ```ts
 * import { CustomerIO } from 'customerio-node';
 *
 * const cio = new CustomerIO({ apiKey: process.env.CIO_API_KEY });
 * await cio.identify('user_123', { email: 'a@example.com' });
 * await cio.track('user_123', { name: 'order_completed' });
 * await cio.sendEmail({
 *   to: 'a@example.com',
 *   identifiers: { id: 'user_123' },
 *   transactional_message_id: 5,
 * });
 * ```
 */
export declare class CustomerIO {
    /** Track API client, authenticated with the key as a Bearer token. */
    readonly trackClient: TrackClient;
    region: Region;
    private readonly keyKind;
    private readonly _apiClient;
    /**
     * @throws If `apiKey` is empty, `region` is provided and is not a {@link Region} instance,
     * `region` doesn't match the region of a `pk_`/`sk_` key, or `trackUrl`/`apiUrl` (or the region's URLs) isn't an `https://` URL.
     */
    constructor(options: CustomerIOOptions);
    /**
     * App API client, authenticated with the key.
     *
     * @throws {KeyCapabilityError} If the key is a public `pk_` key.
     */
    get apiClient(): APIClient;
    /** Create or update a person. See {@link TrackClient.identify}. */
    identify(customerId: string | number, data?: RequestData): Promise<Record<string, any>>;
    /** Track an event for a person. See {@link TrackClient.track}. */
    track(customerId: string | number, data?: RequestData): Promise<Record<string, any>>;
    /** Track an event for an anonymous visitor. See {@link TrackClient.trackAnonymous}. */
    trackAnonymous(anonymousId: string | number, data?: RequestData): Promise<Record<string, any>>;
    /** Track a page view for a person. See {@link TrackClient.trackPageView}. */
    trackPageView(customerId: string | number, path: string): Promise<Record<string, any>>;
    /** Send a transactional email. See {@link APIClient.sendEmail}. */
    sendEmail(req: SendEmailRequest | SendEmailRequestOptions): Promise<Record<string, any>>;
    /** Send a transactional push. See {@link APIClient.sendPush}. */
    sendPush(req: SendPushRequest | SendPushRequestOptions): Promise<Record<string, any>>;
    /** Send a transactional SMS. See {@link APIClient.sendSMS}. */
    sendSMS(req: SendSMSRequest | SendSMSRequestOptions): Promise<Record<string, any>>;
    /** Send a transactional WhatsApp message. See {@link APIClient.sendWhatsApp}. */
    sendWhatsApp(req: SendWhatsAppRequest | SendWhatsAppRequestOptions): Promise<Record<string, any>>;
    /** Send a transactional inbox message. See {@link APIClient.sendInboxMessage}. */
    sendInboxMessage(req: SendInboxMessageRequest | SendInboxMessageRequestOptions): Promise<Record<string, any>>;
    /** Send a transactional in-app message. See {@link APIClient.sendInApp}. */
    sendInApp(req: SendInAppRequest | SendInAppRequestOptions): Promise<Record<string, any>>;
}
