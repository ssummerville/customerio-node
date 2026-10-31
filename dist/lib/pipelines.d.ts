import Request from './request';
import type { RequestDefaults, RetryOptions } from './request';
import { Region } from './regions';
import type { AliasPayload, BatchItem, GroupPayload, IdentifyPayload, PagePayload, PipelinesContext, ScreenPayload, TrackPayload } from './pipelines/payloads';
export type PipelinesDefaults = RequestDefaults & {
    region: Region;
    /** Overrides the region-derived host. Useful for testing against a proxy. */
    url?: string;
    /**
     * When `true`, sends `X-Strict-Mode: 1` on every request. Strict mode asks
     * the Pipelines API to validate payloads and return proper HTTP error codes
     * instead of accepting and silently dropping malformed events.
     */
    strictMode?: boolean;
    /**
     * Default `context` values merged under every outgoing payload. Per-call
     * `context` always wins on key conflicts. Useful for setting things like
     * `ip` or `locale` once per client instance.
     */
    defaultContext?: PipelinesContext;
    /**
     * Per-request retry policy. Merged over the SDK defaults (3 retries with
     * exponential backoff). Pass `{ maxRetries: 0 }` to opt out entirely.
     */
    retry?: Partial<RetryOptions>;
};
/**
 * Client for the Customer.io Pipelines (Data Pipelines) API.
 *
 * Authenticates with a public (`pk_…`) or secret (`sk_…`) API key as a Bearer
 * token, or with a Data Pipelines source write key. Use this client to send
 * Segment-compatible identify/track/page/screen/group/alias events, one at a
 * time or batched. Payloads use camelCase (`userId`, `anonymousId`, `groupId`,
 * `previousId`), matching the Pipelines wire format.
 *
 * `messageId`, `timestamp`, and `context.library` are auto-filled on every call
 * when you don't supply them; per-call values always win.
 *
 * Every method rejects with a {@link CustomerIORequestError} when the API
 * returns a non-2xx status.
 *
 * @example
 * ```ts
 * import { PipelinesClient } from 'customerio-node';
 *
 * const cdp = new PipelinesClient(process.env.CIO_API_KEY);
 * await cdp.identify({ userId: '123', traits: { email: 'a@example.com' } });
 * await cdp.track({ userId: '123', event: 'Signed Up' });
 * ```
 */
export declare class PipelinesClient {
    writeKey: string;
    defaults: PipelinesDefaults;
    request: Request;
    pipelinesRoot: string;
    private readonly autoContext;
    /**
     * @param writeKey Your public (`pk_…`) or secret (`sk_…`) API key, or your Data
     *   Pipelines source write key (Data Pipelines -> Sources).
     * @param defaults Optional overrides. Use `region` to select {@link RegionUS} or
     *   {@link RegionEU} (with an API key, the region is determined by the key provided),
     *   `url` to point at a custom host, `strictMode` to have the API
     *   validate payloads and return real HTTP errors, or `defaultContext` to merge a
     *   base `context` under every call. Accepts any fetch {@link RequestDefaults} field too
     *   (e.g. `timeout`, or `dispatcher` for proxies / custom TLS / keep-alive).
     * @throws {MissingParamError} If `writeKey` is empty.
     * @throws {Error} If `region` is provided and is not a {@link Region} instance, or
     *   doesn't match the region of the API key provided.
     */
    constructor(writeKey: string, defaults?: Partial<PipelinesDefaults>);
    /**
     * Identify a person, creating or updating their traits.
     *
     * @param payload Identify payload. Must include `userId` or `anonymousId`;
     *   `traits` carries the person's attributes.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If neither `userId` nor `anonymousId` is present.
     */
    identify(payload: IdentifyPayload): Promise<Record<string, any>>;
    /**
     * Record an event for a person.
     *
     * @param payload Track payload. Must include `userId` or `anonymousId` and a
     *   non-empty `event` name; `properties` carries event attributes.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `userId`/`anonymousId` or `event` is missing.
     */
    track(payload: TrackPayload): Promise<Record<string, any>>;
    /**
     * Record a page view (web) for a person.
     *
     * @param payload Page payload. Must include `userId` or `anonymousId`;
     *   optional `name`, `category`, and `properties`.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If neither `userId` nor `anonymousId` is present.
     */
    page(payload: PagePayload): Promise<Record<string, any>>;
    /**
     * Record a screen view (mobile) for a person.
     *
     * @param payload Screen payload. Must include `userId` or `anonymousId`;
     *   optional `name`, `category`, and `properties`.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If neither `userId` nor `anonymousId` is present.
     */
    screen(payload: ScreenPayload): Promise<Record<string, any>>;
    /**
     * Associate a person with a group (e.g. an account or organization).
     *
     * @param payload Group payload. Must include `userId` or `anonymousId` and a
     *   non-empty `groupId`; `traits` carries group attributes.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `userId`/`anonymousId` or `groupId` is missing.
     */
    group(payload: GroupPayload): Promise<Record<string, any>>;
    /**
     * Merge two identities by aliasing a previous id to a user id.
     *
     * @param payload Alias payload. Must include both `userId` and `previousId`.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `userId` or `previousId` is missing.
     */
    alias(payload: AliasPayload): Promise<Record<string, any>>;
    /**
     * Send multiple events in a single request. Each item carries a `type`
     * discriminator (`identify`, `track`, `page`, `screen`, `group`, or `alias`)
     * and is enveloped (auto-filled `messageId`/`timestamp`/`context`) individually.
     *
     * @param items A non-empty array of {@link BatchItem} entries.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `items` is not a non-empty array.
     */
    batch(items: BatchItem[]): Promise<Record<string, any>>;
    private envelope;
}
export type { AliasPayload, BatchItem, GroupPayload, IdentifyPayload, PagePayload, PipelinesCommon, PipelinesContext, ScreenPayload, TrackPayload, } from './pipelines/payloads';
