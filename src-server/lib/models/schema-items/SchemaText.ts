﻿import {SchemaItem} from "./SchemaItem";
import sanitizeHtml = require("sanitize-html");

/**
* A text scheme item for use in Models
*/
export class SchemaText extends SchemaItem<string>
{
    public minCharacters: number;
    public maxCharacters: number;

	/**
	* Creates a new schema item
	* @param {string} name The name of this item
	* @param {string} val The text of this item
    * @param {number} minCharacters [Optional] Specify the minimum number of characters for use with this text item
	* @param {number} maxCharacters [Optional] Specify the maximum number of characters for use with this text item
    * @param {boolean} sensitive [Optional] If true, this item is treated sensitively and only authorised people can view it
	*/
    constructor(name: string, val: string, minCharacters: number = 0, maxCharacters: number = 10000, sensitive: boolean = false)
    {
        val = sanitizeHtml(val, { allowedTags: [] });
        super(name, val, sensitive);
        this.maxCharacters = maxCharacters;
        this.minCharacters = minCharacters;
	}

	/**
	* Creates a clone of this item
	* @returns {SchemaText} copy A sub class of the copy
	* @returns {SchemaText}
	*/
	public clone(copy?: SchemaText): SchemaText
	{
		copy = copy === undefined ? new SchemaText(this.name, <string>this.value) : copy;
		super.clone(copy);

        copy.maxCharacters = this.maxCharacters;
        copy.minCharacters = this.minCharacters;
		return copy;
	}

	/**
	* Checks the value stored to see if its correct in its current form
	* @returns {boolean | string} Returns true if successful or an error message string if unsuccessful
	*/
	public validate(): boolean | string
	{
        var maxCharacters = this.maxCharacters;
        var minCharacters = this.minCharacters;
        var transformedValue = <string>this.value;

		if (transformedValue.length > maxCharacters)
            return `The character length of ${this.name} is too long, please keep it below ${maxCharacters}`;
        else if (transformedValue.length < minCharacters)
            return `The character length of ${this.name} is too short, please keep it above ${minCharacters}`;
		else
			return true;
    }

    /**
	* Gets the value of this item
    * @param {boolean} sanitize If true, the item has to sanitize the data before sending it
    * @returns {SchemaValue}
	*/
    public getValue(sanitize: boolean = false): string
    {
        if (this.sensitive && sanitize)
            return new Array((<string>this.value).length).join("*");
        else
            return this.value;
    }
}