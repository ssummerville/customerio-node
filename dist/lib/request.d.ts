export interface BasicAuth {
    apikey: string;
    siteid: string;
}
export type BearerAuth = string;
export type RequestAuth = BasicAuth | BearerAuth;
export type RequestData = Record<string, any> | undefined;
/**
 * Options forwarded to the underlying `fetch` call.
 *
 * This is the native fetch `RequestInit`, minus the fields the SDK owns and
 * sets itself (`method`, `body`, `signal`, `redirect`), plus a convenience
 * `timeout`. `headers` is narrowed to a plain record since that's the only
 * shape the SDK ever merges.
 *
 * Use `dispatcher` (an undici `Agent` / `ProxyAgent`) for HTTP(S) proxies,
 * custom TLS (mTLS or a private CA), or connection keep-alive — it is the
 * fetch-era replacement for the `https.Agent` knob that the old transport
 * accepted but `fetch` cannot honor.
 */
export type RequestDefaults = Omit<RequestInit, 'method' | 'body' | 'signal' | 'redirect' | 'headers'> & {
    /** Per-request headers merged into every call. SDK headers always win on conflict. */
    headers?: Record<string, string>;
    /** Request timeout in milliseconds. Defaults to `10000`. */
    timeout?: number;
};
export interface RequestHandlerOptions {
    method: string;
    uri: string;
    headers: Record<string, string | number>;
    body?: string | FormData | null;
}
export interface PushRequestData {
    delivery_id?: string;
    device_id?: string;
    event?: 'delivered' | 'opened' | 'converted';
    timestamp?: number;
}
/**
 * Payload for {@link TrackClient.reportMetric} — a delivery metric reported to
 * the Track API `/metrics` endpoint. The valid `metric` values depend on the
 * channel of the delivery (e.g. email supports `delivered`/`opened`/`clicked`/
 * `bounced`; push supports `delivered`/`opened`/`converted`), so `metric` is
 * left as a loose string rather than a per-channel union.
 */
export interface MetricRequestData {
    /** The `CIO-Delivery-ID` of the message the metric applies to. */
    delivery_id?: string;
    /** The metric/event being reported. Channel-specific. */
    metric?: string;
    /** The unix timestamp (seconds) when the event occurred. */
    timestamp?: number;
    /** The recipient address/token the delivery was sent to. */
    recipient?: string;
    /** Reason for a `bounced`/`dropped` metric, when applicable. */
    reason?: string;
    /** The link that was clicked, for `clicked` metrics. */
    href?: string;
}
/**
 * Per-request retry policy. Retries are stateless and happen at the HTTP layer,
 * so every client (`TrackClient`, `APIClient`, `PipelinesClient`) inherits them.
 */
export type RetryOptions = {
    /** Maximum number of retries after the initial attempt. `0` disables retries. */
    maxRetries: number;
    /** Lower bound for the exponential backoff window, in milliseconds. */
    minTimeoutMs: number;
    /** Upper bound (cap) for a single backoff sleep, in milliseconds. */
    maxTimeoutMs: number;
    /** HTTP status codes that are considered transient and worth retrying. */
    retryStatusCodes: number[];
    /** When `true`, honor a `Retry-After` response header in place of the backoff. */
    respectRetryAfter: boolean;
    /** Ceiling applied to a `Retry-After` value, in seconds. */
    retryAfterMaxSeconds: number;
    /** Cumulative cap across all backoff sleeps for one call, in milliseconds. */
    maxTotalBackoffMs: number;
};
export declare const DEFAULT_RETRY: RetryOptions;
export default class CIORequest {
    apikey?: BasicAuth['apikey'];
    siteid?: BasicAuth['siteid'];
    appKey?: BearerAuth;
    auth: string;
    defaults: RequestDefaults;
    retry: RetryOptions;
    constructor(auth: RequestAuth, defaults?: RequestDefaults & {
        retry?: Partial<RetryOptions>;
    });
    options(uri: string, method: string, data?: RequestData): RequestHandlerOptions;
    /**
     * Build request options for a `multipart/form-data` upload. Unlike
     * {@link options}, the `Content-Type` is deliberately left unset so `fetch`
     * adds it with the correct multipart boundary, and no `Content-Length` is
     * computed (the runtime streams the body).
     */
    formOptions(uri: string, method: string, form: FormData): RequestHandlerOptions;
    private execute;
    handler(options: RequestHandlerOptions, 
    /** @internal */ attempt?: number, 
    /** @internal */ totalBackoff?: number): Promise<Record<string, any>>;
    /**
     * Whether a failed attempt is worth replaying. Transient HTTP statuses and
     * native fetch failures (network drop, DNS, timeout) retry; deterministic
     * errors we raise ourselves (bad redirect, unparseable JSON) do not.
     */
    private isRetryable;
    /** Milliseconds to wait before the next attempt. */
    private computeBackoff;
    /**
     * Parse a `Retry-After` header (delay-seconds or HTTP-date) from a rejected
     * response, clamped to `retryAfterMaxSeconds`. Returns `null` when the header
     * is absent, unparseable, or `respectRetryAfter` is disabled.
     */
    private retryAfterDelay;
    /** Resolves after `ms` milliseconds. Isolated so tests can stub the wait. */
    sleep(ms: number): Promise<void>;
    get(uri: string): Promise<Record<string, any>>;
    put(uri: string, data?: RequestData): Promise<Record<string, any>>;
    destroy(uri: string): Promise<Record<string, any>>;
    post(uri: string, data?: RequestData): Promise<Record<string, any>>;
    postForm(uri: string, form: FormData): Promise<Record<string, any>>;
}
