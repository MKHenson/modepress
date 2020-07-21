import * as assert from 'assert';
import header from '../header';
import { IAdminUser } from '../../../src';
import { LoginInput } from '../../../src/graphql/models/auth-type';
import { LOGIN } from '../../../src/graphql/client/requests/auth';
import { AuthResponse } from '../../../src/graphql/models/auth-type';

describe('[GQL] Testing user logging in', function() {
  it('[GQL] did not log in with empty credentials', async function() {
    const { errors } = await header.guest.graphql<AuthResponse>(LOGIN, { token: {} });
    assert.deepEqual(
      errors![0].message,
      'Variable "$token" got invalid value {}; Field username of required type String! was not provided.'
    );
    assert.deepEqual(
      errors![1].message,
      'Variable "$token" got invalid value {}; Field password of required type String! was not provided.'
    );
  });

  it('[GQL] did not log in with bad credentials', async function() {
    const { errors } = await header.guest.graphql<AuthResponse>(LOGIN, {
      token: new LoginInput({
        username: '"!%^',
        password: '"!%^'
      })
    });

    assert.deepEqual(errors![0].message, 'Please only use alpha numeric characters for your username');
  });

  it('[GQL] did not log in with false credentials', async function() {
    const { errors } = await header.guest.graphql<AuthResponse>(LOGIN, {
      token: new LoginInput({
        username: 'GeorgeTheTwat',
        password: 'FakePass'
      })
    });

    assert.deepEqual(errors![0].message, 'The username or password is incorrect.');
  });

  it('[GQL] did not log in with a valid username but invalid password', async function() {
    const { errors } = await header.guest.graphql<AuthResponse>(LOGIN, {
      token: new LoginInput({
        username: (header.config.adminUser as IAdminUser).username,
        password: 'FakePass'
      })
    });

    assert.deepEqual(errors![0].message, 'The username or password is incorrect.');
  });

  it('[GQL] did log in with a valid username & valid password', async function() {
    const resp = await header.guest.graphql<AuthResponse>(LOGIN, {
      token: new LoginInput({
        username: (header.config.adminUser as IAdminUser).username,
        password: (header.config.adminUser as IAdminUser).password
      })
    });

    assert.deepEqual(resp.data.authenticated, true);
    header.admin.updateCookie(resp.response);
  });
});
