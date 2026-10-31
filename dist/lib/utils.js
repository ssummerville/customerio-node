"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyCapabilityError = exports.MissingParamError = exports.CustomerIORequestError = exports.buildQueryString = exports.isObjectIdType = exports.isIdentifierType = exports.isEmpty = void 0;
exports.pickDefined = pickDefined;
const types_1 = require("../lib/types");
/** Returns `true` for `null`, `undefined`, an empty/whitespace string, or a non-finite number. */
const isEmpty = (value) => {
    if (value === null || value === undefined)
        return true;
    if (typeof value === 'string')
        return value.trim() === '';
    return !Number.isFinite(value);
};
exports.isEmpty = isEmpty;
/** Returns `true` if `value` is one of the {@link IdentifierType} enum values. */
const isIdentifierType = (value) => {
    return Object.values(types_1.IdentifierType).includes(value);
};
exports.isIdentifierType = isIdentifierType;
/**
 * Returns `true` if `value` is a valid object identifier kind (`object_id` or
 * `cio_object_id`). Objects use a different id vocabulary than people, so this
 * is intentionally separate from {@link isIdentifierType}.
 */
const isObjectIdType = (value) => {
    return value === 'object_id' || value === 'cio_object_id';
};
exports.isObjectIdType = isObjectIdType;
/**
 * Build a URL query string from a map of parameters.
 *
 * `null` and `undefined` values are omitted (so optional params disappear
 * rather than serializing as empty). Keys and values are URL-encoded. Returns
 * a leading-`?` string (e.g. `?a=1&b=2`) when at least one param is present,
 * or an empty string when none are.
 */
const buildQueryString = (params) => {
    const parts = [];
    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') {
            continue;
        }
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
    return parts.length > 0 ? `?${parts.join('&')}` : '';
};
exports.buildQueryString = buildQueryString;
/**
 * Thrown when the Customer.io API responds with a non-2xx status.
 *
 * The error message is derived from the API response body when possible. The
 * raw status code, response, and body are exposed for programmatic handling
 * (e.g. retry on 5xx, ignore on 404).
 *
 * @remarks
 * This is only thrown for HTTP responses with a non-2xx status. Transport-level
 * failures (DNS, connection reset, refused) and timeouts are surfaced as the
 * native `fetch` errors — `TypeError('fetch failed')` (with the underlying
 * cause on `.cause`) and `DOMException('TimeoutError')` respectively — not as a
 * `CustomerIORequestError`.
 *
 * @example
 * ```ts
 * try {
 *   await cio.identify('123', { email: 'a@example.com' });
 * } catch (err) {
 *   if (err instanceof CustomerIORequestError && err.statusCode === 404) {
 *     // customer not found, fall through
 *   } else {
 *     throw err;
 *   }
 * }
 * ```
 */
class CustomerIORequestError extends Error {
    /** HTTP status code returned by the API. */
    statusCode;
    /** Portable response metadata ({@link ResponseLike}: status, lowercased headers, `ok`). */
    response;
    /** The raw response body as a string. May be empty. */
    body;
    static composeMessage(json) {
        if (!json) {
            return 'Unknown error';
        }
        if (json.meta && json.meta.error) {
            return json.meta.error;
        }
        else if (json.meta && json.meta.errors) {
            const count = json.meta.errors.length;
            return `${count} ${count === 1 ? 'error' : 'errors'}:
${json.meta.errors.map((error) => `  - ${error}`).join('\n')}`;
        }
        // The App API reports auth failures as `{ errors: [{ detail, status }] }`.
        const detail = Array.isArray(json.errors) ? json.errors[0]?.detail : undefined;
        if (typeof detail === 'string' && detail) {
            return detail;
        }
        return 'Unknown error';
    }
    constructor(json, statusCode, response, body) {
        super(CustomerIORequestError.composeMessage(json));
        this.name = 'CustomerIORequestError';
        this.statusCode = statusCode;
        this.response = response;
        this.body = body;
    }
}
exports.CustomerIORequestError = CustomerIORequestError;
function pickDefined(source, keys) {
    const result = {};
    for (const key of keys) {
        if (source[key] !== undefined) {
            result[key] = source[key];
        }
    }
    return result;
}
/**
 * Thrown synchronously by SDK methods when a required parameter is missing.
 *
 * The `message` is always `"<paramName> is required"`.
 */
class MissingParamError extends Error {
    constructor(param) {
        super(`${param} is required`);
        this.name = 'MissingParamError';
    }
}
exports.MissingParamError = MissingParamError;
/**
 * Thrown by {@link CustomerIO} when its key can't do what a method asks.
 *
 * Thrown before the request when the key's type rules it out (a public `pk_`
 * key can't send transactional messages). Otherwise the server's 401 or 403 is
 * rethrown as this error, with the original {@link CustomerIORequestError} on
 * `cause`.
 */
class KeyCapabilityError extends Error {
    /** What the key can't do. */
    capability;
    /** The HTTP status, when the server refused the key. */
    statusCode;
    constructor(capability, message, cause) {
        super(message, { cause });
        this.name = 'KeyCapabilityError';
        this.capability = capability;
        this.statusCode = cause?.statusCode;
    }
}
exports.KeyCapabilityError = KeyCapabilityError;
