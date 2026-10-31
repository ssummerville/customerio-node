/** Arguments for {@link verifyRequestSignature}. */
export interface VerifyRequestSignatureOptions {
    /**
     * Your webhook signing secret. Found on the webhook's settings page in
     * Customer.io (e.g. the Email Activity / Reporting Webhook integration).
     */
    signingSecret: string;
    /** Value of the `X-CIO-Timestamp` request header. */
    timestamp: string | number;
    /**
     * The raw, unparsed request body exactly as received. Do not re-serialize
     * with `JSON.stringify` — subtle formatting differences will break the hash.
     * Pass the original string or `Buffer`.
     */
    body: string | Buffer;
    /** Value of the `X-CIO-Signature` request header (hex-encoded HMAC-SHA256). */
    signature: string;
}
/**
 * Verifies that a webhook request genuinely originated from Customer.io.
 *
 * Customer.io signs each webhook by computing an HMAC-SHA256 of the string
 * `v0:<timestamp>:<body>` (keyed with your webhook signing secret) and sends the
 * hex-encoded result in the `X-CIO-Signature` header, alongside the
 * `X-CIO-Timestamp` header. This recomputes that signature and compares it to
 * the header value in constant time.
 *
 * @returns `true` if the signature is valid, `false` otherwise. A malformed or
 * missing `signature` returns `false` rather than throwing.
 * @throws {MissingParamError} if `signingSecret` is empty.
 *
 * @see https://docs.customer.io/api/webhooks/
 *
 * @example
 * ```ts
 * import { verifyRequestSignature } from 'customerio-node';
 *
 * const valid = verifyRequestSignature({
 *   signingSecret: process.env.CIO_WEBHOOK_SECRET,
 *   timestamp: req.headers['x-cio-timestamp'],
 *   signature: req.headers['x-cio-signature'],
 *   body: req.rawBody, // the raw request body, not the parsed object
 * });
 *
 * if (!valid) {
 *   res.status(400).send('invalid signature');
 *   return;
 * }
 * ```
 */
export declare function verifyRequestSignature({ signingSecret, timestamp, body, signature, }: VerifyRequestSignatureOptions): boolean;
