﻿import {SchemaItem} from "./schema-item";
import {ISchemaOptions} from "modepress-api";

/**
* Describes the type of number to store
*/
export enum NumberType
{
	Integer,
	Float
}

/**
* A numeric schema item for use in Models
*/
export class SchemaNumber extends SchemaItem<number>
{
	public min: number;
	public max: number;
	public type: NumberType;
	public decimalPlaces: number;

	/**
	* Creates a new schema item
	* @param {string} name The name of this item
	* @param {number} val The default value of this item
	* @param {number} min [Optional] The minimum value the value can be
	* @param {number} max [Optional] The maximum value the value can be
	* @param {NumberType} type [Optional] The type of number the schema represents
	* @param {number} decimalPlaces [Optional] The number of decimal places to use if the type is a Float
	*/
    constructor(name: string, val: number, min: number = -Infinity, max: number = Infinity, type: NumberType = NumberType.Integer, decimalPlaces: number = 2)
	{
        super(name, val);
		this.min = min;
		this.max = max;
        this.type = type;

        if (decimalPlaces > 20)
            throw new Error(`Decimal palces for ${name} cannot be more than 20`);

        this.decimalPlaces = decimalPlaces;
	}

	/**
	* Creates a clone of this item
	* @returns {SchemaNumber} copy A sub class of the copy
	* @returns {SchemaNumber}
	*/
	public clone(copy?: SchemaNumber): SchemaNumber
    {
        copy = copy === undefined ? new SchemaNumber(this.name, <number>this.value ) : copy;
		super.clone(copy);

		copy.min = this.min;
		copy.max = this.max;
		copy.type = this.type;
		copy.decimalPlaces = this.decimalPlaces;
		return copy;
	}

	/**
	* Checks the value stored to see if its correct in its current form
	* @returns {Promise<boolean|Error>}
	*/
	public validate(): Promise<boolean|Error>
	{
		var type = this.type;
		var decimalPlaces = this.decimalPlaces;
		var transformedValue: number = <number>this.value;

        if (type == NumberType.Integer)
            transformedValue = parseInt(transformedValue.toString());
		else
            transformedValue = parseFloat( (parseFloat(transformedValue.toString()).toFixed(decimalPlaces)));

		this.value = transformedValue;

		if (transformedValue <= this.max && transformedValue >= this.min)
			return Promise.resolve(true);
		else
			return Promise.reject<Error>( new Error(`The value of ${this.name} is not within the range of  ${this.min} and ${this.max}`));
    }
}