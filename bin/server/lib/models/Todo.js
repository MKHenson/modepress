var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var models = require("./Model");
var sFactory = require("./schema-items/SchemaItemFactory");
var TodoModel = (function (_super) {
    __extends(TodoModel, _super);
    function TodoModel() {
        _super.call(this, "todos");
        this.defaultSchema.add(sFactory.number("order", 1, 0, Infinity, "int", 0));
        this.defaultSchema.add(sFactory.text("id", "0"));
        this.defaultSchema.add(sFactory.text("title", "New Todo", 20));
    }
    return TodoModel;
})(models.Model);
exports.TodoModel = TodoModel;
