import { GraphQLObjectType, GraphQLString, GraphQLID, GraphQLList } from 'graphql';
import { LongType } from '../scalars/long';
import { UserType } from './user-type';
import { IDocument } from '../../types/models/i-document';
import Controllers from '../../core/controller-factory';
import { TemplateType } from './template-type';
import { ElementType } from './element-type';
import { JsonType } from '../scalars/json';

export const DocumentType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Document',
  fields: () => ({
    _id: { type: GraphQLID },
    author: {
      type: UserType,
      resolve: (parent: IDocument<'client'>) => {
        if (typeof parent.author === 'string')
          return Controllers.get('users').getUser({ id: parent.author as string, expandForeignKeys: false });
        else return parent.author;
      }
    },
    template: {
      type: TemplateType,
      resolve: (parent: IDocument<'client'>) => {
        if (typeof parent.template === 'string') return Controllers.get('templates').get(parent.template as string);
        else return parent.template;
      }
    },
    lastUpdated: { type: LongType },
    createdOn: { type: LongType },
    elementsOrder: { type: new GraphQLList(GraphQLString) },
    elements: { type: new GraphQLList(ElementType) },
    html: { type: JsonType }
  })
});
