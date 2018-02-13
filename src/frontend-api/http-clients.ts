export const apiUrl = '/api';

export class ClientError extends Error {
  public response: Response;
  public code: number;

  constructor( message: string, code: number, response: Response ) {
    super( message );
    this.response = response;
    this.code = code;
  }
}

export function makeQueryString( options: Partial<{ [ name: string ]: boolean | string | number | Array<any> }> ) {
  let toRet = '?';
  for ( const i in options ) {
    toRet += `${i}=`;
    switch ( typeof options[ i ] ) {
      case 'object':
        if ( options[ i ]!.constructor === Array )
          toRet += ( options[ i ] as Array<string> ).join( ',' );
        break;
      case 'string':
      case 'number':
      case 'boolean':
        toRet += options[ i ];
        break;
      default:
        toRet += options[ i ]!.toString();
    }

    toRet += '&';
  }

  return encodeURI( toRet );
}

export async function getJson<T>( url: string ) {
  const resp = await get( url );
  return await resp.json() as T;
}

export async function get( url: string ) {
  const resp = await fetch( url, {
    credentials: 'include',
    headers: new Headers( {
      'content-type': 'application/json'
    } )
  } );

  if ( resp.status >= 400 && resp.status <= 500 )
    throw new ClientError( resp.statusText, resp.status, resp );

  return resp;
}

export async function postJson<T>( url: string, data: any ) {
  const resp = await post( url, data );
  return await resp.json() as T;
}

export async function post( url: string, data: any ) {
  const resp = await fetch( url, {
    method: 'post',
    body: JSON.stringify( data ),
    credentials: 'include',
    headers: new Headers( {
      'content-type': 'application/json'
    } )
  } );

  if ( resp.status >= 400 && resp.status <= 500 )
    throw new ClientError( resp.statusText, resp.status, resp );

  return resp;
}

export async function delJson<T>( url: string, data: any ) {
  const resp = await del( url, data );
  return await resp.json() as T;
}

export async function del( url: string, data?: any ) {
  const resp = await fetch( url, {
    method: 'delete',
    body: data ? JSON.stringify( data ) : undefined,
    credentials: 'include',
    headers: new Headers( {
      'content-type': 'application/json'
    } )
  } );

  if ( resp.status >= 400 && resp.status <= 500 )
    throw new ClientError( resp.statusText, resp.status, resp );

  return resp;
}

export async function putJson<T>( url: string, data: any ) {
  const resp = await put( url, data );
  return await resp.json() as T;
}

export async function put( url: string, data?: any ) {
  const resp = await fetch( url, {
    method: 'put',
    body: data ? JSON.stringify( data ) : undefined,
    credentials: 'include',
    headers: new Headers( {
      'content-type': 'application/json'
    } )
  } );

  if ( resp.status >= 400 && resp.status <= 500 )
    throw new ClientError( resp.statusText, resp.status, resp );

  return resp;
}