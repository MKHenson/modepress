import { getJson, makeQueryString, del, putJson, postJson, apiUrl } from './http-clients';
import { Page } from '../types/tokens/standard-tokens';
import { IVolume } from '../types/models/i-volume-entry';
import { VolumesGetOptions } from '../controllers/volumes';

const rootPath = `${apiUrl}/volumes`;

export async function getAll( options: Partial<VolumesGetOptions> ) {
  const page = await getJson<Page<IVolume<'client'>>>( `${rootPath}` + makeQueryString( options as any ) );
  return page;
}

export async function getOne( id: string ) {
  const page = await getJson<IVolume<'client'>>( `${rootPath}/${id}` );
  return page;
}

export function remove( id: string ) {
  return del( `${rootPath}/${id}` );
}

export function update( id: string, token: Partial<IVolume<'client'>> ) {
  return putJson<IVolume<'client'>>( `${rootPath}/${id}`, token );
}

export function create( volume: Partial<IVolume<'client'>> ) {
  return postJson<IVolume<'client'>>( `${rootPath}`, volume );
}