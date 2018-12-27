

export type ITextOptions = {
  /** Specify the minimum number of characters for use with this text item */
  minCharacters?: number;
  /** Specify the maximum number of characters for use with this text item */
  maxCharacters?: number;
  /** If true, the text is cleaned of HTML before insertion. The default is true */
  htmlClean?: boolean;
}

export type ITextArrOptions = {
  /** Specify the minimum number of items that can be allowed */
  minItems?: number;
  /** Specify the maximum number of items that can be allowed */
  maxItems?: number;
  /** Specify the minimum number of characters for each text item */
  minCharacters?: number;
  /** Specify the maximum number of characters for each text item */
  maxCharacters?: number;
}

export type NumType = 'Int' | 'Float';

export type INumOptions = {
  /** The minimum value the value can be */
  min?: number;
  /** The maximum value the value can be */
  max?: number;
  /** The type of number the schema represents */
  type?: NumType;
  /** The number of decimal places to use if the type is a Float */
  decimalPlaces?: number;
}

export type INumArrOptions = {
  /** Specify the minimum number of items that can be allowed */
  minItems?: number;
  /** Specify the maximum number of items that can be allowed */
  maxItems?: number;
  /** Specify the minimum a number can be */
  min?: number;
  /** Specify the maximum a number can be */
  max?: number;
  /** What type of numbers to expect */
  type?: 'Int' | 'Float';
  /** The number of decimal places to use if the type is a Float */
  decimalPlaces?: number;
}

export type IIdArrOptions = {
  /** Specify the minimum number of items that can be allowed */
  minItems?: number;
  /** Specify the maximum number of items that can be allowed */
  maxItems?: number;
}

export type IHtmlOptions = {
  /** The tags allowed by the html parser */
  allowedTags?: string[] | false,
  /** The attributes allowed by each attribute */
  allowedAttributes?: { [ name: string ]: Array<string> } | false;
  /** If true, the server will disallow a save or insert value with banned html. If false, the value will be transformed silently for you */
  errorBadHTML?: boolean;
  /** Specify the minimum number of characters for use with this text item */
  minCharacters?: number;
  /** Specify the maximum number of characters for use with this text item */
  maxCharacters?: number;
}

export type IForeignKeyOptions = {
  /** If true, then the key is allowed to be null */
  keyCanBeNull: boolean;
}

export type IDateOptions = {
  /** If true, the date will always be updated to use the current date */
  useNow?: boolean;
}