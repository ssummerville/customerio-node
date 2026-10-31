"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendInAppRequest = exports.SendInboxMessageRequest = exports.SendWhatsAppRequest = exports.SendSMSRequest = exports.SendPushRequest = exports.SendEmailRequest = exports.APIClient = exports.DeliveryExportMetric = void 0;
const request_1 = __importDefault(require("./request"));
const regions_1 = require("./regions");
const requests_1 = require("./api/requests");
const utils_1 = require("./utils");
const types_1 = require("./types");
/**
 * Accepted upload extensions mapped to their MIME type. Used to set the multipart
 * part's `Content-Type` client-side when the caller omits `contentType`: an untyped
 * `Blob` is serialized as `application/octet-stream`, which the Assets API rejects,
 * and the API's own extension fallback only runs when the part carries no type at all.
 */
const ASSET_CONTENT_TYPE_BY_EXTENSION = {
    bmp: 'image/bmp',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
};
/** Derive an accepted asset MIME type from a filename's extension, or `undefined` if unrecognized. */
const assetContentTypeForFilename = (filename) => {
    const dot = filename.lastIndexOf('.');
    if (dot < 0) {
        return undefined;
    }
    return ASSET_CONTENT_TYPE_BY_EXTENSION[filename.slice(dot + 1).toLowerCase()];
};
/**
 * Metric to scope a delivery export to. Pass via the `options.metric` field
 * of {@link APIClient.createDeliveriesExport}.
 */
var DeliveryExportMetric;
(function (DeliveryExportMetric) {
    DeliveryExportMetric["Created"] = "created";
    DeliveryExportMetric["Attempted"] = "attempted";
    DeliveryExportMetric["Sent"] = "sent";
    DeliveryExportMetric["Delivered"] = "delivered";
    DeliveryExportMetric["Opened"] = "opened";
    DeliveryExportMetric["Clicked"] = "clicked";
    DeliveryExportMetric["Converted"] = "converted";
    DeliveryExportMetric["Bounced"] = "bounced";
    DeliveryExportMetric["Spammed"] = "spammed";
    DeliveryExportMetric["Unsubscribed"] = "unsubscribed";
    DeliveryExportMetric["Dropped"] = "dropped";
    DeliveryExportMetric["Failed"] = "failed";
    DeliveryExportMetric["Undeliverable"] = "undeliverable";
})(DeliveryExportMetric || (exports.DeliveryExportMetric = DeliveryExportMetric = {}));
const BROADCASTS_ALLOWED_RECIPIENT_FIELDS = {
    ids: ['ids', 'id_ignore_missing'],
    emails: ['emails', 'email_ignore_missing', 'email_add_duplicates'],
    per_user_data: ['per_user_data', 'id_ignore_missing', 'email_ignore_missing', 'email_add_duplicates'],
    data_file_url: ['data_file_url', 'id_ignore_missing', 'email_ignore_missing', 'email_add_duplicates'],
};
const filterRecipientsDataForField = (recipients, field) => {
    return BROADCASTS_ALLOWED_RECIPIENT_FIELDS[field].reduce((obj, field) => {
        if (!!recipients[field]) {
            obj[field] = recipients[field];
        }
        return obj;
    }, {});
};
/**
 * Client for the Customer.io App API.
 *
 * Authenticates with a bearer App API key. Use this client to send
 * transactional messages, trigger broadcasts, look up customers, and
 * manage exports.
 *
 * Every method rejects with a {@link CustomerIORequestError} when the API
 * returns a non-2xx status.
 *
 * @example
 * ```ts
 * import { APIClient, RegionUS, SendEmailRequest } from 'customerio-node';
 *
 * const api = new APIClient(appKey, { region: RegionUS });
 * await api.sendEmail(new SendEmailRequest({
 *   to: 'a@example.com',
 *   identifiers: { email: 'a@example.com' },
 *   transactional_message_id: 'welcome',
 * }));
 * ```
 */
class APIClient {
    appKey;
    defaults;
    request;
    apiRoot;
    /**
     * @param appKey Your Customer.io App API bearer token.
     * @param defaults Optional overrides. Use `region` to select {@link RegionUS} or {@link RegionEU},
     *   `url` to point at a custom host, `timeout` (ms, default `10000`), or any other fetch
     *   {@link RequestDefaults} field — notably `dispatcher` (an undici `Agent` / `ProxyAgent`) for
     *   proxies, custom TLS, or connection keep-alive.
     * @throws If `region` is provided and is not a {@link Region} instance.
     */
    constructor(appKey, defaults = {}) {
        if (defaults.region && !(defaults.region instanceof regions_1.Region)) {
            throw new Error('region must be one of Regions.US or Regions.EU');
        }
        this.appKey = appKey;
        this.defaults = { ...defaults, region: defaults.region || regions_1.RegionUS };
        // `region`/`url` are SDK concerns (they select the host); strip them so the
        // transport receives only fetch init. `retry` is handled by `Request`.
        const { region: _region, url: _url, ...requestDefaults } = this.defaults;
        this.request = new request_1.default(this.appKey, requestDefaults);
        this.apiRoot = this.defaults.url ? this.defaults.url : this.defaults.region.apiUrl;
    }
    /**
     * Send a transactional email.
     *
     * @param req A constructed {@link SendEmailRequest} instance.
     * @returns The parsed JSON response body (includes delivery id).
     * @throws {Error} If `req` is not a {@link SendEmailRequest} instance.
     */
    sendEmail(req) {
        if (!(req instanceof requests_1.SendEmailRequest)) {
            throw new Error('"request" must be an instance of SendEmailRequest');
        }
        return this.request.post(`${this.apiRoot}/send/email`, req.message);
    }
    /**
     * Send a transactional push notification.
     *
     * @param req A constructed {@link SendPushRequest} instance.
     * @returns The parsed JSON response body.
     * @throws {Error} If `req` is not a {@link SendPushRequest} instance.
     */
    sendPush(req) {
        if (!(req instanceof requests_1.SendPushRequest)) {
            throw new Error('"request" must be an instance of SendPushRequest');
        }
        return this.request.post(`${this.apiRoot}/send/push`, req.message);
    }
    /**
     * Send a transactional SMS.
     *
     * @param req A constructed {@link SendSMSRequest} instance.
     * @returns The parsed JSON response body.
     * @throws {Error} If `req` is not a {@link SendSMSRequest} instance.
     */
    sendSMS(req) {
        if (!(req instanceof requests_1.SendSMSRequest)) {
            throw new Error('"request" must be an instance of SendSMSRequest');
        }
        return this.request.post(`${this.apiRoot}/send/sms`, req.message);
    }
    /**
     * Send a transactional WhatsApp message.
     *
     * @param req A constructed {@link SendWhatsAppRequest} instance.
     * @returns The parsed JSON response body.
     * @throws {Error} If `req` is not a {@link SendWhatsAppRequest} instance.
     */
    sendWhatsApp(req) {
        if (!(req instanceof requests_1.SendWhatsAppRequest)) {
            throw new Error('"request" must be an instance of SendWhatsAppRequest');
        }
        return this.request.post(`${this.apiRoot}/send/whatsapp`, req.message);
    }
    /**
     * Send a transactional inbox message.
     *
     * @param req A constructed {@link SendInboxMessageRequest} instance.
     * @returns The parsed JSON response body.
     * @throws {Error} If `req` is not a {@link SendInboxMessageRequest} instance.
     */
    sendInboxMessage(req) {
        if (!(req instanceof requests_1.SendInboxMessageRequest)) {
            throw new Error('"request" must be an instance of SendInboxMessageRequest');
        }
        return this.request.post(`${this.apiRoot}/send/inbox_message`, req.message);
    }
    /**
     * Send a transactional in-app message.
     *
     * @param req A constructed {@link SendInAppRequest} instance.
     * @returns The parsed JSON response body.
     * @throws {Error} If `req` is not a {@link SendInAppRequest} instance.
     */
    sendInApp(req) {
        if (!(req instanceof requests_1.SendInAppRequest)) {
            throw new Error('"request" must be an instance of SendInAppRequest');
        }
        return this.request.post(`${this.apiRoot}/send/in_app`, req.message);
    }
    /**
     * Look up all people in your workspace with a matching email address.
     *
     * @param email Full email address. Will be URL-encoded.
     * @returns The parsed JSON response body (`{ results: [...] }`).
     * @throws {Error} If `email` is not a non-empty string.
     */
    getCustomersByEmail(email) {
        if (typeof email !== 'string' || (0, utils_1.isEmpty)(email)) {
            throw new Error('"email" must be a string');
        }
        return this.request.get(`${this.apiRoot}/customers?email=${encodeURIComponent(email)}`);
    }
    /**
     * Trigger an API-triggered broadcast (campaign).
     *
     * `recipients` may contain one of the special fields `ids`, `emails`,
     * `per_user_data`, or `data_file_url` (with associated `*_ignore_missing` /
     * `email_add_duplicates` flags); when present, that field's allowed
     * companions are forwarded and any other recipients fields are ignored.
     * Otherwise the entire `recipients` object is forwarded verbatim alongside
     * `data` (use this for segment-based recipients).
     *
     * Both `data` and `recipients` are optional; omitting `recipients` sends the
     * broadcast to its configured recipients.
     *
     * Note that the parameters are positional: to pass `recipients` without
     * `data`, pass `undefined` for `data` — e.g.
     * `triggerBroadcast(1, undefined, { emails: ['user@example.com'] })`.
     * Passing the recipient selector as the second argument would send it as
     * liquid `data` and trigger the broadcast's configured recipients instead.
     *
     * @param broadcastId The broadcast (campaign) id.
     * @param data Liquid `data` payload made available to the broadcast template.
     * @param recipients Recipient selector. See above.
     * @returns The parsed JSON response body.
     */
    triggerBroadcast(broadcastId, data, recipients) {
        let payload = {};
        if (data != null && Object.keys(data).length > 0) {
            payload.data = data;
        }
        if (recipients != null && Object.keys(recipients).length > 0) {
            let customRecipientField = Object.keys(BROADCASTS_ALLOWED_RECIPIENT_FIELDS).find((field) => recipients[field]);
            if (customRecipientField) {
                payload = Object.assign(payload, filterRecipientsDataForField(recipients, customRecipientField));
            }
            else {
                payload.recipients = recipients;
            }
        }
        return this.request.post(`${this.apiRoot}/campaigns/${encodeURIComponent(broadcastId)}/triggers`, payload);
    }
    /**
     * List all exports in your workspace.
     *
     * @returns The parsed JSON response body (`{ exports: [...] }`).
     */
    listExports() {
        return this.request.get(`${this.apiRoot}/exports`);
    }
    /**
     * Get metadata for a specific export, including its status.
     *
     * @param id The export id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `id` is empty.
     */
    getExport(id) {
        if ((0, utils_1.isEmpty)(id)) {
            throw new utils_1.MissingParamError('id');
        }
        return this.request.get(`${this.apiRoot}/exports/${encodeURIComponent(id)}`);
    }
    /**
     * Get a time-limited download URL for an export.
     *
     * Only meaningful once {@link APIClient.getExport} reports the export as ready.
     *
     * @param id The export id.
     * @returns The parsed JSON response body (`{ url: "..." }`).
     * @throws {MissingParamError} If `id` is empty.
     */
    downloadExport(id) {
        if ((0, utils_1.isEmpty)(id)) {
            throw new utils_1.MissingParamError('id');
        }
        return this.request.get(`${this.apiRoot}/exports/${encodeURIComponent(id)}/download`);
    }
    /**
     * Start an export of people matching a filter.
     *
     * @param filters Filter expression (segment / attribute / and / or / not).
     * @returns The parsed JSON response body, including the new export's id.
     * @throws {MissingParamError} If `filters` is `null` or `undefined`.
     */
    createCustomersExport(filters) {
        if (filters == null) {
            throw new utils_1.MissingParamError('filters');
        }
        return this.request.post(`${this.apiRoot}/exports/customers`, { filters });
    }
    /**
     * Start an export of delivery telemetry for a given newsletter.
     *
     * @param newsletterId The newsletter id whose deliveries should be exported.
     * @param options Optional filters — see {@link DeliveryExportRequestOptions}.
     * @returns The parsed JSON response body, including the new export's id.
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    createDeliveriesExport(newsletterId, options) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        return this.request.post(`${this.apiRoot}/exports/deliveries`, { newsletter_id: newsletterId, ...options });
    }
    /**
     * Get a person's attributes by identifier.
     *
     * @param id The person's identifier value.
     * @param idType Which identifier kind to look up by. Defaults to {@link IdentifierType.Id}.
     * @returns The parsed JSON response body (`{ customer: {...} }`).
     * @throws {MissingParamError} If `id` is empty.
     * @throws {Error} If `idType` is not a valid {@link IdentifierType}.
     */
    getAttributes(id, idType = types_1.IdentifierType.Id) {
        if ((0, utils_1.isEmpty)(id)) {
            throw new utils_1.MissingParamError('id');
        }
        if (!(0, utils_1.isIdentifierType)(idType)) {
            throw new Error('idType must be one of "id", "cio_id", or "email"');
        }
        return this.request.get(`${this.apiRoot}/customers/${encodeURIComponent(id)}/attributes?id_type=${idType}`);
    }
    /**
     * Look up a person's activities (events, attribute changes, message activity, …).
     *
     * @param customerId The person's identifier value.
     * @param options Optional filters/pagination. See {@link CustomerActivitiesOptions}.
     * @returns The parsed JSON response body (`{ activities: [...], next }`).
     * @throws {MissingParamError} If `customerId` is empty.
     * @throws {Error} If `options.idType` is provided and is not a valid {@link IdentifierType}.
     */
    getCustomerActivities(customerId, options = {}) {
        if ((0, utils_1.isEmpty)(customerId)) {
            throw new utils_1.MissingParamError('customerId');
        }
        if (options.idType !== undefined && !(0, utils_1.isIdentifierType)(options.idType)) {
            throw new Error('idType must be one of "id", "cio_id", or "email"');
        }
        const query = (0, utils_1.buildQueryString)({
            id_type: options.idType,
            start: options.start,
            limit: options.limit,
            type: options.type,
            name: options.name,
        });
        return this.request.get(`${this.apiRoot}/customers/${encodeURIComponent(customerId)}/activities${query}`);
    }
    /**
     * Look up messages sent to a person.
     *
     * @param customerId The person's identifier value.
     * @param options Optional filters/pagination. See {@link CustomerMessagesOptions}.
     * @returns The parsed JSON response body (`{ messages: [...], next }`).
     * @throws {MissingParamError} If `customerId` is empty.
     * @throws {Error} If `options.idType` is provided and is not a valid {@link IdentifierType}.
     */
    getCustomerMessages(customerId, options = {}) {
        if ((0, utils_1.isEmpty)(customerId)) {
            throw new utils_1.MissingParamError('customerId');
        }
        if (options.idType !== undefined && !(0, utils_1.isIdentifierType)(options.idType)) {
            throw new Error('idType must be one of "id", "cio_id", or "email"');
        }
        const query = (0, utils_1.buildQueryString)({
            id_type: options.idType,
            start: options.start,
            limit: options.limit,
            start_ts: options.start_ts,
            end_ts: options.end_ts,
        });
        return this.request.get(`${this.apiRoot}/customers/${encodeURIComponent(customerId)}/messages${query}`);
    }
    /**
     * Look up a person's relationships to objects.
     *
     * @param customerId The person's identifier value.
     * @param options Optional pagination. See {@link PaginationOptions}.
     * @returns The parsed JSON response body (`{ identifiers: [...], relationships: [...], next }`).
     * @throws {MissingParamError} If `customerId` is empty.
     */
    getCustomerRelationships(customerId, options = {}) {
        if ((0, utils_1.isEmpty)(customerId)) {
            throw new utils_1.MissingParamError('customerId');
        }
        const query = (0, utils_1.buildQueryString)({ start: options.start, limit: options.limit });
        return this.request.get(`${this.apiRoot}/customers/${encodeURIComponent(customerId)}/relationships${query}`);
    }
    /**
     * Look up the segments a person belongs to.
     *
     * @param customerId The person's identifier value.
     * @param idType Which identifier kind `customerId` is. Defaults to {@link IdentifierType.Id}.
     * @returns The parsed JSON response body (`{ segments: [...] }`).
     * @throws {MissingParamError} If `customerId` is empty.
     * @throws {Error} If `idType` is not a valid {@link IdentifierType}.
     */
    getCustomerSegments(customerId, idType = types_1.IdentifierType.Id) {
        if ((0, utils_1.isEmpty)(customerId)) {
            throw new utils_1.MissingParamError('customerId');
        }
        if (!(0, utils_1.isIdentifierType)(idType)) {
            throw new Error('idType must be one of "id", "cio_id", or "email"');
        }
        const query = (0, utils_1.buildQueryString)({ id_type: idType });
        return this.request.get(`${this.apiRoot}/customers/${encodeURIComponent(customerId)}/segments${query}`);
    }
    /**
     * Look up a person's subscription (topic) preferences.
     *
     * @param customerId The person's identifier value.
     * @param options Optional identifier kind and localization. See {@link CustomerSubscriptionPreferencesOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `customerId` is empty.
     * @throws {Error} If `options.idType` is provided and is not a valid {@link IdentifierType}.
     */
    getCustomerSubscriptionPreferences(customerId, options = {}) {
        if ((0, utils_1.isEmpty)(customerId)) {
            throw new utils_1.MissingParamError('customerId');
        }
        if (options.idType !== undefined && !(0, utils_1.isIdentifierType)(options.idType)) {
            throw new Error('idType must be one of "id", "cio_id", or "email"');
        }
        const query = (0, utils_1.buildQueryString)({ id_type: options.idType, language: options.language });
        return this.request.get(`${this.apiRoot}/customers/${encodeURIComponent(customerId)}/subscription_preferences${query}`);
    }
    /**
     * Search for people matching a filter.
     *
     * @param filter A segment/attribute filter expression (and/or/not). See {@link Filter}.
     * @param options Optional pagination. See {@link PaginationOptions}.
     * @returns The parsed JSON response body (`{ identifiers: [...], ids: [...], next }`).
     * @throws {MissingParamError} If `filter` is `null` or `undefined`.
     */
    searchCustomers(filter, options = {}) {
        if (filter == null) {
            throw new utils_1.MissingParamError('filter');
        }
        const query = (0, utils_1.buildQueryString)({ start: options.start, limit: options.limit });
        return this.request.post(`${this.apiRoot}/customers${query}`, { filter });
    }
    /**
     * Look up attributes and devices for a set of people in one request.
     *
     * @param ids The identifiers of the people to look up (non-empty).
     * @returns The parsed JSON response body (`{ customers: [...] }`).
     * @throws {MissingParamError} If `ids` is not a non-empty array.
     */
    getCustomersAttributes(ids) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new utils_1.MissingParamError('ids');
        }
        return this.request.post(`${this.apiRoot}/customers/attributes`, { ids });
    }
    /**
     * Get an object's attributes.
     *
     * @param objectTypeId The object type's numeric id.
     * @param objectId The object's identifier value.
     * @param idType Which identifier kind `objectId` is (`object_id` or `cio_object_id`).
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `objectTypeId` or `objectId` is empty.
     */
    getObjectAttributes(objectTypeId, objectId, idType) {
        if ((0, utils_1.isEmpty)(objectTypeId)) {
            throw new utils_1.MissingParamError('objectTypeId');
        }
        if ((0, utils_1.isEmpty)(objectId)) {
            throw new utils_1.MissingParamError('objectId');
        }
        if (idType !== undefined && !(0, utils_1.isObjectIdType)(idType)) {
            throw new Error('idType must be one of "object_id" or "cio_object_id"');
        }
        const query = (0, utils_1.buildQueryString)({ id_type: idType });
        return this.request.get(`${this.apiRoot}/objects/${encodeURIComponent(objectTypeId)}/${encodeURIComponent(objectId)}/attributes${query}`);
    }
    /**
     * Get an object's relationships to people.
     *
     * @param objectTypeId The object type's numeric id.
     * @param objectId The object's identifier value.
     * @param options Optional identifier kind and pagination. See {@link ObjectRelationshipsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `objectTypeId` or `objectId` is empty.
     */
    getObjectRelationships(objectTypeId, objectId, options = {}) {
        if ((0, utils_1.isEmpty)(objectTypeId)) {
            throw new utils_1.MissingParamError('objectTypeId');
        }
        if ((0, utils_1.isEmpty)(objectId)) {
            throw new utils_1.MissingParamError('objectId');
        }
        if (options.idType !== undefined && !(0, utils_1.isObjectIdType)(options.idType)) {
            throw new Error('idType must be one of "object_id" or "cio_object_id"');
        }
        const query = (0, utils_1.buildQueryString)({ id_type: options.idType, start: options.start, limit: options.limit });
        return this.request.get(`${this.apiRoot}/objects/${encodeURIComponent(objectTypeId)}/${encodeURIComponent(objectId)}/relationships${query}`);
    }
    /**
     * Find objects of a given type matching a filter.
     *
     * @param objectTypeId The object type's numeric id.
     * @param filter An {@link ObjectFilter} expression — `object_attribute` leaf
     *   conditions composed with `and` / `or` / `not`.
     * @param options Optional pagination. See {@link PaginationOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `objectTypeId` is empty or `filter` is `null`/`undefined`.
     */
    findObjects(objectTypeId, filter, options = {}) {
        if ((0, utils_1.isEmpty)(objectTypeId)) {
            throw new utils_1.MissingParamError('objectTypeId');
        }
        if (filter == null) {
            throw new utils_1.MissingParamError('filter');
        }
        const query = (0, utils_1.buildQueryString)({ start: options.start, limit: options.limit });
        return this.request.post(`${this.apiRoot}/objects${query}`, { object_type_id: objectTypeId, filter });
    }
    /**
     * List the object types defined in your workspace.
     *
     * @returns The parsed JSON response body (`{ types: [...] }`).
     */
    listObjectTypes() {
        return this.request.get(`${this.apiRoot}/object_types`);
    }
    /**
     * List activities across your workspace.
     *
     * @param options Optional filters/pagination. See {@link ListActivitiesOptions}.
     * @returns The parsed JSON response body (`{ activities: [...], next }`).
     * @throws {Error} If `options.idType` is provided and is not a valid {@link IdentifierType}.
     */
    listActivities(options = {}) {
        if (options.idType !== undefined && !(0, utils_1.isIdentifierType)(options.idType)) {
            throw new Error('idType must be one of "id", "cio_id", or "email"');
        }
        const query = (0, utils_1.buildQueryString)({
            start: options.start,
            limit: options.limit,
            type: options.type,
            name: options.name,
            deleted: options.deleted,
            customer_id: options.customerId,
            id_type: options.idType,
        });
        return this.request.get(`${this.apiRoot}/activities${query}`);
    }
    /**
     * List the segments in your workspace.
     *
     * @returns The parsed JSON response body (`{ segments: [...] }`).
     */
    listSegments() {
        return this.request.get(`${this.apiRoot}/segments`);
    }
    /**
     * Create a manual segment.
     *
     * @param segment The segment definition. `name` is required. See {@link SegmentInput}.
     * @returns The parsed JSON response body (`{ segment: {...} }`).
     * @throws {MissingParamError} If `segment` is missing/not an object, or `segment.name` is empty.
     */
    createSegment(segment) {
        if (segment == null || typeof segment !== 'object') {
            throw new utils_1.MissingParamError('segment');
        }
        if ((0, utils_1.isEmpty)(segment.name)) {
            throw new utils_1.MissingParamError('segment.name');
        }
        return this.request.post(`${this.apiRoot}/segments`, { segment });
    }
    /**
     * Get a single segment's metadata.
     *
     * @param segmentId The segment's numeric id.
     * @returns The parsed JSON response body (`{ segment: {...} }`).
     * @throws {MissingParamError} If `segmentId` is empty.
     */
    getSegment(segmentId) {
        if ((0, utils_1.isEmpty)(segmentId)) {
            throw new utils_1.MissingParamError('segmentId');
        }
        return this.request.get(`${this.apiRoot}/segments/${encodeURIComponent(segmentId)}`);
    }
    /**
     * Delete a manual segment.
     *
     * @param segmentId The segment's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `segmentId` is empty.
     */
    deleteSegment(segmentId) {
        if ((0, utils_1.isEmpty)(segmentId)) {
            throw new utils_1.MissingParamError('segmentId');
        }
        return this.request.destroy(`${this.apiRoot}/segments/${encodeURIComponent(segmentId)}`);
    }
    /**
     * Get the number of people in a segment.
     *
     * @param segmentId The segment's numeric id.
     * @returns The parsed JSON response body (`{ count, ... }`).
     * @throws {MissingParamError} If `segmentId` is empty.
     */
    getSegmentCustomerCount(segmentId) {
        if ((0, utils_1.isEmpty)(segmentId)) {
            throw new utils_1.MissingParamError('segmentId');
        }
        return this.request.get(`${this.apiRoot}/segments/${encodeURIComponent(segmentId)}/customer_count`);
    }
    /**
     * List the people who belong to a segment.
     *
     * @param segmentId The segment's numeric id.
     * @param options Optional pagination. See {@link PaginationOptions}.
     * @returns The parsed JSON response body (`{ ids: [...], identifiers: [...], next }`).
     * @throws {MissingParamError} If `segmentId` is empty.
     */
    getSegmentMembership(segmentId, options = {}) {
        if ((0, utils_1.isEmpty)(segmentId)) {
            throw new utils_1.MissingParamError('segmentId');
        }
        const query = (0, utils_1.buildQueryString)({ start: options.start, limit: options.limit });
        return this.request.get(`${this.apiRoot}/segments/${encodeURIComponent(segmentId)}/membership${query}`);
    }
    /**
     * Get the campaigns, newsletters, and other resources that use a segment.
     *
     * @param segmentId The segment's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `segmentId` is empty.
     */
    getSegmentUsedBy(segmentId) {
        if ((0, utils_1.isEmpty)(segmentId)) {
            throw new utils_1.MissingParamError('segmentId');
        }
        return this.request.get(`${this.apiRoot}/segments/${encodeURIComponent(segmentId)}/used_by`);
    }
    /**
     * List the subscription topics defined in your workspace.
     *
     * @returns The parsed JSON response body (`{ topics: [...] }`).
     */
    listSubscriptionTopics() {
        return this.request.get(`${this.apiRoot}/subscription_topics`);
    }
    /**
     * List the subscription channels configured in your workspace.
     *
     * @returns The parsed JSON response body.
     */
    listSubscriptionChannels() {
        return this.request.get(`${this.apiRoot}/subscription_channels`);
    }
    /**
     * Generate a subscription center token for a person. The token authenticates
     * a hosted subscription-center link so the person can manage their preferences.
     *
     * @param customerId The person's identifier value.
     * @returns The parsed JSON response body (`{ token }`).
     * @throws {MissingParamError} If `customerId` is empty.
     */
    getSubscriptionCenterToken(customerId) {
        if ((0, utils_1.isEmpty)(customerId)) {
            throw new utils_1.MissingParamError('customerId');
        }
        return this.request.get(`${this.apiRoot}/subscription_center/${encodeURIComponent(customerId)}/token`);
    }
    /**
     * List the transactional messages in your workspace.
     *
     * @returns The parsed JSON response body.
     */
    listTransactionalMessages() {
        return this.request.get(`${this.apiRoot}/transactional`);
    }
    /**
     * Get a single transactional message's metadata.
     *
     * @param transactionalId The transactional message's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `transactionalId` is empty.
     */
    getTransactionalMessage(transactionalId) {
        if ((0, utils_1.isEmpty)(transactionalId)) {
            throw new utils_1.MissingParamError('transactionalId');
        }
        return this.request.get(`${this.apiRoot}/transactional/${encodeURIComponent(transactionalId)}`);
    }
    /**
     * List all content variants of a transactional message.
     *
     * @param transactionalId The transactional message's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `transactionalId` is empty.
     */
    getTransactionalMessageContents(transactionalId) {
        if ((0, utils_1.isEmpty)(transactionalId)) {
            throw new utils_1.MissingParamError('transactionalId');
        }
        return this.request.get(`${this.apiRoot}/transactional/${encodeURIComponent(transactionalId)}/contents`);
    }
    /**
     * Get a single-language translation of a transactional message.
     *
     * @param transactionalId The transactional message's numeric id.
     * @param language The IETF language tag of the translation.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `transactionalId` or `language` is empty.
     */
    getTransactionalMessageLanguage(transactionalId, language) {
        if ((0, utils_1.isEmpty)(transactionalId)) {
            throw new utils_1.MissingParamError('transactionalId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.get(`${this.apiRoot}/transactional/${encodeURIComponent(transactionalId)}/language/${encodeURIComponent(language)}`);
    }
    /**
     * Update a single-language translation of a transactional message.
     *
     * @param transactionalId The transactional message's numeric id.
     * @param language The IETF language tag of the translation.
     * @param data The translation fields to update.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `transactionalId` or `language` is empty.
     */
    updateTransactionalMessageLanguage(transactionalId, language, data = {}) {
        if ((0, utils_1.isEmpty)(transactionalId)) {
            throw new utils_1.MissingParamError('transactionalId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.put(`${this.apiRoot}/transactional/${encodeURIComponent(transactionalId)}/language/${encodeURIComponent(language)}`, data);
    }
    /**
     * Get the individual deliveries (sends) of a transactional message.
     *
     * @param transactionalId The transactional message's numeric id.
     * @param options Optional filters/pagination. See {@link TransactionalDeliveriesOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `transactionalId` is empty.
     */
    getTransactionalMessageDeliveries(transactionalId, options = {}) {
        if ((0, utils_1.isEmpty)(transactionalId)) {
            throw new utils_1.MissingParamError('transactionalId');
        }
        const query = (0, utils_1.buildQueryString)({
            start: options.start,
            limit: options.limit,
            metric: options.metric,
            start_ts: options.start_ts,
            end_ts: options.end_ts,
            get_tracked_responses: options.get_tracked_responses,
        });
        return this.request.get(`${this.apiRoot}/transactional/${encodeURIComponent(transactionalId)}/messages${query}`);
    }
    /**
     * Get delivery metrics for a transactional message over time.
     *
     * @param transactionalId The transactional message's numeric id.
     * @param options Optional reporting window. See {@link TransactionalMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `transactionalId` is empty.
     */
    getTransactionalMessageMetrics(transactionalId, options = {}) {
        if ((0, utils_1.isEmpty)(transactionalId)) {
            throw new utils_1.MissingParamError('transactionalId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps });
        return this.request.get(`${this.apiRoot}/transactional/${encodeURIComponent(transactionalId)}/metrics${query}`);
    }
    /**
     * Get link (click) metrics for a transactional message over time.
     *
     * @param transactionalId The transactional message's numeric id.
     * @param options Optional reporting window. See {@link TransactionalLinkMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `transactionalId` is empty.
     */
    getTransactionalMessageLinkMetrics(transactionalId, options = {}) {
        if ((0, utils_1.isEmpty)(transactionalId)) {
            throw new utils_1.MissingParamError('transactionalId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps, unique: options.unique });
        return this.request.get(`${this.apiRoot}/transactional/${encodeURIComponent(transactionalId)}/metrics/links${query}`);
    }
    /**
     * Update a transactional message's content variant.
     *
     * @param transactionalId The transactional message's numeric id.
     * @param contentId The content variant's numeric id.
     * @param data The content fields to update.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `transactionalId` or `contentId` is empty.
     */
    updateTransactionalMessageContent(transactionalId, contentId, data = {}) {
        if ((0, utils_1.isEmpty)(transactionalId)) {
            throw new utils_1.MissingParamError('transactionalId');
        }
        if ((0, utils_1.isEmpty)(contentId)) {
            throw new utils_1.MissingParamError('contentId');
        }
        return this.request.put(`${this.apiRoot}/transactional/${encodeURIComponent(transactionalId)}/content/${encodeURIComponent(contentId)}`, data);
    }
    /**
     * Build the base URL for a campaign/broadcast resource. Shared by the
     * campaign and broadcast methods, which have identical sub-resource paths.
     */
    resourceBase(resource, id) {
        return `${this.apiRoot}/${resource}/${encodeURIComponent(id)}`;
    }
    /**
     * List the campaigns in your workspace.
     *
     * @returns The parsed JSON response body (`{ campaigns: [...] }`).
     */
    listCampaigns() {
        return this.request.get(`${this.apiRoot}/campaigns`);
    }
    /**
     * Get a single campaign's metadata.
     *
     * @param campaignId The campaign's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `campaignId` is empty.
     */
    getCampaign(campaignId) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        return this.request.get(this.resourceBase('campaigns', campaignId));
    }
    /**
     * List a campaign's actions.
     *
     * @param campaignId The campaign's numeric id.
     * @param options Optional pagination cursor (`start`).
     * @returns The parsed JSON response body (`{ actions: [...], next }`).
     * @throws {MissingParamError} If `campaignId` is empty.
     */
    getCampaignActions(campaignId, options = {}) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        const query = (0, utils_1.buildQueryString)({ start: options.start });
        return this.request.get(`${this.resourceBase('campaigns', campaignId)}/actions${query}`);
    }
    /**
     * Get a single action of a campaign.
     *
     * @param campaignId The campaign's numeric id.
     * @param actionId The action's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `campaignId` or `actionId` is empty.
     */
    getCampaignAction(campaignId, actionId) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        return this.request.get(`${this.resourceBase('campaigns', campaignId)}/actions/${encodeURIComponent(actionId)}`);
    }
    /**
     * Update an action of a campaign (e.g. its message content).
     *
     * @param campaignId The campaign's numeric id.
     * @param actionId The action's numeric id.
     * @param data The action fields to update.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `campaignId` or `actionId` is empty.
     */
    updateCampaignAction(campaignId, actionId, data = {}) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        return this.request.put(`${this.resourceBase('campaigns', campaignId)}/actions/${encodeURIComponent(actionId)}`, data);
    }
    /**
     * Get a single-language translation of a campaign action.
     *
     * @param campaignId The campaign's numeric id.
     * @param actionId The action's numeric id.
     * @param language The IETF language tag.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `campaignId`, `actionId`, or `language` is empty.
     */
    getCampaignActionLanguage(campaignId, actionId, language) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.get(`${this.resourceBase('campaigns', campaignId)}/actions/${encodeURIComponent(actionId)}/language/${encodeURIComponent(language)}`);
    }
    /**
     * Update a single-language translation of a campaign action.
     *
     * @param campaignId The campaign's numeric id.
     * @param actionId The action's numeric id.
     * @param language The IETF language tag.
     * @param data The translation fields to update.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `campaignId`, `actionId`, or `language` is empty.
     */
    updateCampaignActionLanguage(campaignId, actionId, language, data = {}) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.put(`${this.resourceBase('campaigns', campaignId)}/actions/${encodeURIComponent(actionId)}/language/${encodeURIComponent(language)}`, data);
    }
    /**
     * Get metrics for a single campaign action over time. Aggregated across all
     * channels (the API does not accept a `type` filter here).
     *
     * @param campaignId The campaign's numeric id.
     * @param actionId The action's numeric id.
     * @param options Optional reporting window/version. See {@link CampaignActionMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `campaignId` or `actionId` is empty.
     */
    getCampaignActionMetrics(campaignId, actionId, options = {}) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        const query = (0, utils_1.buildQueryString)({
            version: options.version,
            res: options.res,
            tz: options.tz,
            start: options.start,
            end: options.end,
            period: options.period,
            steps: options.steps,
        });
        return this.request.get(`${this.resourceBase('campaigns', campaignId)}/actions/${encodeURIComponent(actionId)}/metrics${query}`);
    }
    /**
     * Get link (click) metrics for a single campaign action over time.
     *
     * @param campaignId The campaign's numeric id.
     * @param actionId The action's numeric id.
     * @param options Optional reporting window. See {@link LinkMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `campaignId` or `actionId` is empty.
     */
    getCampaignActionMetricsLinks(campaignId, actionId, options = {}) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps, unique: options.unique });
        return this.request.get(`${this.resourceBase('campaigns', campaignId)}/actions/${encodeURIComponent(actionId)}/metrics/links${query}`);
    }
    /**
     * Get delivery metrics for a campaign over time.
     *
     * @param campaignId The campaign's numeric id.
     * @param options Optional reporting window/filters. See {@link CampaignMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `campaignId` is empty.
     */
    getCampaignMetrics(campaignId, options = {}) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        const query = (0, utils_1.buildQueryString)({
            version: options.version,
            type: options.type,
            res: options.res,
            tz: options.tz,
            start: options.start,
            end: options.end,
            period: options.period,
            steps: options.steps,
        });
        return this.request.get(`${this.resourceBase('campaigns', campaignId)}/metrics${query}`);
    }
    /**
     * Get link (click) metrics for a campaign over time.
     *
     * @param campaignId The campaign's numeric id.
     * @param options Optional reporting window. See {@link LinkMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `campaignId` is empty.
     */
    getCampaignMetricsLinks(campaignId, options = {}) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps, unique: options.unique });
        return this.request.get(`${this.resourceBase('campaigns', campaignId)}/metrics/links${query}`);
    }
    /**
     * Get a campaign's journey metrics (per-step conversion funnel) over a window.
     *
     * @param campaignId The campaign's numeric id.
     * @param options Required window and resolution. See {@link JourneyMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `campaignId`, `options.start`, `options.end`, or `options.res` is empty.
     */
    getCampaignJourneyMetrics(campaignId, options) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        if (options == null || (0, utils_1.isEmpty)(options.start)) {
            throw new utils_1.MissingParamError('options.start');
        }
        if ((0, utils_1.isEmpty)(options.end)) {
            throw new utils_1.MissingParamError('options.end');
        }
        if ((0, utils_1.isEmpty)(options.res)) {
            throw new utils_1.MissingParamError('options.res');
        }
        const query = (0, utils_1.buildQueryString)({ start: options.start, end: options.end, resolution: options.res });
        return this.request.get(`${this.resourceBase('campaigns', campaignId)}/journey_metrics${query}`);
    }
    /**
     * Get the individual messages (deliveries) sent by a campaign.
     *
     * @param campaignId The campaign's numeric id.
     * @param options Optional filters/pagination. See {@link CampaignMessagesOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `campaignId` is empty.
     */
    getCampaignMessages(campaignId, options = {}) {
        if ((0, utils_1.isEmpty)(campaignId)) {
            throw new utils_1.MissingParamError('campaignId');
        }
        const query = (0, utils_1.buildQueryString)({
            start: options.start,
            limit: options.limit,
            type: options.type,
            metric: options.metric,
            drafts: options.drafts,
            start_ts: options.start_ts,
            end_ts: options.end_ts,
            get_tracked_responses: options.get_tracked_responses,
        });
        return this.request.get(`${this.resourceBase('campaigns', campaignId)}/messages${query}`);
    }
    /**
     * Get the status of an API-triggered broadcast run. Pairs with {@link APIClient.triggerBroadcast}.
     *
     * @param broadcastId The broadcast (campaign) id.
     * @param triggerId The trigger id returned by `triggerBroadcast`.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId` or `triggerId` is empty.
     */
    getBroadcastTriggerStatus(broadcastId, triggerId) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        if ((0, utils_1.isEmpty)(triggerId)) {
            throw new utils_1.MissingParamError('triggerId');
        }
        return this.request.get(`${this.apiRoot}/campaigns/${encodeURIComponent(broadcastId)}/triggers/${encodeURIComponent(triggerId)}`);
    }
    /**
     * Get the per-recipient errors for an API-triggered broadcast run.
     *
     * @param broadcastId The broadcast (campaign) id.
     * @param triggerId The trigger id returned by `triggerBroadcast`.
     * @param options Optional pagination. See {@link PaginationOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId` or `triggerId` is empty.
     */
    getBroadcastTriggerErrors(broadcastId, triggerId, options = {}) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        if ((0, utils_1.isEmpty)(triggerId)) {
            throw new utils_1.MissingParamError('triggerId');
        }
        const query = (0, utils_1.buildQueryString)({ start: options.start, limit: options.limit });
        return this.request.get(`${this.apiRoot}/campaigns/${encodeURIComponent(broadcastId)}/triggers/${encodeURIComponent(triggerId)}/errors${query}`);
    }
    /**
     * List the broadcasts in your workspace.
     *
     * @returns The parsed JSON response body (`{ broadcasts: [...] }`).
     */
    listBroadcasts() {
        return this.request.get(`${this.apiRoot}/broadcasts`);
    }
    /**
     * Get a single broadcast's metadata.
     *
     * @param broadcastId The broadcast's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId` is empty.
     */
    getBroadcast(broadcastId) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        return this.request.get(this.resourceBase('broadcasts', broadcastId));
    }
    /**
     * List a broadcast's actions.
     *
     * @param broadcastId The broadcast's numeric id.
     * @returns The parsed JSON response body (`{ actions: [...] }`).
     * @throws {MissingParamError} If `broadcastId` is empty.
     */
    getBroadcastActions(broadcastId) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        return this.request.get(`${this.resourceBase('broadcasts', broadcastId)}/actions`);
    }
    /**
     * Get a single action of a broadcast.
     *
     * @param broadcastId The broadcast's numeric id.
     * @param actionId The action's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId` or `actionId` is empty.
     */
    getBroadcastAction(broadcastId, actionId) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        return this.request.get(`${this.resourceBase('broadcasts', broadcastId)}/actions/${encodeURIComponent(actionId)}`);
    }
    /**
     * Update an action of a broadcast (e.g. its message content).
     *
     * @param broadcastId The broadcast's numeric id.
     * @param actionId The action's numeric id.
     * @param data The action fields to update.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId` or `actionId` is empty.
     */
    updateBroadcastAction(broadcastId, actionId, data = {}) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        return this.request.put(`${this.resourceBase('broadcasts', broadcastId)}/actions/${encodeURIComponent(actionId)}`, data);
    }
    /**
     * Get a single-language translation of a broadcast action.
     *
     * @param broadcastId The broadcast's numeric id.
     * @param actionId The action's numeric id.
     * @param language The IETF language tag.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId`, `actionId`, or `language` is empty.
     */
    getBroadcastActionLanguage(broadcastId, actionId, language) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.get(`${this.resourceBase('broadcasts', broadcastId)}/actions/${encodeURIComponent(actionId)}/language/${encodeURIComponent(language)}`);
    }
    /**
     * Update a single-language translation of a broadcast action.
     *
     * @param broadcastId The broadcast's numeric id.
     * @param actionId The action's numeric id.
     * @param language The IETF language tag.
     * @param data The translation fields to update.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId`, `actionId`, or `language` is empty.
     */
    updateBroadcastActionLanguage(broadcastId, actionId, language, data = {}) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.put(`${this.resourceBase('broadcasts', broadcastId)}/actions/${encodeURIComponent(actionId)}/language/${encodeURIComponent(language)}`, data);
    }
    /**
     * Get metrics for a single broadcast action over time. Aggregated across all
     * channels (the API does not accept a `type` filter here).
     *
     * @param broadcastId The broadcast's numeric id.
     * @param actionId The action's numeric id.
     * @param options Optional reporting window. See {@link MetricsWindowOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId` or `actionId` is empty.
     */
    getBroadcastActionMetrics(broadcastId, actionId, options = {}) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps });
        return this.request.get(`${this.resourceBase('broadcasts', broadcastId)}/actions/${encodeURIComponent(actionId)}/metrics${query}`);
    }
    /**
     * Get link (click) metrics for a single broadcast action over time.
     *
     * @param broadcastId The broadcast's numeric id.
     * @param actionId The action's numeric id.
     * @param options Optional reporting window. See {@link LinkMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId` or `actionId` is empty.
     */
    getBroadcastActionMetricsLinks(broadcastId, actionId, options = {}) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        if ((0, utils_1.isEmpty)(actionId)) {
            throw new utils_1.MissingParamError('actionId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps, unique: options.unique });
        return this.request.get(`${this.resourceBase('broadcasts', broadcastId)}/actions/${encodeURIComponent(actionId)}/metrics/links${query}`);
    }
    /**
     * Get delivery metrics for a broadcast over time.
     *
     * @param broadcastId The broadcast's numeric id.
     * @param options Optional reporting window/filters. See {@link MetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId` is empty.
     */
    getBroadcastMetrics(broadcastId, options = {}) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps, type: options.type });
        return this.request.get(`${this.resourceBase('broadcasts', broadcastId)}/metrics${query}`);
    }
    /**
     * Get link (click) metrics for a broadcast over time.
     *
     * @param broadcastId The broadcast's numeric id.
     * @param options Optional reporting window. See {@link LinkMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId` is empty.
     */
    getBroadcastMetricsLinks(broadcastId, options = {}) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps, unique: options.unique });
        return this.request.get(`${this.resourceBase('broadcasts', broadcastId)}/metrics/links${query}`);
    }
    /**
     * Get the individual messages (deliveries) sent by a broadcast.
     *
     * @param broadcastId The broadcast's numeric id.
     * @param options Optional filters/pagination. See {@link BroadcastMessagesOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId` is empty.
     */
    getBroadcastMessages(broadcastId, options = {}) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        const query = (0, utils_1.buildQueryString)({
            start: options.start,
            limit: options.limit,
            metric: options.metric,
            type: options.type,
            start_ts: options.start_ts,
            end_ts: options.end_ts,
            get_tracked_responses: options.get_tracked_responses,
        });
        return this.request.get(`${this.resourceBase('broadcasts', broadcastId)}/messages${query}`);
    }
    /**
     * List the API triggers fired for a broadcast.
     *
     * @param broadcastId The broadcast's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `broadcastId` is empty.
     */
    getBroadcastTriggers(broadcastId) {
        if ((0, utils_1.isEmpty)(broadcastId)) {
            throw new utils_1.MissingParamError('broadcastId');
        }
        return this.request.get(`${this.resourceBase('broadcasts', broadcastId)}/triggers`);
    }
    /**
     * List the newsletters in your workspace.
     *
     * @param options Optional pagination and sort. See {@link ListNewslettersOptions}.
     * @returns The parsed JSON response body (`{ newsletters: [...], next }`).
     */
    listNewsletters(options = {}) {
        const query = (0, utils_1.buildQueryString)({ start: options.start, limit: options.limit, sort: options.sort });
        return this.request.get(`${this.apiRoot}/newsletters${query}`);
    }
    /**
     * Create a newsletter.
     *
     * @param data The newsletter definition.
     * @returns The parsed JSON response body.
     */
    createNewsletter(data = {}) {
        return this.request.post(`${this.apiRoot}/newsletters`, data);
    }
    /**
     * Get a single newsletter's metadata.
     *
     * @param newsletterId The newsletter's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    getNewsletter(newsletterId) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        return this.request.get(this.resourceBase('newsletters', newsletterId));
    }
    /**
     * Delete a newsletter.
     *
     * @param newsletterId The newsletter's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    deleteNewsletter(newsletterId) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        return this.request.destroy(this.resourceBase('newsletters', newsletterId));
    }
    /**
     * List all content variants of a newsletter.
     *
     * @param newsletterId The newsletter's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    getNewsletterContents(newsletterId) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        return this.request.get(`${this.resourceBase('newsletters', newsletterId)}/contents`);
    }
    /**
     * Get a single content variant of a newsletter.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param contentId The content variant's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` or `contentId` is empty.
     */
    getNewsletterContent(newsletterId, contentId) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        if ((0, utils_1.isEmpty)(contentId)) {
            throw new utils_1.MissingParamError('contentId');
        }
        return this.request.get(`${this.resourceBase('newsletters', newsletterId)}/contents/${encodeURIComponent(contentId)}`);
    }
    /**
     * Update a content variant of a newsletter.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param contentId The content variant's numeric id.
     * @param data The content fields to update.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` or `contentId` is empty.
     */
    updateNewsletterContent(newsletterId, contentId, data = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        if ((0, utils_1.isEmpty)(contentId)) {
            throw new utils_1.MissingParamError('contentId');
        }
        return this.request.put(`${this.resourceBase('newsletters', newsletterId)}/contents/${encodeURIComponent(contentId)}`, data);
    }
    /**
     * Get metrics for a single newsletter content variant over time.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param contentId The content variant's numeric id.
     * @param options Optional reporting window/filters. See {@link NewsletterMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` or `contentId` is empty.
     */
    getNewsletterContentMetrics(newsletterId, contentId, options = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        if ((0, utils_1.isEmpty)(contentId)) {
            throw new utils_1.MissingParamError('contentId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps });
        return this.request.get(`${this.resourceBase('newsletters', newsletterId)}/contents/${encodeURIComponent(contentId)}/metrics${query}`);
    }
    /**
     * Get link (click) metrics for a single newsletter content variant over time.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param contentId The content variant's numeric id.
     * @param options Optional reporting window. See {@link LinkMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` or `contentId` is empty.
     */
    getNewsletterContentMetricsLinks(newsletterId, contentId, options = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        if ((0, utils_1.isEmpty)(contentId)) {
            throw new utils_1.MissingParamError('contentId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps, unique: options.unique });
        return this.request.get(`${this.resourceBase('newsletters', newsletterId)}/contents/${encodeURIComponent(contentId)}/metrics/links${query}`);
    }
    /**
     * Get delivery metrics for a newsletter over time.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param options Optional reporting window/filters. See {@link NewsletterMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    getNewsletterMetrics(newsletterId, options = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps });
        return this.request.get(`${this.resourceBase('newsletters', newsletterId)}/metrics${query}`);
    }
    /**
     * Get link (click) metrics for a newsletter over time.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param options Optional reporting window. See {@link LinkMetricsOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    getNewsletterMetricsLinks(newsletterId, options = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        const query = (0, utils_1.buildQueryString)({ period: options.period, steps: options.steps, unique: options.unique });
        return this.request.get(`${this.resourceBase('newsletters', newsletterId)}/metrics/links${query}`);
    }
    /**
     * Get the individual messages (deliveries) sent by a newsletter.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param options Optional filters/pagination. See {@link NewsletterMessagesOptions}.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    getNewsletterMessages(newsletterId, options = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        const query = (0, utils_1.buildQueryString)({
            start: options.start,
            limit: options.limit,
            metric: options.metric,
            type: options.type,
            start_ts: options.start_ts,
            end_ts: options.end_ts,
            get_tracked_responses: options.get_tracked_responses,
        });
        return this.request.get(`${this.resourceBase('newsletters', newsletterId)}/messages${query}`);
    }
    /**
     * Send a newsletter.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param data Optional send settings — e.g. `rate_limit_email_rate`,
     *   `rate_limit_time_period`, `rate_limit_spread`.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    sendNewsletter(newsletterId, data = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        return this.request.post(`${this.resourceBase('newsletters', newsletterId)}/send`, data);
    }
    /**
     * Schedule a newsletter to send later.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param data The schedule settings.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    scheduleNewsletter(newsletterId, data = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        return this.request.post(`${this.resourceBase('newsletters', newsletterId)}/schedule`, data);
    }
    /**
     * Add a language (translation) to a newsletter.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param data The translation content, including its `language` tag.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    createNewsletterLanguage(newsletterId, data = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        return this.request.post(`${this.resourceBase('newsletters', newsletterId)}/language`, data);
    }
    /**
     * Get a single-language translation of a newsletter.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param language The IETF language tag.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` or `language` is empty.
     */
    getNewsletterLanguage(newsletterId, language) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.get(`${this.resourceBase('newsletters', newsletterId)}/language/${encodeURIComponent(language)}`);
    }
    /**
     * Update a single-language translation of a newsletter.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param language The IETF language tag.
     * @param data The translation fields to update.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` or `language` is empty.
     */
    updateNewsletterLanguage(newsletterId, language, data = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.put(`${this.resourceBase('newsletters', newsletterId)}/language/${encodeURIComponent(language)}`, data);
    }
    /**
     * Delete a single-language translation of a newsletter.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param language The IETF language tag.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` or `language` is empty.
     */
    deleteNewsletterLanguage(newsletterId, language) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.destroy(`${this.resourceBase('newsletters', newsletterId)}/language/${encodeURIComponent(language)}`);
    }
    /**
     * List a newsletter's A/B test groups.
     *
     * @param newsletterId The newsletter's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    getNewsletterTestGroups(newsletterId) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        return this.request.get(`${this.resourceBase('newsletters', newsletterId)}/test_groups`);
    }
    /**
     * Create an A/B test group on a newsletter. The API takes no request body —
     * a new empty test group is created and returned.
     *
     * @param newsletterId The newsletter's numeric id.
     * @returns The parsed JSON response body (the updated newsletter).
     * @throws {MissingParamError} If `newsletterId` is empty.
     */
    createNewsletterTestGroup(newsletterId) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        return this.request.post(`${this.resourceBase('newsletters', newsletterId)}/test_groups`);
    }
    /**
     * Add a language (translation) to a newsletter test group.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param testGroupId The test group's id.
     * @param data The translation content, including its `language` tag.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId` or `testGroupId` is empty.
     */
    createNewsletterTestGroupLanguage(newsletterId, testGroupId, data = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        if ((0, utils_1.isEmpty)(testGroupId)) {
            throw new utils_1.MissingParamError('testGroupId');
        }
        return this.request.post(`${this.resourceBase('newsletters', newsletterId)}/test_group/${encodeURIComponent(testGroupId)}/language`, data);
    }
    /**
     * Get a single-language translation of a newsletter test group.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param testGroupId The test group's id.
     * @param language The IETF language tag.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId`, `testGroupId`, or `language` is empty.
     */
    getNewsletterTestGroupLanguage(newsletterId, testGroupId, language) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        if ((0, utils_1.isEmpty)(testGroupId)) {
            throw new utils_1.MissingParamError('testGroupId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.get(`${this.resourceBase('newsletters', newsletterId)}/test_group/${encodeURIComponent(testGroupId)}/language/${encodeURIComponent(language)}`);
    }
    /**
     * Update a single-language translation of a newsletter test group.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param testGroupId The test group's id.
     * @param language The IETF language tag.
     * @param data The translation fields to update.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId`, `testGroupId`, or `language` is empty.
     */
    updateNewsletterTestGroupLanguage(newsletterId, testGroupId, language, data = {}) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        if ((0, utils_1.isEmpty)(testGroupId)) {
            throw new utils_1.MissingParamError('testGroupId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.put(`${this.resourceBase('newsletters', newsletterId)}/test_group/${encodeURIComponent(testGroupId)}/language/${encodeURIComponent(language)}`, data);
    }
    /**
     * Delete a single-language translation of a newsletter test group.
     *
     * @param newsletterId The newsletter's numeric id.
     * @param testGroupId The test group's id.
     * @param language The IETF language tag.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `newsletterId`, `testGroupId`, or `language` is empty.
     */
    deleteNewsletterTestGroupLanguage(newsletterId, testGroupId, language) {
        if ((0, utils_1.isEmpty)(newsletterId)) {
            throw new utils_1.MissingParamError('newsletterId');
        }
        if ((0, utils_1.isEmpty)(testGroupId)) {
            throw new utils_1.MissingParamError('testGroupId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.destroy(`${this.resourceBase('newsletters', newsletterId)}/test_group/${encodeURIComponent(testGroupId)}/language/${encodeURIComponent(language)}`);
    }
    /**
     * List Design Studio folders.
     *
     * @param options Optional filters, sorting, and pagination. See {@link DesignStudioListOptions}.
     * @returns The parsed JSON response body (`{ folders: [...], meta }`).
     */
    listDesignStudioFolders(options = {}) {
        const query = (0, utils_1.buildQueryString)({
            parent_folder_id: options.parentFolderId,
            direct_descendants_only: options.directDescendantsOnly,
            sort_by: options.sortBy,
            sort_order: options.sortOrder,
            created_before: options.createdBefore,
            created_after: options.createdAfter,
            updated_before: options.updatedBefore,
            updated_after: options.updatedAfter,
            page: options.page,
            limit: options.limit,
        });
        return this.request.get(`${this.apiRoot}/design_studio/folders${query}`);
    }
    /**
     * Create a Design Studio folder.
     *
     * @param folder The folder definition. `name` is required. See {@link DesignStudioFolderInput}.
     * @returns The parsed JSON response body (`{ folder: {...} }`).
     * @throws {MissingParamError} If `folder` is missing/not an object, or `folder.name` is empty.
     */
    createDesignStudioFolder(folder) {
        if (folder == null || typeof folder !== 'object') {
            throw new utils_1.MissingParamError('folder');
        }
        if ((0, utils_1.isEmpty)(folder.name)) {
            throw new utils_1.MissingParamError('folder.name');
        }
        return this.request.post(`${this.apiRoot}/design_studio/folders`, folder);
    }
    /**
     * Get a single Design Studio folder.
     *
     * @param folderId The folder's UUID.
     * @returns The parsed JSON response body (`{ folder: {...} }`).
     * @throws {MissingParamError} If `folderId` is empty.
     */
    getDesignStudioFolder(folderId) {
        if ((0, utils_1.isEmpty)(folderId)) {
            throw new utils_1.MissingParamError('folderId');
        }
        return this.request.get(`${this.apiRoot}/design_studio/folders/${encodeURIComponent(folderId)}`);
    }
    /**
     * Update a Design Studio folder. At least one field must be provided.
     *
     * @param folderId The folder's UUID.
     * @param updates The fields to change. See {@link DesignStudioFolderUpdate}.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `folderId` is empty or `updates` is missing/not an object.
     */
    updateDesignStudioFolder(folderId, updates) {
        if ((0, utils_1.isEmpty)(folderId)) {
            throw new utils_1.MissingParamError('folderId');
        }
        if (updates == null || typeof updates !== 'object') {
            throw new utils_1.MissingParamError('updates');
        }
        return this.request.put(`${this.apiRoot}/design_studio/folders/${encodeURIComponent(folderId)}`, updates);
    }
    /**
     * Delete a Design Studio folder.
     *
     * @param folderId The folder's UUID.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `folderId` is empty.
     */
    deleteDesignStudioFolder(folderId) {
        if ((0, utils_1.isEmpty)(folderId)) {
            throw new utils_1.MissingParamError('folderId');
        }
        return this.request.destroy(`${this.apiRoot}/design_studio/folders/${encodeURIComponent(folderId)}`);
    }
    /**
     * List Design Studio emails.
     *
     * @param options Optional filters, sorting, and pagination. See {@link ListDesignStudioEmailsOptions}.
     * @returns The parsed JSON response body (`{ emails: [...], folders: [...], meta }`).
     */
    listDesignStudioEmails(options = {}) {
        const query = (0, utils_1.buildQueryString)({
            parent_folder_id: options.parentFolderId,
            direct_descendants_only: options.directDescendantsOnly,
            sort_by: options.sortBy,
            sort_order: options.sortOrder,
            created_before: options.createdBefore,
            created_after: options.createdAfter,
            updated_before: options.updatedBefore,
            updated_after: options.updatedAfter,
            page: options.page,
            limit: options.limit,
            is_template: options.isTemplate,
            has_translations: options.hasTranslations,
            is_linked: options.isLinked,
        });
        return this.request.get(`${this.apiRoot}/design_studio/emails${query}`);
    }
    /**
     * Create a Design Studio email.
     *
     * @param email The email definition. `name` is required. See {@link DesignStudioEmailInput}.
     * @returns The parsed JSON response body (`{ email: {...} }`).
     * @throws {MissingParamError} If `email` is missing/not an object, or `email.name` is empty.
     */
    createDesignStudioEmail(email) {
        if (email == null || typeof email !== 'object') {
            throw new utils_1.MissingParamError('email');
        }
        if ((0, utils_1.isEmpty)(email.name)) {
            throw new utils_1.MissingParamError('email.name');
        }
        return this.request.post(`${this.apiRoot}/design_studio/emails`, email);
    }
    /**
     * Get a single Design Studio email.
     *
     * @param emailId The email's UUID.
     * @returns The parsed JSON response body (`{ email: {...} }`).
     * @throws {MissingParamError} If `emailId` is empty.
     */
    getDesignStudioEmail(emailId) {
        if ((0, utils_1.isEmpty)(emailId)) {
            throw new utils_1.MissingParamError('emailId');
        }
        return this.request.get(`${this.apiRoot}/design_studio/emails/${encodeURIComponent(emailId)}`);
    }
    /**
     * Update a Design Studio email. At least one field must be provided.
     *
     * @param emailId The email's UUID.
     * @param updates The fields to change. See {@link DesignStudioEmailUpdate}.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `emailId` is empty or `updates` is missing/not an object.
     */
    updateDesignStudioEmail(emailId, updates) {
        if ((0, utils_1.isEmpty)(emailId)) {
            throw new utils_1.MissingParamError('emailId');
        }
        if (updates == null || typeof updates !== 'object') {
            throw new utils_1.MissingParamError('updates');
        }
        return this.request.put(`${this.apiRoot}/design_studio/emails/${encodeURIComponent(emailId)}`, updates);
    }
    /**
     * Delete a Design Studio email.
     *
     * @param emailId The email's UUID.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `emailId` is empty.
     */
    deleteDesignStudioEmail(emailId) {
        if ((0, utils_1.isEmpty)(emailId)) {
            throw new utils_1.MissingParamError('emailId');
        }
        return this.request.destroy(`${this.apiRoot}/design_studio/emails/${encodeURIComponent(emailId)}`);
    }
    /**
     * List the translations (languages) of a Design Studio email.
     *
     * @param emailId The email's UUID.
     * @returns The parsed JSON response body (`{ email_translations: [...] }`).
     * @throws {MissingParamError} If `emailId` is empty.
     */
    listDesignStudioEmailLanguages(emailId) {
        if ((0, utils_1.isEmpty)(emailId)) {
            throw new utils_1.MissingParamError('emailId');
        }
        return this.request.get(`${this.apiRoot}/design_studio/emails/${encodeURIComponent(emailId)}/languages`);
    }
    /**
     * Create a translation of a Design Studio email. Content blocks you omit are
     * inherited from the default-language email.
     *
     * @param emailId The email's UUID.
     * @param translation The translation definition. `language` is required. See {@link DesignStudioEmailTranslationInput}.
     * @returns The parsed JSON response body (`{ email_translation: {...} }`).
     * @throws {MissingParamError} If `emailId` is empty, `translation` is missing/not an object, or `translation.language` is empty.
     */
    createDesignStudioEmailLanguage(emailId, translation) {
        if ((0, utils_1.isEmpty)(emailId)) {
            throw new utils_1.MissingParamError('emailId');
        }
        if (translation == null || typeof translation !== 'object') {
            throw new utils_1.MissingParamError('translation');
        }
        if ((0, utils_1.isEmpty)(translation.language)) {
            throw new utils_1.MissingParamError('translation.language');
        }
        return this.request.post(`${this.apiRoot}/design_studio/emails/${encodeURIComponent(emailId)}/languages`, translation);
    }
    /**
     * Get a single-language translation of a Design Studio email.
     *
     * @param emailId The email's UUID.
     * @param language The IETF language tag.
     * @returns The parsed JSON response body (`{ email_translation: {...} }`).
     * @throws {MissingParamError} If `emailId` or `language` is empty.
     */
    getDesignStudioEmailLanguage(emailId, language) {
        if ((0, utils_1.isEmpty)(emailId)) {
            throw new utils_1.MissingParamError('emailId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.get(`${this.apiRoot}/design_studio/emails/${encodeURIComponent(emailId)}/languages/${encodeURIComponent(language)}`);
    }
    /**
     * Update a single-language translation of a Design Studio email. At least one field must be provided.
     *
     * @param emailId The email's UUID.
     * @param language The IETF language tag.
     * @param updates The fields to change. See {@link DesignStudioEmailTranslationUpdate}.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `emailId` or `language` is empty, or `updates` is missing/not an object.
     */
    updateDesignStudioEmailLanguage(emailId, language, updates) {
        if ((0, utils_1.isEmpty)(emailId)) {
            throw new utils_1.MissingParamError('emailId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        if (updates == null || typeof updates !== 'object') {
            throw new utils_1.MissingParamError('updates');
        }
        return this.request.put(`${this.apiRoot}/design_studio/emails/${encodeURIComponent(emailId)}/languages/${encodeURIComponent(language)}`, updates);
    }
    /**
     * Delete a single-language translation of a Design Studio email.
     *
     * @param emailId The email's UUID.
     * @param language The IETF language tag.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `emailId` or `language` is empty.
     */
    deleteDesignStudioEmailLanguage(emailId, language) {
        if ((0, utils_1.isEmpty)(emailId)) {
            throw new utils_1.MissingParamError('emailId');
        }
        if ((0, utils_1.isEmpty)(language)) {
            throw new utils_1.MissingParamError('language');
        }
        return this.request.destroy(`${this.apiRoot}/design_studio/emails/${encodeURIComponent(emailId)}/languages/${encodeURIComponent(language)}`);
    }
    /**
     * List Design Studio components.
     *
     * @param options Optional filters, sorting, and pagination. See {@link ListDesignStudioComponentsOptions}.
     * @returns The parsed JSON response body (`{ components: [...], folders: [...], meta }`).
     */
    listDesignStudioComponents(options = {}) {
        const query = (0, utils_1.buildQueryString)({
            parent_folder_id: options.parentFolderId,
            direct_descendants_only: options.directDescendantsOnly,
            sort_by: options.sortBy,
            sort_order: options.sortOrder,
            created_before: options.createdBefore,
            created_after: options.createdAfter,
            updated_before: options.updatedBefore,
            updated_after: options.updatedAfter,
            page: options.page,
            limit: options.limit,
            tag: options.tag,
        });
        return this.request.get(`${this.apiRoot}/design_studio/components${query}`);
    }
    /**
     * Create a Design Studio component.
     *
     * @param component The component definition. `name` and `tag` are required. See {@link DesignStudioComponentInput}.
     * @returns The parsed JSON response body (`{ component: {...} }`).
     * @throws {MissingParamError} If `component` is missing/not an object, or `component.name`/`component.tag` is empty.
     */
    createDesignStudioComponent(component) {
        if (component == null || typeof component !== 'object') {
            throw new utils_1.MissingParamError('component');
        }
        if ((0, utils_1.isEmpty)(component.name)) {
            throw new utils_1.MissingParamError('component.name');
        }
        if ((0, utils_1.isEmpty)(component.tag)) {
            throw new utils_1.MissingParamError('component.tag');
        }
        return this.request.post(`${this.apiRoot}/design_studio/components`, component);
    }
    /**
     * Get a single Design Studio component.
     *
     * @param componentId The component's UUID.
     * @returns The parsed JSON response body (`{ component: {...} }`).
     * @throws {MissingParamError} If `componentId` is empty.
     */
    getDesignStudioComponent(componentId) {
        if ((0, utils_1.isEmpty)(componentId)) {
            throw new utils_1.MissingParamError('componentId');
        }
        return this.request.get(`${this.apiRoot}/design_studio/components/${encodeURIComponent(componentId)}`);
    }
    /**
     * Update a Design Studio component. At least one field must be provided.
     *
     * @param componentId The component's UUID.
     * @param updates The fields to change. See {@link DesignStudioComponentUpdate}.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `componentId` is empty or `updates` is missing/not an object.
     */
    updateDesignStudioComponent(componentId, updates) {
        if ((0, utils_1.isEmpty)(componentId)) {
            throw new utils_1.MissingParamError('componentId');
        }
        if (updates == null || typeof updates !== 'object') {
            throw new utils_1.MissingParamError('updates');
        }
        return this.request.put(`${this.apiRoot}/design_studio/components/${encodeURIComponent(componentId)}`, updates);
    }
    /**
     * Delete a Design Studio component.
     *
     * @param componentId The component's UUID.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `componentId` is empty.
     */
    deleteDesignStudioComponent(componentId) {
        if ((0, utils_1.isEmpty)(componentId)) {
            throw new utils_1.MissingParamError('componentId');
        }
        return this.request.destroy(`${this.apiRoot}/design_studio/components/${encodeURIComponent(componentId)}`);
    }
    /**
     * List uploaded assets (files).
     *
     * @param options Optional folder filter and pagination. See {@link AssetListOptions}.
     * @returns The parsed JSON response body (`{ assets: [...], meta }`).
     */
    listAssets(options = {}) {
        const query = (0, utils_1.buildQueryString)({
            parent_folder_id: options.parentFolderId,
            direct_descendants_only: options.directDescendantsOnly,
            page: options.page,
            limit: options.limit,
        });
        return this.request.get(`${this.apiRoot}/assets${query}`);
    }
    /**
     * Upload a file asset (`multipart/form-data`).
     *
     * @param file The file to upload. `data` and `filename` are required. See {@link CreateAssetInput}.
     * @returns The parsed JSON response body (`{ asset: {...} }`).
     * @throws {MissingParamError} If `file` is missing/not an object, or `file.data`/`file.filename` is missing.
     */
    createAsset(file) {
        if (file == null || typeof file !== 'object') {
            throw new utils_1.MissingParamError('file');
        }
        if (file.data == null) {
            throw new utils_1.MissingParamError('file.data');
        }
        if ((0, utils_1.isEmpty)(file.filename)) {
            throw new utils_1.MissingParamError('file.filename');
        }
        // Set the part's Content-Type explicitly. An untyped Blob is serialized as
        // `application/octet-stream`, which the API rejects, so resolve a type from
        // (in order) an explicit `contentType`, the filename extension, or the type
        // already on `data` when it is a Blob. An empty-string `contentType` is
        // treated as absent so it still falls through to derivation.
        const explicitType = (0, utils_1.isEmpty)(file.contentType) ? undefined : file.contentType;
        const contentType = explicitType ??
            assetContentTypeForFilename(file.filename) ??
            (file.data instanceof Blob && file.data.type ? file.data.type : undefined);
        const form = new FormData();
        const blob = contentType ? new Blob([file.data], { type: contentType }) : new Blob([file.data]);
        form.append('file', blob, file.filename);
        if (file.name !== undefined) {
            form.append('name', file.name);
        }
        if (file.parentFolderId !== undefined) {
            form.append('parent_folder_id', String(file.parentFolderId));
        }
        return this.request.postForm(`${this.apiRoot}/assets/files`, form);
    }
    /**
     * Get a single asset (file).
     *
     * @param assetId The asset's numeric id.
     * @returns The parsed JSON response body (`{ asset: {...} }`).
     * @throws {MissingParamError} If `assetId` is empty.
     */
    getAsset(assetId) {
        if ((0, utils_1.isEmpty)(assetId)) {
            throw new utils_1.MissingParamError('assetId');
        }
        return this.request.get(`${this.apiRoot}/assets/files/${encodeURIComponent(assetId)}`);
    }
    /**
     * Update an asset's name and/or parent folder. At least one field must be provided;
     * the file bytes cannot be changed.
     *
     * @param assetId The asset's numeric id.
     * @param updates The fields to change. See {@link AssetUpdate}.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `assetId` is empty or `updates` is missing/not an object.
     */
    updateAsset(assetId, updates) {
        if ((0, utils_1.isEmpty)(assetId)) {
            throw new utils_1.MissingParamError('assetId');
        }
        if (updates == null || typeof updates !== 'object') {
            throw new utils_1.MissingParamError('updates');
        }
        return this.request.put(`${this.apiRoot}/assets/files/${encodeURIComponent(assetId)}`, updates);
    }
    /**
     * Delete an asset (file).
     *
     * @param assetId The asset's numeric id.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `assetId` is empty.
     */
    deleteAsset(assetId) {
        if ((0, utils_1.isEmpty)(assetId)) {
            throw new utils_1.MissingParamError('assetId');
        }
        return this.request.destroy(`${this.apiRoot}/assets/files/${encodeURIComponent(assetId)}`);
    }
    /**
     * List asset folders.
     *
     * @param options Optional folder filter and pagination. See {@link AssetListOptions}.
     * @returns The parsed JSON response body (`{ folders: [...], meta }`).
     */
    listAssetFolders(options = {}) {
        const query = (0, utils_1.buildQueryString)({
            parent_folder_id: options.parentFolderId,
            direct_descendants_only: options.directDescendantsOnly,
            page: options.page,
            limit: options.limit,
        });
        return this.request.get(`${this.apiRoot}/assets/folders${query}`);
    }
    /**
     * Create an asset folder.
     *
     * @param folder The folder definition. `name` is required. See {@link AssetFolderInput}.
     * @returns The parsed JSON response body (`{ folder: {...} }`).
     * @throws {MissingParamError} If `folder` is missing/not an object, or `folder.name` is empty.
     */
    createAssetFolder(folder) {
        if (folder == null || typeof folder !== 'object') {
            throw new utils_1.MissingParamError('folder');
        }
        if ((0, utils_1.isEmpty)(folder.name)) {
            throw new utils_1.MissingParamError('folder.name');
        }
        return this.request.post(`${this.apiRoot}/assets/folders`, folder);
    }
    /**
     * Get a single asset folder.
     *
     * @param folderId The folder's numeric id.
     * @returns The parsed JSON response body (`{ folder: {...} }`).
     * @throws {MissingParamError} If `folderId` is empty.
     */
    getAssetFolder(folderId) {
        if ((0, utils_1.isEmpty)(folderId)) {
            throw new utils_1.MissingParamError('folderId');
        }
        return this.request.get(`${this.apiRoot}/assets/folders/${encodeURIComponent(folderId)}`);
    }
    /**
     * Update an asset folder. At least one field must be provided.
     *
     * @param folderId The folder's numeric id.
     * @param updates The fields to change. See {@link AssetFolderUpdate}.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `folderId` is empty or `updates` is missing/not an object.
     */
    updateAssetFolder(folderId, updates) {
        if ((0, utils_1.isEmpty)(folderId)) {
            throw new utils_1.MissingParamError('folderId');
        }
        if (updates == null || typeof updates !== 'object') {
            throw new utils_1.MissingParamError('updates');
        }
        return this.request.put(`${this.apiRoot}/assets/folders/${encodeURIComponent(folderId)}`, updates);
    }
    /**
     * Delete an asset folder. The folder must be empty.
     *
     * @param folderId The folder's numeric id.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `folderId` is empty.
     */
    deleteAssetFolder(folderId) {
        if ((0, utils_1.isEmpty)(folderId)) {
            throw new utils_1.MissingParamError('folderId');
        }
        return this.request.destroy(`${this.apiRoot}/assets/folders/${encodeURIComponent(folderId)}`);
    }
    /**
     * List the collections in your workspace.
     *
     * @returns The parsed JSON response body (`{ collections: [...] }`).
     */
    listCollections() {
        return this.request.get(`${this.apiRoot}/collections`);
    }
    /**
     * Create a collection. Provide inline `data` or a source `url`, not both.
     *
     * @param collection The collection definition. `name` is required. See {@link CollectionInput}.
     * @returns The parsed JSON response body (`{ collection: {...} }`).
     * @throws {MissingParamError} If `collection` is missing/not an object, or `collection.name` is empty.
     */
    createCollection(collection) {
        if (collection == null || typeof collection !== 'object') {
            throw new utils_1.MissingParamError('collection');
        }
        if ((0, utils_1.isEmpty)(collection.name)) {
            throw new utils_1.MissingParamError('collection.name');
        }
        return this.request.post(`${this.apiRoot}/collections`, collection);
    }
    /**
     * Get a single collection's metadata (name, schema, row count, size).
     *
     * @param collectionId The collection's numeric id.
     * @returns The parsed JSON response body (`{ collection: {...} }`).
     * @throws {MissingParamError} If `collectionId` is empty.
     */
    getCollection(collectionId) {
        if ((0, utils_1.isEmpty)(collectionId)) {
            throw new utils_1.MissingParamError('collectionId');
        }
        return this.request.get(`${this.apiRoot}/collections/${encodeURIComponent(collectionId)}`);
    }
    /**
     * Update a collection. Any subset of fields may be provided; `data` and `url` are mutually exclusive.
     *
     * @param collectionId The collection's numeric id.
     * @param updates The fields to change. See {@link CollectionUpdate}.
     * @returns The parsed JSON response body (`{ collection: {...} }`).
     * @throws {MissingParamError} If `collectionId` is empty or `updates` is missing/not an object.
     */
    updateCollection(collectionId, updates) {
        if ((0, utils_1.isEmpty)(collectionId)) {
            throw new utils_1.MissingParamError('collectionId');
        }
        if (updates == null || typeof updates !== 'object') {
            throw new utils_1.MissingParamError('updates');
        }
        return this.request.put(`${this.apiRoot}/collections/${encodeURIComponent(collectionId)}`, updates);
    }
    /**
     * Delete a collection. Fails if the collection is still referenced by a campaign.
     *
     * @param collectionId The collection's numeric id.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `collectionId` is empty.
     */
    deleteCollection(collectionId) {
        if ((0, utils_1.isEmpty)(collectionId)) {
            throw new utils_1.MissingParamError('collectionId');
        }
        return this.request.destroy(`${this.apiRoot}/collections/${encodeURIComponent(collectionId)}`);
    }
    /**
     * Get a collection's content — the full array of data rows.
     *
     * @param collectionId The collection's numeric id.
     * @returns The parsed JSON response body: an array of row objects.
     * @throws {MissingParamError} If `collectionId` is empty.
     */
    getCollectionContent(collectionId) {
        if ((0, utils_1.isEmpty)(collectionId)) {
            throw new utils_1.MissingParamError('collectionId');
        }
        return this.request.get(`${this.apiRoot}/collections/${encodeURIComponent(collectionId)}/content`);
    }
    /**
     * Replace a collection's content with a new array of data rows.
     *
     * @param collectionId The collection's numeric id.
     * @param content The full array of row objects to store.
     * @returns The parsed JSON response body (`{ collection: {...} }`).
     * @throws {MissingParamError} If `collectionId` is empty or `content` is not an array.
     */
    updateCollectionContent(collectionId, content) {
        if ((0, utils_1.isEmpty)(collectionId)) {
            throw new utils_1.MissingParamError('collectionId');
        }
        if (!Array.isArray(content)) {
            throw new utils_1.MissingParamError('content');
        }
        // This endpoint takes a top-level JSON array; the transport serializes it
        // as-is. The cast keeps `RequestData` object-shaped for its other callers.
        return this.request.put(`${this.apiRoot}/collections/${encodeURIComponent(collectionId)}/content`, content);
    }
    /**
     * Search every suppression category for an email address.
     *
     * @param email The email address to search for.
     * @returns The parsed JSON response body (`{ category, suppressions: [...] }`).
     * @throws {MissingParamError} If `email` is empty.
     */
    searchSuppression(email) {
        if ((0, utils_1.isEmpty)(email)) {
            throw new utils_1.MissingParamError('email');
        }
        return this.request.get(`${this.apiRoot}/esp/search_suppression/${encodeURIComponent(email)}`);
    }
    /**
     * List suppressions in a category (offset-based pagination).
     *
     * @param suppressionType One of `blocks`, `bounces`, `spam_reports`, `invalid_emails`.
     * @param options Optional filters and pagination. See {@link SuppressionsOptions}.
     * @returns The parsed JSON response body (`{ category, suppressions: [...] }`).
     * @throws {MissingParamError} If `suppressionType` is empty.
     */
    getSuppressions(suppressionType, options = {}) {
        if ((0, utils_1.isEmpty)(suppressionType)) {
            throw new utils_1.MissingParamError('suppressionType');
        }
        const query = (0, utils_1.buildQueryString)({
            limit: options.limit,
            offset: options.offset,
            email: options.email,
            domain: options.domain,
        });
        return this.request.get(`${this.apiRoot}/esp/suppression/${encodeURIComponent(suppressionType)}${query}`);
    }
    /**
     * List suppressions in a category for a single sending domain (cursor-based pagination).
     *
     * @param domainName The sending domain.
     * @param suppressionType One of `blocks`, `bounces`, `spam_reports`, `invalid_emails`.
     * @param options Optional filter and pagination. See {@link DomainSuppressionsOptions}.
     * @returns The parsed JSON response body (`{ category, suppressions: [...], next }`).
     * @throws {MissingParamError} If `domainName` or `suppressionType` is empty.
     */
    getDomainSuppressions(domainName, suppressionType, options = {}) {
        if ((0, utils_1.isEmpty)(domainName)) {
            throw new utils_1.MissingParamError('domainName');
        }
        if ((0, utils_1.isEmpty)(suppressionType)) {
            throw new utils_1.MissingParamError('suppressionType');
        }
        const query = (0, utils_1.buildQueryString)({
            limit: options.limit,
            email: options.email,
            start: options.start,
        });
        return this.request.get(`${this.apiRoot}/esp/domains/${encodeURIComponent(domainName)}/suppression/${encodeURIComponent(suppressionType)}${query}`);
    }
    /**
     * Add an email address to a suppression category.
     *
     * @param suppressionType One of `blocks`, `bounces`, `spam_reports`, `invalid_emails`.
     * @param email The email address to suppress.
     * @returns The parsed JSON response body.
     * @throws {MissingParamError} If `suppressionType` or `email` is empty.
     */
    createSuppression(suppressionType, email) {
        if ((0, utils_1.isEmpty)(suppressionType)) {
            throw new utils_1.MissingParamError('suppressionType');
        }
        if ((0, utils_1.isEmpty)(email)) {
            throw new utils_1.MissingParamError('email');
        }
        return this.request.post(`${this.apiRoot}/esp/suppression/${encodeURIComponent(suppressionType)}/${encodeURIComponent(email)}`);
    }
    /**
     * Remove an email address from a suppression category.
     *
     * @param suppressionType One of `blocks`, `bounces`, `spam_reports`, `invalid_emails`.
     * @param email The email address to unsuppress.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `suppressionType` or `email` is empty.
     */
    deleteSuppression(suppressionType, email) {
        if ((0, utils_1.isEmpty)(suppressionType)) {
            throw new utils_1.MissingParamError('suppressionType');
        }
        if ((0, utils_1.isEmpty)(email)) {
            throw new utils_1.MissingParamError('email');
        }
        return this.request.destroy(`${this.apiRoot}/esp/suppression/${encodeURIComponent(suppressionType)}/${encodeURIComponent(email)}`);
    }
    /**
     * List the reporting webhooks in your workspace.
     *
     * @returns The parsed JSON response body (`{ reporting_webhooks: [...] }`).
     */
    listReportingWebhooks() {
        return this.request.get(`${this.apiRoot}/reporting_webhooks`);
    }
    /**
     * Create a reporting webhook.
     *
     * @param webhook The webhook definition. `endpoint` is required. See {@link ReportingWebhookInput}.
     * @returns The parsed JSON response body (the created webhook).
     * @throws {MissingParamError} If `webhook` is missing/not an object, or `webhook.endpoint` is empty.
     */
    createReportingWebhook(webhook) {
        if (webhook == null || typeof webhook !== 'object') {
            throw new utils_1.MissingParamError('webhook');
        }
        if ((0, utils_1.isEmpty)(webhook.endpoint)) {
            throw new utils_1.MissingParamError('webhook.endpoint');
        }
        return this.request.post(`${this.apiRoot}/reporting_webhooks`, webhook);
    }
    /**
     * Get a single reporting webhook.
     *
     * @param webhookId The webhook's numeric id.
     * @returns The parsed JSON response body (the webhook).
     * @throws {MissingParamError} If `webhookId` is empty.
     */
    getReportingWebhook(webhookId) {
        if ((0, utils_1.isEmpty)(webhookId)) {
            throw new utils_1.MissingParamError('webhookId');
        }
        return this.request.get(`${this.apiRoot}/reporting_webhooks/${encodeURIComponent(webhookId)}`);
    }
    /**
     * Update a reporting webhook. Any subset of fields may be provided.
     *
     * @param webhookId The webhook's numeric id.
     * @param updates The fields to change. See {@link ReportingWebhookUpdate}.
     * @returns The parsed JSON response body (the updated webhook).
     * @throws {MissingParamError} If `webhookId` is empty or `updates` is missing/not an object.
     */
    updateReportingWebhook(webhookId, updates) {
        if ((0, utils_1.isEmpty)(webhookId)) {
            throw new utils_1.MissingParamError('webhookId');
        }
        if (updates == null || typeof updates !== 'object') {
            throw new utils_1.MissingParamError('updates');
        }
        return this.request.put(`${this.apiRoot}/reporting_webhooks/${encodeURIComponent(webhookId)}`, updates);
    }
    /**
     * Delete a reporting webhook.
     *
     * @param webhookId The webhook's numeric id.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `webhookId` is empty.
     */
    deleteReportingWebhook(webhookId) {
        if ((0, utils_1.isEmpty)(webhookId)) {
            throw new utils_1.MissingParamError('webhookId');
        }
        return this.request.destroy(`${this.apiRoot}/reporting_webhooks/${encodeURIComponent(webhookId)}`);
    }
    /**
     * List the snippets in your workspace.
     *
     * @returns The parsed JSON response body (`{ snippets: [...] }`).
     */
    getSnippets() {
        return this.request.get(`${this.apiRoot}/snippets`);
    }
    /**
     * Create a snippet.
     *
     * @param snippet The snippet definition. `name` and `value` are required. See {@link SnippetInput}.
     * @returns The parsed JSON response body (`{ snippet: {...} }`).
     * @throws {MissingParamError} If `snippet` is missing/not an object, or `snippet.name`/`snippet.value` is empty.
     */
    createSnippet(snippet) {
        if (snippet == null || typeof snippet !== 'object') {
            throw new utils_1.MissingParamError('snippet');
        }
        if ((0, utils_1.isEmpty)(snippet.name)) {
            throw new utils_1.MissingParamError('snippet.name');
        }
        if ((0, utils_1.isEmpty)(snippet.value)) {
            throw new utils_1.MissingParamError('snippet.value');
        }
        return this.request.post(`${this.apiRoot}/snippets`, snippet);
    }
    /**
     * Create or update a snippet (upsert by name).
     *
     * @param snippet The snippet definition. `name` and `value` are required. See {@link SnippetInput}.
     * @returns The parsed JSON response body (`{ snippet: {...} }`).
     * @throws {MissingParamError} If `snippet` is missing/not an object, or `snippet.name`/`snippet.value` is empty.
     */
    updateSnippet(snippet) {
        if (snippet == null || typeof snippet !== 'object') {
            throw new utils_1.MissingParamError('snippet');
        }
        if ((0, utils_1.isEmpty)(snippet.name)) {
            throw new utils_1.MissingParamError('snippet.name');
        }
        if ((0, utils_1.isEmpty)(snippet.value)) {
            throw new utils_1.MissingParamError('snippet.value');
        }
        return this.request.put(`${this.apiRoot}/snippets`, snippet);
    }
    /**
     * Delete a snippet by name. Fails if the snippet is still in use.
     *
     * @param name The snippet's name.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `name` is empty.
     */
    deleteSnippet(name) {
        if ((0, utils_1.isEmpty)(name)) {
            throw new utils_1.MissingParamError('name');
        }
        return this.request.destroy(`${this.apiRoot}/snippets/${encodeURIComponent(name)}`);
    }
    /**
     * List the sender identities in your workspace.
     *
     * @param options Optional sort, pagination, and hidden filter. See {@link SenderIdentitiesOptions}.
     * @returns The parsed JSON response body (`{ sender_identities: [...], next }`).
     */
    getSenderIdentities(options = {}) {
        const query = (0, utils_1.buildQueryString)({
            start: options.start,
            limit: options.limit,
            sort: options.sort,
            hidden: options.hidden,
        });
        return this.request.get(`${this.apiRoot}/sender_identities${query}`);
    }
    /**
     * Get a single sender identity.
     *
     * @param senderId The sender identity's numeric id.
     * @returns The parsed JSON response body (`{ sender_identity: {...} }`).
     * @throws {MissingParamError} If `senderId` is empty.
     */
    getSenderIdentity(senderId) {
        if ((0, utils_1.isEmpty)(senderId)) {
            throw new utils_1.MissingParamError('senderId');
        }
        return this.request.get(`${this.apiRoot}/sender_identities/${encodeURIComponent(senderId)}`);
    }
    /**
     * List the campaigns and newsletters that use a sender identity.
     *
     * @param senderId The sender identity's numeric id.
     * @returns The parsed JSON response body (`{ campaigns, sent_newsletters, draft_newsletters }`).
     * @throws {MissingParamError} If `senderId` is empty.
     */
    getSenderIdentityUsedBy(senderId) {
        if ((0, utils_1.isEmpty)(senderId)) {
            throw new utils_1.MissingParamError('senderId');
        }
        return this.request.get(`${this.apiRoot}/sender_identities/${encodeURIComponent(senderId)}/used_by`);
    }
    /**
     * List sent messages (deliveries) across your workspace.
     *
     * @param options Optional filters and pagination. See {@link MessagesOptions}.
     * @returns The parsed JSON response body (`{ messages: [...], next, ... }`).
     */
    getMessages(options = {}) {
        const query = (0, utils_1.buildQueryString)({
            start: options.start,
            limit: options.limit,
            drafts: options.drafts,
            metric: options.metric,
            type: options.type,
            campaign_id: options.campaign_id,
            action_id: options.action_id,
            newsletter_id: options.newsletter_id,
            transactional_id: options.transactional_id,
            trigger_id: options.trigger_id,
            template_id: options.template_id,
            content_id: options.content_id,
            start_ts: options.start_ts,
            end_ts: options.end_ts,
            associations: options.associations,
            get_tracked_responses: options.get_tracked_responses,
        });
        return this.request.get(`${this.apiRoot}/messages${query}`);
    }
    /**
     * Get a single sent message (delivery).
     *
     * @param messageId The delivery id (`CIO-Delivery-ID`).
     * @param options Optional response expansions. See {@link MessageOptions}.
     * @returns The parsed JSON response body (`{ message: {...}, ... }`).
     * @throws {MissingParamError} If `messageId` is empty.
     */
    getMessage(messageId, options = {}) {
        if ((0, utils_1.isEmpty)(messageId)) {
            throw new utils_1.MissingParamError('messageId');
        }
        const query = (0, utils_1.buildQueryString)({
            archived_message: options.archived_message,
            associations: options.associations,
            get_tracked_responses: options.get_tracked_responses,
        });
        return this.request.get(`${this.apiRoot}/messages/${encodeURIComponent(messageId)}${query}`);
    }
    /**
     * Get the archived content of a single sent message.
     *
     * @param messageId The delivery id (`CIO-Delivery-ID`).
     * @returns The parsed JSON response body (`{ archived_message: {...} }`).
     * @throws {MissingParamError} If `messageId` is empty.
     */
    getArchivedMessage(messageId) {
        if ((0, utils_1.isEmpty)(messageId)) {
            throw new utils_1.MissingParamError('messageId');
        }
        return this.request.get(`${this.apiRoot}/messages/${encodeURIComponent(messageId)}/archived_message`);
    }
    /**
     * Start a CSV import.
     *
     * @param importData The import definition. `data_file_url` and `type` are required. See {@link ImportInput}.
     * @returns The parsed JSON response body (`{ import: {...} }`).
     * @throws {MissingParamError} If `importData` is missing/not an object, or `data_file_url`/`type` is empty.
     */
    createImport(importData) {
        if (importData == null || typeof importData !== 'object') {
            throw new utils_1.MissingParamError('importData');
        }
        if ((0, utils_1.isEmpty)(importData.data_file_url)) {
            throw new utils_1.MissingParamError('importData.data_file_url');
        }
        if ((0, utils_1.isEmpty)(importData.type)) {
            throw new utils_1.MissingParamError('importData.type');
        }
        return this.request.post(`${this.apiRoot}/imports`, { import: importData });
    }
    /**
     * Get the status of an import.
     *
     * @param importId The import's numeric id.
     * @returns The parsed JSON response body (`{ import: {...} }`).
     * @throws {MissingParamError} If `importId` is empty.
     */
    getImport(importId) {
        if ((0, utils_1.isEmpty)(importId)) {
            throw new utils_1.MissingParamError('importId');
        }
        return this.request.get(`${this.apiRoot}/imports/${encodeURIComponent(importId)}`);
    }
    /**
     * Batch-update attribute metadata (up to 100 at a time).
     *
     * @param attributes The attribute updates. Each requires a `name`. See {@link DataIndexAttribute}.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `attributes` is not a non-empty array.
     */
    batchUpdateAttributes(attributes) {
        if (!Array.isArray(attributes) || attributes.length === 0) {
            throw new utils_1.MissingParamError('attributes');
        }
        return this.request.post(`${this.apiRoot}/data_index/attributes`, { attributes });
    }
    /**
     * Batch-update event metadata (up to 100 at a time).
     *
     * @param events The event updates. Each requires a `name`. See {@link DataIndexEvent}.
     * @returns The parsed JSON response body (empty on success — the API returns 204).
     * @throws {MissingParamError} If `events` is not a non-empty array.
     */
    batchUpdateEvents(events) {
        if (!Array.isArray(events) || events.length === 0) {
            throw new utils_1.MissingParamError('events');
        }
        return this.request.post(`${this.apiRoot}/data_index/events`, { events });
    }
    /**
     * List the workspaces (environments) in your account, with usage counts.
     *
     * @returns The parsed JSON response body (`{ workspaces: [...] }`).
     */
    listWorkspaces() {
        return this.request.get(`${this.apiRoot}/workspaces`);
    }
    /**
     * List the Customer.io egress IP addresses (for allowlisting).
     *
     * @returns The parsed JSON response body (`{ ip_addresses: [...] }`).
     */
    getIpAddresses() {
        return this.request.get(`${this.apiRoot}/info/ip_addresses`);
    }
}
exports.APIClient = APIClient;
var requests_2 = require("./api/requests");
Object.defineProperty(exports, "SendEmailRequest", { enumerable: true, get: function () { return requests_2.SendEmailRequest; } });
Object.defineProperty(exports, "SendPushRequest", { enumerable: true, get: function () { return requests_2.SendPushRequest; } });
Object.defineProperty(exports, "SendSMSRequest", { enumerable: true, get: function () { return requests_2.SendSMSRequest; } });
Object.defineProperty(exports, "SendWhatsAppRequest", { enumerable: true, get: function () { return requests_2.SendWhatsAppRequest; } });
Object.defineProperty(exports, "SendInboxMessageRequest", { enumerable: true, get: function () { return requests_2.SendInboxMessageRequest; } });
Object.defineProperty(exports, "SendInAppRequest", { enumerable: true, get: function () { return requests_2.SendInAppRequest; } });
