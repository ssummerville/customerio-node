"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionEU = exports.RegionUS = exports.Region = void 0;
const REGION_BRAND = Symbol.for('customerio-node.Region');
/**
 * A Customer.io data region. Selects the base URLs used by {@link TrackClient}
 * and {@link APIClient}.
 *
 * Use the pre-defined {@link RegionUS} and {@link RegionEU} constants rather
 * than constructing a `Region` directly.
 */
class Region {
    /** Base URL for the Track API (basic-auth, site-id/api-key). */
    trackUrl;
    /** Base URL for the Track API v2 (batch endpoint). Derived from {@link trackUrl}. */
    trackV2Url;
    /** Base URL for the App API (bearer-auth, app key). */
    apiUrl;
    /** Base URL for the Pipelines (CDP) API. */
    pipelinesUrl;
    static [Symbol.hasInstance](instance) {
        return typeof instance === 'object' && instance !== null && instance[REGION_BRAND] === true;
    }
    constructor(trackUrl, apiUrl, pipelinesUrl) {
        Object.defineProperty(this, REGION_BRAND, { value: true });
        this.trackUrl = trackUrl;
        this.trackV2Url = trackUrl.replace('/api/v1', '/api/v2');
        this.apiUrl = apiUrl;
        this.pipelinesUrl = pipelinesUrl;
    }
}
exports.Region = Region;
/** US data region. Default when no region is specified. */
exports.RegionUS = new Region('https://track.customer.io/api/v1', 'https://api.customer.io/v1', 'https://cdp.customer.io/v1');
/** EU data region. Use this if your Customer.io workspace is hosted in the EU. */
exports.RegionEU = new Region('https://track-eu.customer.io/api/v1', 'https://api-eu.customer.io/v1', 'https://cdp-eu.customer.io/v1');
