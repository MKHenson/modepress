import * as assert from 'assert';
import header from '../header';
import { REMOVE_USER, GET_USER } from '../../../src/graphql/client/requests/users';
import { REGISTER, APPROVE_ACTIVATION } from '../../../src/graphql/client/requests/auth';
import { RegisterInput } from '../../../src/graphql/models/auth-type';
import { User } from '../../../src/graphql/models/user-type';

let testUserName = 'fancyUser123',
  testUserEmail = 'fancyUser123@fancy.com';

describe('[GQL] Testing registering a user', function() {
  before(async function() {
    await header.admin.graphql<boolean>(REMOVE_USER, { username: testUserName });
  });

  after(async function() {
    await header.admin.graphql<boolean>(REMOVE_USER, { username: testUserName });
  });

  it('[GQL] should not register without username, password & email', async function() {
    const response = await header.guest.graphql<{ message: string }>(REGISTER, {
      token: new RegisterInput({})
    });
    assert.deepEqual(
      response.errors![0].message,
      'Variable "$token" got invalid value {}; Field username of required type String! was not provided.'
    );
    assert.deepEqual(
      response.errors![1].message,
      'Variable "$token" got invalid value {}; Field password of required type String! was not provided.'
    );
    assert.deepEqual(
      response.errors![2].message,
      'Variable "$token" got invalid value {}; Field email of required type String! was not provided.'
    );
  });

  it('[GQL] should not register with an incorrect email format', async function() {
    const { errors } = await header.guest.graphql<{ message: string }>(REGISTER, {
      token: new RegisterInput({
        username: 'textok',
        password: 'textok',
        email: 'bademail'
      })
    });
    assert.deepEqual(errors![0].message, 'Argument Validation Error');
  });

  it('[GQL] should not register with bad characters in the username', async function() {
    const { errors } = await header.guest.graphql<{ message: string }>(REGISTER, {
      token: new RegisterInput({
        username: '!�$%^^&&*()-=~#}{}',
        password: 'somepassword',
        email: 'FakeEmail@test.com'
      })
    });
    assert.deepEqual(errors![0].message, 'Please only use alpha numeric characters for your username');
  });

  it('[GQL] should not register with existing username', async function() {
    const response = await header.guest.graphql<{ message: string }>(REGISTER, {
      token: new RegisterInput({
        username: header.admin.username,
        password: 'FakePass',
        email: 'FakeEmail@test.com'
      })
    });

    assert.deepEqual(
      response.errors![0].message,
      'That username or email is already in use; please choose another or login.'
    );
  });

  it('[GQL] should register with valid information', async function() {
    const resp = await header.guest.graphql<{ message: string }>(REGISTER, {
      token: new RegisterInput({
        username: testUserName,
        password: 'Password',
        email: testUserEmail
      })
    });

    assert.deepEqual(resp.data.message, 'Please activate your account with the link sent to your email address');
  });

  it(`[GQL] new registered user is not activated`, async function() {
    const resp = await header.admin.graphql<User>(GET_USER, { user: testUserName });
    assert.deepEqual(resp.data.isActivated, false);
  });

  it('[GQL] did not approve activation as a guest', async function() {
    const { errors } = await header.guest.graphql<boolean>(APPROVE_ACTIVATION, {
      user: testUserName
    });
    assert.deepEqual(errors![0].message, `Access denied! You don't have permission for this action!`);
  });

  it('[GQL] did not approve activation as a regular user', async function() {
    const { errors } = await header.user1.graphql<boolean>(APPROVE_ACTIVATION, {
      user: testUserName
    });
    assert.deepEqual(errors![0].message, 'You do not have permission');
  });

  it('[GQL] did allow an admin to activate ${testUserName}', async function() {
    const resp = await header.admin.graphql<boolean>(APPROVE_ACTIVATION, {
      user: testUserName
    });
    assert.deepEqual(resp.data, true);
  });

  it(`[GQL] did approve ${testUserName}'s register key`, async function() {
    const resp = await header.admin.graphql<User>(GET_USER, { user: testUserName });
    assert.deepEqual(resp.data.isActivated, true);
  });
});
