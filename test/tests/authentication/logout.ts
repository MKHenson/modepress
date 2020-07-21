// import * as assert from 'assert';
// import Agent from '../agent';
// import header from '../header';
// import { IUserEntry } from '../../../src';

// let agent: Agent,
//   testUserName = 'fancyUser123',
//   testUserEmail = 'fancyUser123@fancy.com';

// describe('Testing users logout', function() {
//   it(`did remove any existing user ${testUserName}`, async function() {
//     const resp = await header.admin.delete(`/api/users/${testUserName}`);
//   });

//   it(`did create & login regular user ${testUserName} with valid details`, async function() {
//     const resp = await header.admin.post(`/api/users`, {
//       username: testUserName,
//       password: 'password',
//       email: testUserEmail,
//       privileges: 'regular'
//     } as Partial<IUserEntry<'client'>>);
//     assert.deepEqual(resp.status, 200);
//     const json = await resp.json();
//     const newAgent = await header.createUser(testUserName, 'password', testUserEmail);
//     agent = newAgent;
//   });

//   it('user should be logged in', async function() {
//     const resp = await agent.get('/api/auth/authenticated');
//     assert.deepEqual(resp.status, 200);
//     const json = await resp.json();
//     assert(json.authenticated);
//   });

//   it('should log out', async function() {
//     const resp = await agent.get(`/api/auth/logout`);
//     assert.deepEqual(resp.status, 200);
//   });

//   it('user should be logged out', async function() {
//     const resp = await agent.get('/api/auth/authenticated');
//     assert.deepEqual(resp.status, 200);
//     const json = await resp.json();
//     assert(json.authenticated === false);
//   });

//   it('did allow the regular user to delete its own account', async function() {
//     const resp = await header.admin.delete(`/api/users/${testUserName}`);
//     assert.deepEqual(resp.status, 204);
//   });
// });
