import '../graphql/scalars/enums';
import { printSchema } from 'graphql';
import { writeFileSync } from 'fs';
import { buildSchema, AuthChecker } from 'type-graphql';
import { CategoryResolver } from '../graphql/resolvers/category-resolver';
import { UserResolver } from '../graphql/resolvers/user-resolver';
import { AuthResolver } from '../graphql/resolvers/auth-resolver';
import { VolumeResolver } from '../graphql/resolvers/volume-resolver';
import { FileResolver } from '../graphql/resolvers/file-resolver';
import { DocumentResolver } from '../graphql/resolvers/document-resolver';
import ControllerFactory from './controller-factory';
import { UserPrivilege } from './enums';
import { IGQLContext } from '../types/interfaces/i-gql-context';
import { error, info } from '../utils/logger';
import { TemplateResolver } from '../graphql/resolvers/template-resolver';
import { PostResolver } from '../graphql/resolvers/post-resolver';

export async function generateSchema() {
  const schema = await buildSchema({
    resolvers: [
      CategoryResolver,
      PostResolver,
      VolumeResolver,
      FileResolver,
      UserResolver,
      AuthResolver,
      TemplateResolver,
      DocumentResolver
    ],
    authChecker: customAuthChecker
  });

  return schema;
}

export const customAuthChecker: AuthChecker<IGQLContext> = async ({ root, args, context, info }, roles) => {
  const selectedRoles: UserPrivilege[] = roles as UserPrivilege[];

  // here we can read the user from context
  // and check his permission in the db against the `roles` argument
  // that comes from the `@Authorized` decorator, eg. ["ADMIN", "MODERATOR"]
  const session = await ControllerFactory.get('sessions').getSession(context.req);

  if (!session) return false;

  // Set the response header session
  await ControllerFactory.get('sessions').setSessionHeader(session, context.req, context.res);

  context.user = session.user;
  context.isAdmin = session.user.privileges === UserPrivilege.admin || session.user.privileges === UserPrivilege.super;

  if (session.user.privileges === 'super' || session.user.privileges === 'admin') return true;
  if (selectedRoles.includes(session.user.privileges)) return true;
  else return false;
};

export async function writeSchemaToFile(file: string) {
  try {
    info('Starting Schema generatation...');
    const schema = await generateSchema();
    info('Schema generated...');
    writeFileSync(file, printSchema(schema), 'utf8');
    info(`Schema written to ["${file}"]...`);
  } catch (err) {
    error(`Something went wrong`);
    error(`Could not generate schema ["${err.message} ${err.stack}"]`);
  }
}
