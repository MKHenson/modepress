﻿/**
* A definition of each item in the model
*/
export class SchemaItem<T>
{
	public name: string;
    public value: T;
    private _sensitive: boolean;
    private _unique: boolean;
    private _uniqueIndexer: boolean;
    private _indexable: boolean;
    private _required: boolean;
    private _modified: boolean;

    constructor(name: string, value: T)
	{
		this.name = name;
        this.value = value;
        this._sensitive = false;
        this._unique = false;
        this._uniqueIndexer = false;
        this._indexable = false;
        this._required = false;
        this._modified = false;
	}

	/**
	* Creates a clone of this item
	* @returns {SchemaItem} copy A sub class of the copy
	* @returns {SchemaItem}
	*/
    public clone(copy?: SchemaItem<T>): SchemaItem<T>
    {
        copy = copy === undefined ? new SchemaItem(this.name, this.value) : copy;
        copy._unique = this._unique;
        copy._uniqueIndexer = this._uniqueIndexer;
        copy._required = this._required;
        copy._sensitive = this._sensitive;
		return copy;
    }

    /**
    * Gets if this item is indexable by mongodb
    * @returns {boolean}
    */
    public getIndexable(): boolean { return this._indexable; }

    /**
    * Sets if this item is indexable by mongodb
    * @returns {SchemaItem}
    */
    public setIndexable(val?: boolean): SchemaItem<T>
    {
        this._indexable = val;
        return this;
    }

    /**
    * Gets if this item is required. If true, then validations will fail if they are not specified
    * @returns {boolean}
    */
    public getRequired(): boolean { return this._required; }

    /**
    * Sets if this item is required. If true, then validations will fail if they are not specified
    * @returns {SchemaItem}
    */
    public setRequired(val?: boolean): SchemaItem<T>
    {
        this._required = val;
        return this;
    }

    /**
	* Gets if this item represents a unique value in the database. An example might be a username
	* @returns {boolean}
	*/
    public getUnique(): boolean { return this._unique; }

    /**
	* Sets if this item represents a unique value in the database. An example might be a username
	* @returns {SchemaItem}
	*/
    public setUnique(val?: boolean): SchemaItem<T>
    {
        this._unique = val;
        return this;
    }

    /**
    * Gets if this item must be indexed when searching for uniqueness. For example, an item 'name' might be set as unique. But
    * we might not be checking uniqueness for all items where name is the same. It might be where name is the same, but only in
    * a given project. In this case the project item is set as a uniqueIndexer
    * @returns {boolean}
    */
    public getUniqueIndexer(): boolean { return this._uniqueIndexer; }

    /**
	* Sets if this item must be indexed when searching for uniqueness. For example, an item 'name' might be set as unique. But
    * we might not be checking uniqueness for all items where name is the same. It might be where name is the same, but only in
    * a given project. In this case the project item is set as a uniqueIndexer
	* @returns {SchemaItem}
	*/
    public setUniqueIndexer(val?: boolean): SchemaItem<T>
    {
        this._uniqueIndexer = val;
        return this;
    }

    /**
    * Gets if this item is sensitive
    * @returns {boolean}
    */
    public getSensitive(): boolean
    {
        return this._sensitive;
    }

    /**
    * Gets if this item has been edited since its creation
    * @returns {boolean}
    */
    public getModified(): boolean
    {
        return this._modified;
    }

    /**
    * Sets if this item is sensitive
    * @returns {SchemaItem<T>}
    */
    public setSensitive(val: boolean): SchemaItem<T>
    {
        this._sensitive = val;
        return this;
    }

	/**
	* Checks the value stored to see if its correct in its current form
	* @returns {boolean | string} Returns true if successful or an error message string if unsuccessful
	*/
	public validate(): boolean | string
	{
		return true;
    }

    /**
	* Gets the value of this item
    * @returns {SchemaValue}
	*/
    public getValue(): T
    {
        return this.value;
    }

    /**
	* Sets the value of this item
    * @param {T} val The value to set
    * @returns {SchemaValue}
	*/
    public setValue(val : T): T
    {
        this._modified = true;
        return this.value = val;
    }
}