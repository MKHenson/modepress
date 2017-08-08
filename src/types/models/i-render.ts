declare module 'modepress' {

    /*
     * Describes the cache renders model
     */
    export interface IRender extends IModelEntry {
        url?: string;
        expiration?: number;
        createdOn?: number;
        updateDate?: number;
        html?: string;
    }
}