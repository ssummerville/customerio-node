"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RETRY = void 0;
const utils_1 = require("./utils");
const version_1 = require("./version");
const TIMEOUT = 10_000;
const REDIRECT_STATUSES = new Set([301, 302, 307, 308]);
const RETRY_COUNT_HEADER = 'X-Retry-Count';
exports.DEFAULT_RETRY = {
    maxRetries: 3,
    minTimeoutMs: 200,
    maxTimeoutMs: 5_000,
    retryStatusCodes: [408, 429, 500, 502, 503, 504, 522, 524],
    respectRetryAfter: true,
    retryAfterMaxSeconds: 300,
    maxTotalBackoffMs: 30_000,
};
class CIORequest {
    apikey;
    siteid;
    appKey;
    auth;
    defaults;
    retry;
    constructor(auth, defaults) {
        if (typeof auth === 'object') {
            this.apikey = auth.apikey;
            this.siteid = auth.siteid;
            this.auth = `Basic ${Buffer.from(`${this.siteid}:${this.apikey}`, 'utf8').toString('base64')}`;
        }
        else {
            this.appKey = auth;
            this.auth = `Bearer ${this.appKey}`;
        }
        // `retry` is kept off `this.defaults` so the latter stays a pure fetch
        // `RequestInit` bag (plus `timeout`) that is forwarded to `fetch` untouched.
        const { retry, ...requestDefaults } = defaults ?? {};
        this.defaults = {
            timeout: TIMEOUT,
            ...requestDefaults,
        };
        this.retry = { ...exports.DEFAULT_RETRY, ...retry };
    }
    options(uri, method, data) {
        const body = data ? JSON.stringify(data) : null;
        // Per-client custom headers (e.g. `X-Strict-Mode` for the Pipelines
        // client) can be supplied via `defaults.headers`. They're merged in
        // first so the standard headers below always win and cannot be
        // clobbered. The widening cast lets us mix our own `number`-typed
        // `Content-Length` into the same record as the string-valued headers.
        const customHeaders = (this.defaults.headers ?? {});
        const headers = {
            ...customHeaders,
            Authorization: this.auth,
            'Content-Type': 'application/json',
            'User-Agent': `Customer.io Node Client/${version_1.version}`,
        };
        if (body) {
            headers['Content-Length'] = Buffer.byteLength(body, 'utf8');
        }
        return { method, uri, headers, body };
    }
    /**
     * Build request options for a `multipart/form-data` upload. Unlike
     * {@link options}, the `Content-Type` is deliberately left unset so `fetch`
     * adds it with the correct multipart boundary, and no `Content-Length` is
     * computed (the runtime streams the body).
     */
    formOptions(uri, method, form) {
        const customHeaders = (this.defaults.headers ?? {});
        const headers = {};
        // Merge caller headers, but never a Content-Type: multipart uploads rely on
        // `fetch` setting `multipart/form-data` with a boundary, so a stray
        // Content-Type from `defaults.headers` would corrupt the request body.
        for (const [key, value] of Object.entries(customHeaders)) {
            if (key.toLowerCase() !== 'content-type') {
                headers[key] = value;
            }
        }
        headers.Authorization = this.auth;
        headers['User-Agent'] = `Customer.io Node Client/${version_1.version}`;
        return { method, uri, headers, body: form };
    }
    async execute({ uri, body, method, headers }) {
        // Network failures and timeouts surface as native fetch errors:
        //   - DNS / refused / reset → `TypeError("fetch failed")` with the underlying
        //     SystemError (carrying `.code`) on `.cause`.
        //   - Timeout → `DOMException("TimeoutError")` from `AbortSignal.timeout`.
        // These are intentionally not translated; callers should inspect `name`,
        // `cause`, and `cause.code` rather than relying on the legacy error shapes.
        //
        // User-supplied fetch init (`dispatcher`, `keepalive`, …) is forwarded via
        // the spread. `headers` and `timeout` are handled specially, and the
        // SDK-owned fields (`method`, `body`, `redirect`, `signal`) are applied
        // after the spread so a caller can never override them.
        const { headers: _headers, timeout, ...fetchInit } = this.defaults;
        const response = await fetch(uri, {
            ...fetchInit,
            method,
            headers: headers,
            body,
            redirect: 'manual',
            signal: AbortSignal.timeout(timeout),
        });
        const statusCode = response.status;
        if (REDIRECT_STATUSES.has(statusCode)) {
            // Drain the body to free the connection; we don't need it for redirects.
            await response.text();
            const newURI = response.headers.get('location');
            if (newURI == null) {
                throw new Error(`Received a ${statusCode} status, but no Location header was present`);
            }
            // Strip the Authorization header when the redirect target is not a
            // customer.io host, so we don't leak credentials to a host the
            // caller never intended to authenticate against. Cross-data-center
            // redirects (e.g. US → EU) stay within `*.customer.io` and must
            // continue to carry the Authorization header.
            let redirectHeaders = headers;
            try {
                const newHostname = new URL(newURI).hostname;
                if (!newHostname.endsWith('.customer.io') && headers && 'Authorization' in headers) {
                    const { Authorization: _stripped, ...rest } = headers;
                    redirectHeaders = rest;
                }
            }
            catch {
                // No need to do anything if the URL is malformed or relative
            }
            return this.execute({ uri: newURI, body, method, headers: redirectHeaders });
        }
        const responseBody = await response.text();
        let json = {};
        try {
            if (responseBody && responseBody.length) {
                json = JSON.parse(responseBody);
            }
        }
        catch (error) {
            throw new Error(`Unable to parse JSON. Error: ${error} \nBody:\n ${responseBody}`);
        }
        if (statusCode >= 200 && statusCode < 300) {
            return json;
        }
        const responseLike = {
            statusCode,
            headers: Object.fromEntries(response.headers.entries()),
            ok: response.ok,
        };
        throw new utils_1.CustomerIORequestError(json, statusCode, responseLike, responseBody);
    }
    // `attempt` and `totalBackoff` are internal recursion state: callers invoke
    // `handler(options)` and the retry loop threads them through on each replay.
    async handler(options, 
    /** @internal */ attempt = 0, 
    /** @internal */ totalBackoff = 0) {
        // Tag retries so the server (and our own logs) can tell an original
        // request apart from a replay. The first attempt is left untouched.
        const attemptOptions = attempt === 0 ? options : { ...options, headers: { ...options.headers, [RETRY_COUNT_HEADER]: attempt } };
        try {
            return await this.execute(attemptOptions);
        }
        catch (error) {
            if (attempt >= this.retry.maxRetries || !this.isRetryable(error)) {
                throw error;
            }
            const delay = this.computeBackoff(attempt, error);
            // Stop before sleeping past the per-call backoff budget; better to
            // surface the last error than block a caller indefinitely.
            if (totalBackoff + delay > this.retry.maxTotalBackoffMs) {
                throw error;
            }
            await this.sleep(delay);
            return this.handler(options, attempt + 1, totalBackoff + delay);
        }
    }
    /**
     * Whether a failed attempt is worth replaying. Transient HTTP statuses and
     * native fetch failures (network drop, DNS, timeout) retry; deterministic
     * errors we raise ourselves (bad redirect, unparseable JSON) do not.
     */
    isRetryable(error) {
        if (error instanceof utils_1.CustomerIORequestError) {
            return this.retry.retryStatusCodes.includes(error.statusCode);
        }
        // `fetch` rejects network failures as `TypeError("fetch failed")` and
        // `AbortSignal.timeout` aborts surface as `DOMException("TimeoutError")`.
        if (error instanceof TypeError) {
            return true;
        }
        return error instanceof DOMException && error.name === 'TimeoutError';
    }
    /** Milliseconds to wait before the next attempt. */
    computeBackoff(attempt, error) {
        const retryAfterMs = this.retryAfterDelay(error);
        if (retryAfterMs != null) {
            return retryAfterMs;
        }
        // Exponential backoff with a jitter multiplier in [1, 2), matching the
        // Segment / cdp-analytics SDK formula, capped at `maxTimeoutMs`.
        const { minTimeoutMs, maxTimeoutMs } = this.retry;
        const jitter = Math.random() + 1;
        return Math.min(maxTimeoutMs, jitter * minTimeoutMs * 2 ** attempt);
    }
    /**
     * Parse a `Retry-After` header (delay-seconds or HTTP-date) from a rejected
     * response, clamped to `retryAfterMaxSeconds`. Returns `null` when the header
     * is absent, unparseable, or `respectRetryAfter` is disabled.
     */
    retryAfterDelay(error) {
        if (!this.retry.respectRetryAfter || !(error instanceof utils_1.CustomerIORequestError)) {
            return null;
        }
        const raw = error.response.headers['retry-after'];
        if (raw == null) {
            return null;
        }
        let seconds = Number(raw);
        if (!Number.isFinite(seconds)) {
            const dateMs = Date.parse(raw);
            if (Number.isNaN(dateMs)) {
                return null;
            }
            seconds = (dateMs - Date.now()) / 1000;
        }
        seconds = Math.max(0, Math.min(seconds, this.retry.retryAfterMaxSeconds));
        return seconds * 1000;
    }
    /** Resolves after `ms` milliseconds. Isolated so tests can stub the wait. */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    get(uri) {
        return this.handler(this.options(uri, 'GET'));
    }
    put(uri, data = {}) {
        return this.handler(this.options(uri, 'PUT', data));
    }
    destroy(uri) {
        return this.handler(this.options(uri, 'DELETE'));
    }
    post(uri, data = {}) {
        return this.handler(this.options(uri, 'POST', data));
    }
    postForm(uri, form) {
        return this.handler(this.formOptions(uri, 'POST', form));
    }
}
exports.default = CIORequest;
