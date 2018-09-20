import { getJson, makeQueryString, del, putJson, postJson, apiUrl } from './http-clients';
import { IPost } from '../types/models/i-post';
import { Page } from '../types/tokens/standard-tokens';
import { PostsGetAllOptions } from '../controllers/posts';

const rootPath = `${apiUrl}/posts`;

export async function getAll( options: Partial<PostsGetAllOptions> ) {
  const page = await getJson<Page<IPost<'client'>>>( rootPath + makeQueryString( options ) );
  return page;
}

export async function getOne( options: { id: string; verbose?: boolean; } ) {
  const page: IPost<'client'> = await getJson<IPost<'client'>>( `${rootPath}/${options.id}${options.verbose ? makeQueryString( { verbose: true } ) : ''}` );
  return page;
}

export async function getBySlug( options: { slug: string; verbose?: boolean; } ) {
  const page: IPost<'client'> = await getJson<IPost<'client'>>( `${rootPath}/slug/${options.slug}${options.verbose ? makeQueryString( { verbose: true } ) : ''}` );
  return page;
}

export function remove( id: string ) {
  return del( `${rootPath}/${id}` );
}

export function update( id: string, token: Partial<IPost<'client'>> ) {
  return putJson<IPost<'client'>>( `${rootPath}/${id}`, token );
}

export function create( token: Partial<IPost<'client'>> ) {
  return postJson<IPost<'client'>>( rootPath, token );
}