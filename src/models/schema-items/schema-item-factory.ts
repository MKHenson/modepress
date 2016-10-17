﻿import * as numbers from "./schema-number";
import { SchemaText } from "./schema-text";
import { SchemaBool } from "./schema-bool";
import { SchemaDate } from "./schema-date";
import { SchemaTextArray } from "./schema-text-array";
import { SchemaJSON } from "./schema-json";
import { SchemaIdArray } from "./schema-id-array";
import { SchemaNumArray } from "./schema-num-array";
import { SchemaId } from "./schema-id";
import { SchemaHtml } from "./schema-html";
import { SchemaForeignKey } from "./schema-foreign-key";

export var NumberType = numbers.NumberType;
export var num = numbers.SchemaNumber;
export var text = SchemaText;
export var textArray = SchemaTextArray;
export var json = SchemaJSON;
export var idArray = SchemaIdArray;
export var numArray = SchemaNumArray;
export var date = SchemaDate;
export var bool = SchemaBool;
export var id = SchemaId;
export var html = SchemaHtml;
export var foreignKey = SchemaForeignKey;