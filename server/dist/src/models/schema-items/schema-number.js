"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var schema_item_1 = require("./schema-item");
/**
* Describes the type of number to store
*/
(function (NumberType) {
    NumberType[NumberType["Integer"] = 0] = "Integer";
    NumberType[NumberType["Float"] = 1] = "Float";
})(exports.NumberType || (exports.NumberType = {}));
var NumberType = exports.NumberType;
/**
* A numeric schema item for use in Models
*/
var SchemaNumber = (function (_super) {
    __extends(SchemaNumber, _super);
    /**
    * Creates a new schema item
    * @param {string} name The name of this item
    * @param {number} val The default value of this item
    * @param {number} min [Optional] The minimum value the value can be
    * @param {number} max [Optional] The maximum value the value can be
    * @param {NumberType} type [Optional] The type of number the schema represents
    * @param {number} decimalPlaces [Optional] The number of decimal places to use if the type is a Float
    * @param {boolean} sensitive [Optional] If true, this item is treated sensitively and only authorised people can view it
    */
    function SchemaNumber(name, val, min, max, type, decimalPlaces, sensitive) {
        if (min === void 0) { min = -Infinity; }
        if (max === void 0) { max = Infinity; }
        if (type === void 0) { type = NumberType.Integer; }
        if (decimalPlaces === void 0) { decimalPlaces = 2; }
        if (sensitive === void 0) { sensitive = false; }
        _super.call(this, name, val, sensitive);
        this.min = min;
        this.max = max;
        this.type = type;
        if (decimalPlaces > 20)
            throw new Error("Decimal palces for " + name + " cannot be more than 20");
        this.decimalPlaces = decimalPlaces;
    }
    /**
    * Creates a clone of this item
    * @returns {SchemaNumber} copy A sub class of the copy
    * @returns {SchemaNumber}
    */
    SchemaNumber.prototype.clone = function (copy) {
        copy = copy === undefined ? new SchemaNumber(this.name, this.value) : copy;
        _super.prototype.clone.call(this, copy);
        copy.min = this.min;
        copy.max = this.max;
        copy.type = this.type;
        copy.decimalPlaces = this.decimalPlaces;
        return copy;
    };
    /**
    * Checks the value stored to see if its correct in its current form
    * @returns {boolean | string} Returns true if successful or an error message string if unsuccessful
    */
    SchemaNumber.prototype.validate = function () {
        var type = this.type;
        var decimalPlaces = this.decimalPlaces;
        var transformedValue = this.value;
        if (type == NumberType.Integer)
            transformedValue = parseInt(transformedValue.toString());
        else
            transformedValue = parseFloat((parseFloat(transformedValue.toString()).toFixed(decimalPlaces)));
        this.value = transformedValue;
        if (transformedValue <= this.max && transformedValue >= this.min)
            return true;
        else
            return "The value of " + this.name + " is not within the range of  " + this.min + " and " + this.max;
    };
    /**
    * Gets the value of this item
    * @returns {SchemaValue}
    */
    SchemaNumber.prototype.getValue = function () {
        return this.value;
    };
    return SchemaNumber;
}(schema_item_1.SchemaItem));
exports.SchemaNumber = SchemaNumber;
