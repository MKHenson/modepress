﻿import {SchemaItem} from "./schema-item";

/**
* A bool scheme item for use in Models
*/
export class SchemaBool extends SchemaItem<boolean>
{
	/**
	* Creates a new schema item
	* @param {string} name The name of this item
	* @param {boolean} val The value of this item
	*/
    constructor(name: string, val: boolean)
    {
        super(name, val);
	}

	/**
	* Creates a clone of this item
	* @returns {SchemaBool} copy A sub class of the copy
	* @returns {SchemaBool}
	*/
    public clone(copy?: SchemaBool): SchemaBool
    {
        copy = copy === undefined ? new SchemaBool(this.name, <boolean>this.value) : copy;
		super.clone(copy);
		return copy;
	}

	/**
	* Always true
	* @returns {boolean | string} Returns true if successful or an error message string if unsuccessful
	*/
	public validate(): boolean | string
	{
        var val = super.validate();
        if (!val)
            return false;

        return true;
    }

    /**
	* Gets the value of this item
    * @returns {boolean}
	*/
    public getValue(): boolean
    {
        return this.value;
    }
}