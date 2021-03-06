declare module 'modepress' {

    /*
     * Describes the category model
     */
    export interface ICategory extends IModelEntry {
        title?: string;
        slug?: string;
        parent?: string;
        description?: string;
    }
}