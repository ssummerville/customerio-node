"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelinesClient = void 0;
const crypto_1 = require("crypto");
const request_1 = __importDefault(require("./request"));
const regions_1 = require("./regions");
const utils_1 = require("./utils");
const version_1 = require("./version");
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
class PipelinesClient {
    writeKey;
    defaults;
    request;
    pipelinesRoot;
    autoContext;
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
    constructor(writeKey, defaults = {}) {
        if ((0, utils_1.isEmpty)(writeKey)) {
            throw new utils_1.MissingParamError('writeKey');
        }
        if (defaults.region && !(defaults.region instanceof regions_1.Region)) {
            throw new Error('region must be one of Regions.US or Regions.EU');
        }
        // The region is determined by the API key provided (`sk_eu_…` is EU). Write keys default to the US.
        const keyRegion = /^(pk|sk)_(us|eu)_/.exec(writeKey)?.[2];
        const regionFromKey = keyRegion === 'eu' ? regions_1.RegionEU : regions_1.RegionUS;
        const otherRegion = keyRegion === 'eu' ? regions_1.RegionUS : regions_1.RegionEU;
        // The other region's host answers 200 and drops the events, so a conflicting region can only fail.
        if (keyRegion && defaults.region?.pipelinesUrl === otherRegion.pipelinesUrl) {
            const given = keyRegion === 'eu' ? 'us' : 'eu';
            throw new Error(`region ${given} does not match the ${keyRegion} region of this key`);
        }
        this.writeKey = writeKey;
        // Strict mode rides into `defaults.headers` so the `CIORequest.options()`
        // passthrough delivers it on every request. Existing headers on the
        // incoming defaults are preserved.
        const headers = defaults.strictMode ? { ...(defaults.headers ?? {}), 'X-Strict-Mode': '1' } : defaults.headers;
        this.defaults = { ...defaults, headers, region: defaults.region || regionFromKey };
        // Public (`pk_`) and secret (`sk_`) API keys go as a Bearer token.
        //
        // Write keys authenticate with HTTP Basic where the write key is
        // the username and the password is blank. The existing `CIORequest`
        // BasicAuth helper builds `${siteid}:${apikey}` — we map the write key
        // into `siteid` and leave `apikey` empty so the encoded credential is
        // exactly `base64(writeKey:)`. The field names are an internal artifact
        // and never leak through to the public API.
        //
        // Strip the SDK-only keys; the remainder (the computed `headers`, plus any
        // `dispatcher`/`keepalive`/`timeout`/retry the caller supplied) is fetch
        // init for the transport.
        const { region: _region, url: _url, strictMode: _strictMode, defaultContext: _defaultContext, ...requestDefaults } = this.defaults;
        this.request = keyRegion
            ? new request_1.default(writeKey, requestDefaults)
            : new request_1.default({ siteid: writeKey, apikey: '' }, requestDefaults);
        this.pipelinesRoot = this.defaults.url ? this.defaults.url : this.defaults.region.pipelinesUrl;
        this.autoContext = {
            ...(this.defaults.defaultContext ?? {}),
            library: { name: 'customerio-node', version: version_1.version },
        };
    }
    /**
     * Identify a person, creating or updating their traits.
     *
     * @param payload Identify payload. Must include `userId` or `anonymousId`;
     *   `traits` carries the person's attributes.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If neither `userId` nor `anonymousId` is present.
     */
    identify(payload) {
        if ((0, utils_1.isEmpty)(payload?.userId) && (0, utils_1.isEmpty)(payload?.anonymousId)) {
            throw new utils_1.MissingParamError('userId or anonymousId');
        }
        return this.request.post(`${this.pipelinesRoot}/identify`, this.envelope(payload));
    }
    /**
     * Record an event for a person.
     *
     * @param payload Track payload. Must include `userId` or `anonymousId` and a
     *   non-empty `event` name; `properties` carries event attributes.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `userId`/`anonymousId` or `event` is missing.
     */
    track(payload) {
        if ((0, utils_1.isEmpty)(payload?.userId) && (0, utils_1.isEmpty)(payload?.anonymousId)) {
            throw new utils_1.MissingParamError('userId or anonymousId');
        }
        if ((0, utils_1.isEmpty)(payload?.event)) {
            throw new utils_1.MissingParamError('event');
        }
        return this.request.post(`${this.pipelinesRoot}/track`, this.envelope(payload));
    }
    /**
     * Record a page view (web) for a person.
     *
     * @param payload Page payload. Must include `userId` or `anonymousId`;
     *   optional `name`, `category`, and `properties`.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If neither `userId` nor `anonymousId` is present.
     */
    page(payload) {
        if ((0, utils_1.isEmpty)(payload?.userId) && (0, utils_1.isEmpty)(payload?.anonymousId)) {
            throw new utils_1.MissingParamError('userId or anonymousId');
        }
        return this.request.post(`${this.pipelinesRoot}/page`, this.envelope(payload));
    }
    /**
     * Record a screen view (mobile) for a person.
     *
     * @param payload Screen payload. Must include `userId` or `anonymousId`;
     *   optional `name`, `category`, and `properties`.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If neither `userId` nor `anonymousId` is present.
     */
    screen(payload) {
        if ((0, utils_1.isEmpty)(payload?.userId) && (0, utils_1.isEmpty)(payload?.anonymousId)) {
            throw new utils_1.MissingParamError('userId or anonymousId');
        }
        return this.request.post(`${this.pipelinesRoot}/screen`, this.envelope(payload));
    }
    /**
     * Associate a person with a group (e.g. an account or organization).
     *
     * @param payload Group payload. Must include `userId` or `anonymousId` and a
     *   non-empty `groupId`; `traits` carries group attributes.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `userId`/`anonymousId` or `groupId` is missing.
     */
    group(payload) {
        if ((0, utils_1.isEmpty)(payload?.userId) && (0, utils_1.isEmpty)(payload?.anonymousId)) {
            throw new utils_1.MissingParamError('userId or anonymousId');
        }
        if ((0, utils_1.isEmpty)(payload?.groupId)) {
            throw new utils_1.MissingParamError('groupId');
        }
        return this.request.post(`${this.pipelinesRoot}/group`, this.envelope(payload));
    }
    /**
     * Merge two identities by aliasing a previous id to a user id.
     *
     * @param payload Alias payload. Must include both `userId` and `previousId`.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `userId` or `previousId` is missing.
     */
    alias(payload) {
        if ((0, utils_1.isEmpty)(payload?.userId)) {
            throw new utils_1.MissingParamError('userId');
        }
        if ((0, utils_1.isEmpty)(payload?.previousId)) {
            throw new utils_1.MissingParamError('previousId');
        }
        return this.request.post(`${this.pipelinesRoot}/alias`, this.envelope(payload));
    }
    /**
     * Send multiple events in a single request. Each item carries a `type`
     * discriminator (`identify`, `track`, `page`, `screen`, `group`, or `alias`)
     * and is enveloped (auto-filled `messageId`/`timestamp`/`context`) individually.
     *
     * @param items A non-empty array of {@link BatchItem} entries.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `items` is not a non-empty array.
     */
    batch(items) {
        if (!Array.isArray(items) || items.length === 0) {
            throw new utils_1.MissingParamError('items');
        }
        const batch = items.map((item) => ({ ...this.envelope(item), type: item.type }));
        return this.request.post(`${this.pipelinesRoot}/batch`, { batch });
    }
    // Auto-fills `messageId`, `timestamp`, and `context.library` when the caller
    // hasn't supplied them. Per-call values always win over the auto-fill and
    // over `defaultContext`.
    envelope(payload) {
        const merged = {
            ...this.autoContext,
            ...(payload.context ?? {}),
        };
        // `context.library` is a sub-object — preserve per-call override
        // explicitly so a partial `context: { ip: '...' }` doesn't drop the
        // auto-filled library identifier.
        merged.library = payload.context?.library ?? this.autoContext.library;
        return {
            ...payload,
            messageId: payload.messageId ?? (0, crypto_1.randomUUID)(),
            timestamp: payload.timestamp ?? new Date().toISOString(),
            context: merged,
        };
    }
}
exports.PipelinesClient = PipelinesClient;
