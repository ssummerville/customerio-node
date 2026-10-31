export type Identifiers = {
    id: string | number;
} | {
    email: string;
};
export type SendEmailRequestRequiredOptions = {
    to: string;
    identifiers: Identifiers;
};
export type SendEmailRequestOptionalOptions = Partial<{
    message_data: Record<string, any>;
    headers: Record<string, any>;
    preheader: string;
    reply_to: string;
    cc: string;
    bcc: string;
    body: string;
    body_plain: string;
    body_amp: string;
    fake_bcc: boolean;
    disable_message_retention: boolean;
    send_to_unsubscribed: boolean;
    tracked: boolean;
    queue_draft: boolean;
    send_at: number;
    disable_css_preprocessing: boolean;
    language: string;
}>;
export type SendEmailRequestWithTemplate = SendEmailRequestRequiredOptions & SendEmailRequestOptionalOptions & {
    transactional_message_id: string | number;
};
export type SendEmailRequestWithoutTemplate = SendEmailRequestRequiredOptions & SendEmailRequestOptionalOptions & {
    body: string;
    subject: string;
    from: string;
};
export type SendEmailRequestOptions = SendEmailRequestWithTemplate | SendEmailRequestWithoutTemplate;
export type EmailMessage = Partial<SendEmailRequestWithTemplate & SendEmailRequestWithoutTemplate> & {
    attachments?: Record<string, string>;
};
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
export declare class SendEmailRequest {
    /** The fully-shaped message payload sent to the API. */
    message: EmailMessage;
    static [Symbol.hasInstance](instance: unknown): instance is SendEmailRequest;
    constructor(opts: SendEmailRequestOptions);
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
    attach(name: string, data: any, { encode }?: {
        encode?: boolean | undefined;
    }): void;
}
export type SendPushCustomPayload = {
    ios: Record<string, any>;
    android: Record<string, any>;
};
export type SendPushRequestRequiredOptions = {
    identifiers: Identifiers;
    transactional_message_id: string | number;
};
export type SendPushRequestOptionalOptions = Partial<{
    to: string;
    title: string;
    message: string;
    disable_message_retention: boolean;
    send_to_unsubscribed: boolean;
    queue_draft: boolean;
    message_data: Record<string, any>;
    send_at: number;
    language: string;
    image_url: string;
    link: string;
    sound: string;
    custom_data: Record<string, string>;
    device: Record<string, any>;
    custom_device: Record<string, any>;
}>;
export type SendPushRequestWithoutCustomPayload = SendPushRequestRequiredOptions & SendPushRequestOptionalOptions & {};
export type SendPushRequestWithCustomPayload = SendPushRequestRequiredOptions & SendPushRequestOptionalOptions & {
    custom_payload: SendPushCustomPayload;
};
export type SendPushRequestOptions = SendPushRequestWithoutCustomPayload | SendPushRequestWithCustomPayload;
export type PushMessage = Partial<Omit<SendPushRequestWithoutCustomPayload, 'device'> & Omit<SendPushRequestWithCustomPayload, 'device'>>;
/**
 * Builder for a transactional push notification request. Pass an instance to
 * {@link APIClient.sendPush}.
 *
 * Either supply a `transactional_message_id` to use a Customer.io template,
 * or include a `custom_payload` for a fully-custom message.
 */
export declare class SendPushRequest {
    message: PushMessage;
    static [Symbol.hasInstance](instance: unknown): instance is SendPushRequest;
    constructor(opts: SendPushRequestOptions);
}
export type SMSMessage = Partial<SendSMSRequestOptions>;
export type SendSMSRequestRequiredOptions = {
    identifiers: Identifiers;
    transactional_message_id: string | number;
};
export type SendSMSRequestOptionalOptions = Partial<{
    to: string;
    disable_message_retention: boolean;
    send_to_unsubscribed: boolean;
    queue_draft: boolean;
    message_data: Record<string, any>;
    send_at: number;
    language: string;
}>;
export type SendSMSRequestOptions = SendSMSRequestRequiredOptions & SendSMSRequestOptionalOptions & {};
/**
 * Builder for a transactional SMS request. Pass an instance to {@link APIClient.sendSMS}.
 */
export declare class SendSMSRequest {
    message: SMSMessage;
    static [Symbol.hasInstance](instance: unknown): instance is SendSMSRequest;
    constructor(opts: SendSMSRequestOptions);
}
export type WhatsAppMessage = Partial<SendWhatsAppRequestOptions>;
export type SendWhatsAppRequestRequiredOptions = {
    identifiers: Identifiers;
    transactional_message_id: string | number;
};
export type SendWhatsAppRequestOptionalOptions = Partial<{
    to: string;
    tracked: boolean;
    disable_message_retention: boolean;
    send_to_unsubscribed: boolean;
    queue_draft: boolean;
    message_data: Record<string, any>;
    send_at: number;
    language: string;
}>;
export type SendWhatsAppRequestOptions = SendWhatsAppRequestRequiredOptions & SendWhatsAppRequestOptionalOptions & {};
/**
 * Builder for a transactional WhatsApp request. Pass an instance to {@link APIClient.sendWhatsApp}.
 *
 * `to` and `from` are phone numbers in E.164 format. Both are optional here only
 * when the referenced `transactional_message_id` already defines them.
 */
export declare class SendWhatsAppRequest {
    message: WhatsAppMessage;
    static [Symbol.hasInstance](instance: unknown): instance is SendWhatsAppRequest;
    constructor(opts: SendWhatsAppRequestOptions);
}
export type InboxMessage = Partial<SendInboxMessageRequestOptions>;
export type SendInboxMessageRequestRequiredOptions = {
    identifiers: Identifiers;
    transactional_message_id: string | number;
};
export type SendInboxMessageRequestOptionalOptions = Partial<{
    disable_message_retention: boolean;
    queue_draft: boolean;
    message_data: Record<string, any>;
    send_at: number;
    language: string;
}>;
export type SendInboxMessageRequestOptions = SendInboxMessageRequestRequiredOptions & SendInboxMessageRequestOptionalOptions & {};
/**
 * Builder for a transactional inbox message request. Pass an instance to
 * {@link APIClient.sendInboxMessage}.
 */
export declare class SendInboxMessageRequest {
    message: InboxMessage;
    static [Symbol.hasInstance](instance: unknown): instance is SendInboxMessageRequest;
    constructor(opts: SendInboxMessageRequestOptions);
}
export type InAppMessage = Partial<SendInAppRequestOptions>;
export type SendInAppRequestRequiredOptions = {
    identifiers: Identifiers;
    transactional_message_id: string | number;
};
export type SendInAppRequestOptionalOptions = Partial<{
    disable_message_retention: boolean;
    queue_draft: boolean;
    message_data: Record<string, any>;
    send_at: number;
    language: string;
}>;
export type SendInAppRequestOptions = SendInAppRequestRequiredOptions & SendInAppRequestOptionalOptions & {};
/**
 * Builder for a transactional in-app message request. Pass an instance to
 * {@link APIClient.sendInApp}.
 */
export declare class SendInAppRequest {
    message: InAppMessage;
    static [Symbol.hasInstance](instance: unknown): instance is SendInAppRequest;
    constructor(opts: SendInAppRequestOptions);
}
