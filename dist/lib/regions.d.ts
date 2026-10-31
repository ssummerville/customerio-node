/**
 * A Customer.io data region. Selects the base URLs used by {@link TrackClient}
 * and {@link APIClient}.
 *
 * Use the pre-defined {@link RegionUS} and {@link RegionEU} constants rather
 * than constructing a `Region` directly.
 */
export declare class Region {
    /** Base URL for the Track API (basic-auth, site-id/api-key). */
    readonly trackUrl: string;
    /** Base URL for the Track API v2 (batch endpoint). Derived from {@link trackUrl}. */
    readonly trackV2Url: string;
    /** Base URL for the App API (bearer-auth, app key). */
    readonly apiUrl: string;
    /** Base URL for the Pipelines (CDP) API. */
    readonly pipelinesUrl: string;
    static [Symbol.hasInstance](instance: unknown): instance is Region;
    constructor(trackUrl: string, apiUrl: string, pipelinesUrl: string);
}
/** US data region. Default when no region is specified. */
export declare const RegionUS: Region;
/** EU data region. Use this if your Customer.io workspace is hosted in the EU. */
export declare const RegionEU: Region;
