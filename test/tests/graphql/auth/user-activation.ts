import * as assert from 'assert';
import header from '../../header';
import { REMOVE_USER, GET_USER } from '../../../../src/graphql/client/requests/users';
import { REGISTER, LOGIN, RESEND_ACTIVATION } from '../../../../src/graphql/client/requests/auth';
import { RegisterInput, AuthResponse, LoginInput } from '../../../../src/graphql/models/auth-type';
import { User } from '../../../../src/graphql/models/user-type';

let testUserName = 'fancyUser123',
  testUserEmail = 'fancyUser123@fancy.com',
  activationKey: string;

describe('[GQL] Testing user activation', function() {
  before(async function() {
    await header.admin.graphql<{ removeUser: boolean }>(REMOVE_USER, {
      username: testUserName
    });
  });

  after(async function() {
    await header.admin.graphql<{ removeUser: boolean }>(REMOVE_USER, {
      username: testUserName
    });
  });

  it('[GQL] should register with valid information', async function() {
    const resp = await header.guest.graphql<AuthResponse>(REGISTER, {
      token: new RegisterInput({ username: testUserName, password: 'Password', email: testUserEmail })
    });
    assert.deepEqual(resp.data.message, 'Please activate your account with the link sent to your email address');
  });

  it(`[GQL] user is not activated`, async function() {
    const resp = await header.admin.graphql<User>(GET_USER, { user: testUserName });
    assert.deepEqual(resp.data.isActivated, false);
  });

  it('[GQL] did not log in with an activation code present', async function() {
    const resp = await header.guest.graphql<AuthResponse>(LOGIN, {
      token: new LoginInput({ username: testUserName, password: 'Password' })
    });

    assert.deepEqual(
      resp.errors[0].message,
      'Please authorise your account by clicking on the link that was sent to your email'
    );
  });

  it('[GQL] did not resend an activation with an invalid user', async function() {
    const resp = await header.guest.graphql<boolean>(RESEND_ACTIVATION, {
      username: 'NONUSER5'
    });

    assert.deepEqual(resp.errors[0].message, 'No user exists with the specified details');
  });

  it('[GQL] did resend an activation email with a valid user', async function() {
    const resp = await header.guest.graphql<boolean>(RESEND_ACTIVATION, {
      username: testUserName
    });
    assert.deepEqual(resp.data, true);
  });

  it('[GQL] did not activate the account now that the activation key has changed', async function() {
    const resp = await header.guest.get(`/api/auth/activate-account?user=${testUserName}&key=${activationKey}`, null, {
      redirect: 'manual'
    });
    assert.deepEqual(resp.status, 302);
    assert.deepEqual(resp.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert(resp.headers.get('location').indexOf('error') !== -1);
  });

  it(`[GQL] did not get the activation key for ${testUserName} as a guest`, async function() {
    let response = await header.guest.graphql<User>(GET_USER, { user: testUserName });
    assert.deepEqual(response.data.registerKey, null);
  });

  it(`[GQL] did not get the activation key for ${testUserName} as a registered user`, async function() {
    let response = await header.user1.graphql<User>(GET_USER, { user: testUserName });
    assert.deepEqual(response.data.registerKey, null);
  });

  it(`[GQL] did get the renewed activation key for ${testUserName} as an admin`, async function() {
    const response = await header.admin.graphql<User>(GET_USER, { user: testUserName });
    activationKey = response.data.registerKey;
    assert(activationKey);
  });

  it('[GQL] did not activate with an invalid username', async function() {
    const resp = await header.guest.get(`/api/auth/activate-account?user=NONUSER`, null, { redirect: 'manual' });
    assert.deepEqual(resp.status, 302);
    assert.deepEqual(resp.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert(resp.headers.get('location').indexOf('error') !== -1);
  });

  it('[GQL] did not activate with an valid username and no key', async function() {
    const resp = await header.guest.get(`/api/auth/activate-account?user=${testUserName}`, null, {
      redirect: 'manual'
    });
    assert.deepEqual(resp.status, 302);
    assert.deepEqual(resp.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert(resp.headers.get('location').indexOf('error') !== -1);
  });

  it('[GQL] did not activate with an valid username and invalid key', async function() {
    const resp = await header.guest.get(`/api/auth/activate-account?user=${testUserName}&key=123`, null, {
      redirect: 'manual'
    });
    assert.deepEqual(resp.status, 302);
    assert.deepEqual(resp.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert(resp.headers.get('location').indexOf('error') !== -1);
  });

  it('[GQL] did activate with a valid username and key', async function() {
    const resp = await header.guest.get(`/api/auth/activate-account?user=${testUserName}&key=${activationKey}`, null, {
      redirect: 'manual'
    });
    assert.deepEqual(resp.status, 302);
    assert.deepEqual(resp.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert(resp.headers.get('location').indexOf('success') !== -1);
  });

  it('[GQL] did log in with valid details and an activated account', async function() {
    const {
      data: { authenticated }
    } = await header.guest.graphql<AuthResponse>(LOGIN, {
      token: new LoginInput({
        username: testUserName,
        password: 'Password'
      })
    });
    assert(authenticated);
  });
});
