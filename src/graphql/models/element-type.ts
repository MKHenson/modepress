import { GraphQLObjectType, GraphQLString, GraphQLID, GraphQLEnumType, GraphQLInputObjectType } from 'graphql';
import Controllers from '../../core/controller-factory';
import { DocumentType } from './document-type';
import { IDraftElement, DraftElements, IImageElement } from '../../types/models/i-draft-elements';
import { FileType } from './file-type';

const values: { [type: string]: { value: DraftElements } } = {
  ElmParagraph: { value: 'elm-paragraph' },
  ElmList: { value: 'elm-list' },
  ElmImage: { value: 'elm-image' },
  ElmCode: { value: 'elm-code' },
  ElmHeader1: { value: 'elm-header-1' },
  ElmHeader2: { value: 'elm-header-2' },
  ElmHeader3: { value: 'elm-header-3' },
  ElmHeader4: { value: 'elm-header-4' },
  ElmHeader5: { value: 'elm-header-5' },
  ElmHeader6: { value: 'elm-header-6' },
  ElmHtml: { value: 'elm-html' }
};

export const ElementTypeEnum = new GraphQLEnumType({
  name: 'ElementTypeEnum',
  values: values
});

export const ElementType = new GraphQLObjectType({
  name: 'Element',
  fields: () => ({
    _id: { type: GraphQLID },
    parent: {
      type: DocumentType,
      resolve: (parent: IDraftElement<'client'>) => {
        if (typeof parent.parent === 'string')
          return Controllers.get('documents').get({ id: parent.parent as string, expandForeignKeys: false });
        else return parent.parent;
      }
    },
    type: { type: GraphQLString },
    html: { type: GraphQLString },
    zone: { type: GraphQLString },
    image: {
      type: FileType,
      resolve(parent: IImageElement<'client'>, args) {
        if (!parent.image) return null;
        if (typeof parent.image === 'string') return Controllers.get('files').getFile(parent.image);
        return parent.image;
      }
    }
  })
});

export const ElementInputType = new GraphQLInputObjectType({
  name: 'ElementInput',
  fields: () => ({
    _id: { type: GraphQLID },
    type: { type: ElementTypeEnum },
    html: { type: GraphQLString },
    zone: { type: GraphQLString },
    image: { type: GraphQLID }
  })
});
