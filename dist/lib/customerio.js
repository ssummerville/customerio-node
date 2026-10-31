"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerIO = void 0;
const request_1 = __importDefault(require("./request"));
const regions_1 = require("./regions");
const track_1 = require("./track");
const api_1 = require("./api");
const requests_1 = require("./api/requests");
const utils_1 = require("./utils");
// Keys in the shared format look like `{type}_{us|eu}_{random}_{checksum}`,
// where type is `pk` (public) or `sk` (secret). The server checks the
// checksum; the SDK only reads the prefix to pick a host and spot public keys.
const KEY_PREFIX = /^(pk|sk)_(us|eu)_/;
function regionName(region) {
    if (region.trackUrl === regions_1.RegionUS.trackUrl) {
        return 'us';
    }
    if (region.trackUrl === regions_1.RegionEU.trackUrl) {
        return 'eu';
    }
    return null;
}
// The key travels as a Bearer token, so an override must not send it in clear text.
function requireHttps(name, url) {
    // An empty string falls back to the region host, as before.
    if (!url) {
        return;
    }
    let protocol;
    try {
        ({ protocol } = new URL(url));
    }
    catch {
        throw new Error(`${name} must be a valid URL`);
    }
    if (protocol !== 'https:') {
        throw new Error(`${name} must start with https://`);
    }
}
function parseKey(key) {
    const match = KEY_PREFIX.exec(key);
    if (!match) {
        return null;
    }
    return { kind: match[1] === 'pk' ? 'public' : 'secret', region: match[2] === 'eu' ? regions_1.RegionEU : regions_1.RegionUS };
}
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
class CustomerIO {
    /** Track API client, authenticated with the key as a Bearer token. */
    trackClient;
    region;
    keyKind;
    _apiClient;
    /**
     * @throws If `apiKey` is empty, `region` is provided and is not a {@link Region} instance,
     * `region` doesn't match the region of a `pk_`/`sk_` key, or `trackUrl`/`apiUrl` (or the region's URLs) isn't an `https://` URL.
     */
    constructor(options) {
        const { apiKey: rawKey, region, trackUrl, apiUrl, ...requestDefaults } = options ?? {};
        // Keys pasted from env files often carry stray whitespace, which would hide the prefix.
        const apiKey = (rawKey ?? '').trim();
        if (!apiKey) {
            throw new Error('apiKey is required');
        }
        if (region && !(region instanceof regions_1.Region)) {
            throw new Error('region must be one of Regions.US or Regions.EU');
        }
        requireHttps('trackUrl', trackUrl);
        requireHttps('apiUrl', apiUrl);
        if (region) {
            // A custom Region carries its own URLs, and the key goes out to them too.
            requireHttps('region trackUrl', region.trackUrl);
            requireHttps('region apiUrl', region.apiUrl);
        }
        const key = parseKey(apiKey);
        if (region && key) {
            const given = regionName(region);
            const expected = regionName(key.region);
            // A prefixed key belongs to one region, so a different one can only fail.
            if (given && given !== expected) {
                throw new Error(`region ${given} does not match the ${expected} region of this key`);
            }
        }
        this.keyKind = key ? key.kind : 'legacy';
        this.region = region || key?.region || regions_1.RegionUS;
        // TrackClient only speaks Basic auth, so swap in a Bearer transport.
        this.trackClient = new track_1.TrackClient('', '', { ...requestDefaults, region: this.region, url: trackUrl });
        this.trackClient.request = new request_1.default(apiKey, requestDefaults);
        this._apiClient = new api_1.APIClient(apiKey, { ...requestDefaults, region: this.region, url: apiUrl });
    }
    /**
     * App API client, authenticated with the key.
     *
     * @throws {KeyCapabilityError} If the key is a public `pk_` key.
     */
    get apiClient() {
        if (this.keyKind === 'public') {
            throw new utils_1.KeyCapabilityError('transactional', "This key can't use the App API: public keys (pk_) are for tracking only. Use a secret key (sk_).");
        }
        return this._apiClient;
    }
    /** Create or update a person. See {@link TrackClient.identify}. */
    identify(customerId, data) {
        return guard('track', () => this.trackClient.identify(customerId, data));
    }
    /** Track an event for a person. See {@link TrackClient.track}. */
    track(customerId, data) {
        return guard('track', () => this.trackClient.track(customerId, data));
    }
    /** Track an event for an anonymous visitor. See {@link TrackClient.trackAnonymous}. */
    trackAnonymous(anonymousId, data) {
        return guard('track', () => this.trackClient.trackAnonymous(anonymousId, data));
    }
    /** Track a page view for a person. See {@link TrackClient.trackPageView}. */
    trackPageView(customerId, path) {
        return guard('track', () => this.trackClient.trackPageView(customerId, path));
    }
    /** Send a transactional email. See {@link APIClient.sendEmail}. */
    sendEmail(req) {
        return guard('transactional', () => this.apiClient.sendEmail(req instanceof requests_1.SendEmailRequest ? req : new requests_1.SendEmailRequest(req)));
    }
    /** Send a transactional push. See {@link APIClient.sendPush}. */
    sendPush(req) {
        return guard('transactional', () => this.apiClient.sendPush(req instanceof requests_1.SendPushRequest ? req : new requests_1.SendPushRequest(req)));
    }
    /** Send a transactional SMS. See {@link APIClient.sendSMS}. */
    sendSMS(req) {
        return guard('transactional', () => this.apiClient.sendSMS(req instanceof requests_1.SendSMSRequest ? req : new requests_1.SendSMSRequest(req)));
    }
    /** Send a transactional WhatsApp message. See {@link APIClient.sendWhatsApp}. */
    sendWhatsApp(req) {
        return guard('transactional', () => this.apiClient.sendWhatsApp(req instanceof requests_1.SendWhatsAppRequest ? req : new requests_1.SendWhatsAppRequest(req)));
    }
    /** Send a transactional inbox message. See {@link APIClient.sendInboxMessage}. */
    sendInboxMessage(req) {
        return guard('transactional', () => this.apiClient.sendInboxMessage(req instanceof requests_1.SendInboxMessageRequest ? req : new requests_1.SendInboxMessageRequest(req)));
    }
    /** Send a transactional in-app message. See {@link APIClient.sendInApp}. */
    sendInApp(req) {
        return guard('transactional', () => this.apiClient.sendInApp(req instanceof requests_1.SendInAppRequest ? req : new requests_1.SendInAppRequest(req)));
    }
}
exports.CustomerIO = CustomerIO;
const CAPABILITY_ACTIONS = {
    track: 'send tracking data',
    transactional: 'send transactional messages',
};
// Turns a 401/403 into a KeyCapabilityError so a key mismatch is never a bare
// auth failure. Synchronous throws (missing params, pk_ keys) pass through.
function guard(capability, call) {
    return call().catch((error) => {
        if (error instanceof utils_1.CustomerIORequestError && (error.statusCode === 401 || error.statusCode === 403)) {
            throw new utils_1.KeyCapabilityError(capability, `The server refused this request to ${CAPABILITY_ACTIONS[capability]} (${error.statusCode}): ${error.message}. ` +
                'Check the key type, its IP restrictions and the workspace status.', error);
        }
        throw error;
    });
}
