var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var schemaModule = require("./SchemaItem");
/**
* Describes the type of number to store
*/
(function (NumberType) {
    NumberType[NumberType["Integer"] = 0] = "Integer";
    NumberType[NumberType["Float"] = 1] = "Float";
})(exports.NumberType || (exports.NumberType = {}));
var NumberType = exports.NumberType;
/**
* A numeric scheme for use in Models
*/
var SchemaText = (function (_super) {
    __extends(SchemaText, _super);
    /**
    * Creates a new schema item
    * @param {string} name The name of this item
    * @param {string} val The text of this item
    */
    function SchemaText(name, val, maxCharacters) {
        if (maxCharacters === void 0) { maxCharacters = 10000; }
        _super.call(this, name, val);
        this.maxCharacters = maxCharacters;
    }
    /**
    * Creates a clone of this item
    * @returns {SchemaText} copy A sub class of the copy
    * @returns {SchemaText}
    */
    SchemaText.prototype.clone = function (copy) {
        copy = copy === undefined ? new SchemaText(this.name, this.value) : copy;
        _super.prototype.clone.call(this, copy);
        copy.maxCharacters = this.maxCharacters;
        return copy;
    };
    /**
    * Checks the value stored to see if its correct in its current form
    * @returns {boolean | string} Returns true if successful or an error message string if unsuccessful
    */
    SchemaText.prototype.validate = function () {
        var maxCharacters = this.maxCharacters;
        var transformedValue = this.value;
        if (transformedValue.length > maxCharacters)
            return "The character length of " + this.name + " is too long, please keep it below " + maxCharacters;
        else
            return true;
    };
    return SchemaText;
})(schemaModule.SchemaItem);
exports.SchemaText = SchemaText;
/**
* A numeric scheme for use in Models
*/
var SchemaNumber = (function (_super) {
    __extends(SchemaNumber, _super);
    /**
    * Creates a new schema item
    * @param {string} name The name of this item
    * @param {number} val The value of this item
    */
    function SchemaNumber(name, val, min, max, type, decimalPlaces) {
        if (min === void 0) { min = -Infinity; }
        if (max === void 0) { max = Infinity; }
        if (type === void 0) { type = 1 /* Float */; }
        if (decimalPlaces === void 0) { decimalPlaces = Infinity; }
        _super.call(this, name, val);
        this.min = min;
        this.max = max;
        this.type = type;
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
        if (type == 0 /* Integer */)
            transformedValue = parseInt(transformedValue.toFixed(decimalPlaces));
        else
            transformedValue = parseFloat(transformedValue.toFixed(decimalPlaces));
        this.value = transformedValue;
        if (transformedValue <= this.max && transformedValue >= this.min)
            return true;
        else
            return "The value of " + this.name + " is not within the range of  " + this.min + " and " + this.max;
    };
    return SchemaNumber;
})(schemaModule.SchemaItem);
exports.SchemaNumber = SchemaNumber;
