"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendInAppRequest = exports.SendInboxMessageRequest = exports.SendWhatsAppRequest = exports.SendSMSRequest = exports.SendPushRequest = exports.SendEmailRequest = void 0;
const utils_1 = require("../utils");
const SEND_EMAIL_BRAND = Symbol.for('customerio-node.SendEmailRequest');
const SEND_PUSH_BRAND = Symbol.for('customerio-node.SendPushRequest');
const SEND_SMS_BRAND = Symbol.for('customerio-node.SendSMSRequest');
const SEND_WHATSAPP_BRAND = Symbol.for('customerio-node.SendWhatsAppRequest');
const SEND_INBOX_MESSAGE_BRAND = Symbol.for('customerio-node.SendInboxMessageRequest');
const SEND_IN_APP_BRAND = Symbol.for('customerio-node.SendInAppRequest');
const EMAIL_OPTIONAL_KEYS = [
    'message_data',
    'preheader',
    'reply_to',
    'cc',
    'bcc',
    'body_plain',
    'body_amp',
    'fake_bcc',
    'disable_message_retention',
    'send_to_unsubscribed',
    'tracked',
    'queue_draft',
    'send_at',
    'disable_css_preprocessing',
    'language',
];
/**
 * Builder for a transactional email request. Pass an instance to
 * {@link APIClient.sendEmail}.
 *
 * Provide either a `transactional_message_id` (to use a Customer.io-managed
 * template) **or** inline `body`, `subject`, and `from` fields.
 *
 * @example
 * ```ts
 * const req = new SendEmailRequest({
 *   to: 'a@example.com',
 *   identifiers: { email: 'a@example.com' },
 *   transactional_message_id: 'welcome',
 *   message_data: { first_name: 'Alex' },
 * });
 * req.attach('invoice.pdf', pdfBuffer);
 * await api.sendEmail(req);
 * ```
 */
class SendEmailRequest {
    /** The fully-shaped message payload sent to the API. */
    message;
    static [Symbol.hasInstance](instance) {
        return typeof instance === 'object' && instance !== null && instance[SEND_EMAIL_BRAND] === true;
    }
    constructor(opts) {
        Object.defineProperty(this, SEND_EMAIL_BRAND, { value: true });
        this.message = {
            to: opts.to,
            identifiers: opts.identifiers,
            headers: opts.headers || {},
            ...(0, utils_1.pickDefined)(opts, EMAIL_OPTIONAL_KEYS),
        };
        if ('transactional_message_id' in opts) {
            this.message.transactional_message_id = opts.transactional_message_id;
        }
        if ('from' in opts) {
            this.message.from = opts.from;
        }
        if ('subject' in opts) {
            this.message.subject = opts.subject;
        }
        if ('body' in opts) {
            this.message.body = opts.body;
        }
    }
    /**
     * Attach a file to the email.
     *
     * By default the data is base64-encoded for you. Pass `{ encode: false }` if
     * `data` is already base64.
     *
     * @param name Filename (and attachment key — must be unique on this request).
     * @param data File contents. Any `Buffer.from`-compatible value when `encode` is `true`;
     *   a base64 string when `encode` is `false`.
     * @param options `encode` defaults to `true`.
     * @throws {Error} If an attachment with `name` already exists on this request.
     */
    // Use `any` for data here, because union types and overloads in Typescript
    // don't work well together for `Buffer.from`.
    attach(name, data, { encode = true } = {}) {
        this.message.attachments ??= {};
        if (this.message.attachments[name]) {
            throw new Error(`attachment ${name} already exists`);
        }
        if (encode) {
            this.message.attachments[name] = Buffer.from(data).toString('base64');
        }
        else {
            this.message.attachments[name] = data;
        }
    }
}
exports.SendEmailRequest = SendEmailRequest;
const PUSH_OPTIONAL_KEYS = [
    'to',
    'title',
    'message',
    'disable_message_retention',
    'send_to_unsubscribed',
    'queue_draft',
    'message_data',
    'send_at',
    'language',
    'image_url',
    'link',
    'sound',
    'custom_data',
];
/**
 * Builder for a transactional push notification request. Pass an instance to
 * {@link APIClient.sendPush}.
 *
 * Either supply a `transactional_message_id` to use a Customer.io template,
 * or include a `custom_payload` for a fully-custom message.
 */
class SendPushRequest {
    message;
    static [Symbol.hasInstance](instance) {
        return typeof instance === 'object' && instance !== null && instance[SEND_PUSH_BRAND] === true;
    }
    constructor(opts) {
        Object.defineProperty(this, SEND_PUSH_BRAND, { value: true });
        this.message = {
            identifiers: opts.identifiers,
            transactional_message_id: opts.transactional_message_id,
            ...(0, utils_1.pickDefined)(opts, PUSH_OPTIONAL_KEYS),
            // opts.device maps to custom_device on the wire
            ...(opts.device !== undefined && { custom_device: opts.device }),
        };
        if ('custom_payload' in opts) {
            this.message.custom_payload = opts.custom_payload;
        }
    }
}
exports.SendPushRequest = SendPushRequest;
const SMS_OPTIONAL_KEYS = [
    'to',
    'disable_message_retention',
    'send_to_unsubscribed',
    'queue_draft',
    'message_data',
    'send_at',
    'language',
];
/**
 * Builder for a transactional SMS request. Pass an instance to {@link APIClient.sendSMS}.
 */
class SendSMSRequest {
    message;
    static [Symbol.hasInstance](instance) {
        return typeof instance === 'object' && instance !== null && instance[SEND_SMS_BRAND] === true;
    }
    constructor(opts) {
        Object.defineProperty(this, SEND_SMS_BRAND, { value: true });
        this.message = {
            identifiers: opts.identifiers,
            transactional_message_id: opts.transactional_message_id,
            ...(0, utils_1.pickDefined)(opts, SMS_OPTIONAL_KEYS),
        };
    }
}
exports.SendSMSRequest = SendSMSRequest;
const WHATSAPP_OPTIONAL_KEYS = [
    'to',
    'tracked',
    'disable_message_retention',
    'send_to_unsubscribed',
    'queue_draft',
    'message_data',
    'send_at',
    'language',
];
/**
 * Builder for a transactional WhatsApp request. Pass an instance to {@link APIClient.sendWhatsApp}.
 *
 * `to` and `from` are phone numbers in E.164 format. Both are optional here only
 * when the referenced `transactional_message_id` already defines them.
 */
class SendWhatsAppRequest {
    message;
    static [Symbol.hasInstance](instance) {
        return typeof instance === 'object' && instance !== null && instance[SEND_WHATSAPP_BRAND] === true;
    }
    constructor(opts) {
        Object.defineProperty(this, SEND_WHATSAPP_BRAND, { value: true });
        this.message = {
            identifiers: opts.identifiers,
            transactional_message_id: opts.transactional_message_id,
            ...(0, utils_1.pickDefined)(opts, WHATSAPP_OPTIONAL_KEYS),
        };
    }
}
exports.SendWhatsAppRequest = SendWhatsAppRequest;
const INBOX_OPTIONAL_KEYS = [
    'disable_message_retention',
    'queue_draft',
    'message_data',
    'send_at',
    'language',
];
/**
 * Builder for a transactional inbox message request. Pass an instance to
 * {@link APIClient.sendInboxMessage}.
 */
class SendInboxMessageRequest {
    message;
    static [Symbol.hasInstance](instance) {
        return typeof instance === 'object' && instance !== null && instance[SEND_INBOX_MESSAGE_BRAND] === true;
    }
    constructor(opts) {
        Object.defineProperty(this, SEND_INBOX_MESSAGE_BRAND, { value: true });
        this.message = {
            identifiers: opts.identifiers,
            transactional_message_id: opts.transactional_message_id,
            ...(0, utils_1.pickDefined)(opts, INBOX_OPTIONAL_KEYS),
        };
    }
}
exports.SendInboxMessageRequest = SendInboxMessageRequest;
const IN_APP_OPTIONAL_KEYS = [
    'disable_message_retention',
    'queue_draft',
    'message_data',
    'send_at',
    'language',
];
/**
 * Builder for a transactional in-app message request. Pass an instance to
 * {@link APIClient.sendInApp}.
 */
class SendInAppRequest {
    message;
    static [Symbol.hasInstance](instance) {
        return typeof instance === 'object' && instance !== null && instance[SEND_IN_APP_BRAND] === true;
    }
    constructor(opts) {
        Object.defineProperty(this, SEND_IN_APP_BRAND, { value: true });
        this.message = {
            identifiers: opts.identifiers,
            transactional_message_id: opts.transactional_message_id,
            ...(0, utils_1.pickDefined)(opts, IN_APP_OPTIONAL_KEYS),
        };
    }
}
exports.SendInAppRequest = SendInAppRequest;
