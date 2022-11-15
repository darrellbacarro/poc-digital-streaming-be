import {Client, expect} from '@loopback/testlab';
import _ from 'lodash';
import {randomPassword} from 'secure-random-password';
import {PocBackendApplication} from '../..';
import {User} from '../../models';
import {TResponse} from '../../utils';
import {givenEmptyDatabase, givenUserData} from '../helpers/database.helpers';
import {setupApplication} from './test-helper';

describe('User Routes', () => {
  let app: PocBackendApplication;
  let client: Client;
  let password: string;
  let users: {[key: string]: Partial<User & {password: string}>};

  before(givenEmptyDatabase);

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    password = randomPassword();

    users = {
      adminUser: {
        id: '1',
        fullname: 'Administrator',
        email: 'admin@email.com',
        role: 'ADMIN',
        photo:
          'https://storage.googleapis.com/poc-app-3eca2.appspot.com/Image184478bdc76.png',
        approved: true,
        password,
      },
      normalActiveUser: {
        id: '2',
        fullname: 'John Doe',
        email: 'johndoe@email.com',
        role: 'USER',
        photo:
          'https://storage.googleapis.com/poc-app-3eca2.appspot.com/Image184478bdc76.png',
        approved: true,
        password,
      },
      normalInactiveUser: {
        id: '3',
        fullname: 'Jane Doe',
        email: 'janedoe@email.com',
        role: 'USER',
        photo:
          'https://storage.googleapis.com/poc-app-3eca2.appspot.com/Image184478bdc76.png',
        approved: false,
        password,
      },
    };
    await givenUserData(Object.values(users));
  });

  after(async () => {
    await app.stop();
  });

  it('validates user credentials', async () => {
    const response = await client
      .post('/users/login')
      .send({email: 'darrell@email.com', password});

    const {message}: TResponse = response.body;
    expect(message).to.be.equal('Invalid email or password.');
  });

  it('rejects an inactive user', async () => {
    const response = await client
      .post('/users/login')
      .send({email: 'janedoe@email.com', password});

    const {message}: TResponse = response.body;
    expect(message).to.be.equal('User activation is still pending.');
  });

  it('returns the token and user profile on upon successful validation', async () => {
    const response = await client.post('/users/login').send({
      email: users.adminUser.email,
      password: users.adminUser.password,
    });
    const {message, data, success}: TResponse = response.body;

    expect(success).to.be.true();
    expect(message).to.be.equal('Successfully logged in');
    expect(data).to.hasOwnProperty('token');
    expect(data.user).to.containEql({..._.omit(users.adminUser, 'password')});
  });

  it('checks existing email for sign up/register', async () => {
    const response = await client
      .post('/validate-email')
      .send({email: 'admin@email.com'});

    const {message, data, success}: TResponse = response.body;

    expect(success).to.be.true();
    expect(message).to.be.equal('Email Validated');
    expect(data.valid).to.be.false();
  });

  it('checks existing email for updating user (matched ID)', async () => {
    const response = await client
      .post('/validate-email')
      .send({email: 'admin@email.com', id: '1'});

    const {message, data, success}: TResponse = response.body;

    expect(success).to.be.true();
    expect(message).to.be.equal('Email Validated');
    expect(data.valid).to.be.true();
  });

  it('checks existing email for updating user (other ID)', async () => {
    const response = await client
      .post('/validate-email')
      .send({email: 'admin@email.com', id: '2'});

    const {message, data, success}: TResponse = response.body;

    expect(success).to.be.true();
    expect(message).to.be.equal('Email Validated');
    expect(data.valid).to.be.false();
  });

  describe('Authenticated Routes', () => {
    let userToken: string, adminToken: string;

    before(async () => {
      let response = await client.post('/users/login').send({
        email: users.adminUser.email,
        password: users.adminUser.password,
      });
      const {data}: TResponse = response.body;
      adminToken = data.token;

      response = await client.post('/users/login').send({
        email: users.normalActiveUser.email,
        password: users.normalActiveUser.password,
      });
      const {data: data2}: TResponse = response.body;
      userToken = data2.token;
    });

    it('returns the data of the authenticated user', async () => {
      const response = await client
        .get('/users/me')
        .set('Authorization', `Bearer ${adminToken}`);

      const {message, data, success}: TResponse = response.body;

      expect(success).to.be.true();
      expect(message).to.be.equal('Current user data retrieved.');
      expect(data).to.containEql(_.omit(users.adminUser, 'password'));
    });

    describe('Allowed Roles: USER', () => {
      it('updates the favorite movies of a user', async () => {
        const response = await client
          .patch(`/users/${users.normalActiveUser.id}/favorites`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({movie1: true});

        const {message, data, success}: TResponse = response.body;

        expect(success).to.be.true();
        expect(message).to.be.equal(
          "User's favorite movies updated successfully!",
        );
        expect(data).to.hasOwnProperty('favorites');
        expect(data.favorites).to.containEql({movie1: true});
      });
    });

    describe('Allowed Roles: ADMIN', () => {
      it('rejects access of non-ADMIN users GET /users', async () => {
        const getUsers = await client
          .get('/users')
          .set('Authorization', `Bearer ${userToken}`);

        expect(getUsers.body.error).to.containEql({statusCode: 403});
      });

      it('rejects access of non-ADMIN users to GET /user/:id', async () => {
        const getUser = await client
          .get('/users/1')
          .set('Authorization', `Bearer ${userToken}`);
        expect(getUser.body.error).to.containEql({statusCode: 403});
      });

      it('rejects access of non-ADMIN users to DELETE /user/:id', async () => {
        const deleteUser = await client
          .del('/users/1')
          .set('Authorization', `Bearer ${userToken}`);
        expect(deleteUser.body.error).to.containEql({statusCode: 403});
      });

      it('rejects access of non-ADMIN users to UPDATE /user/:id', async () => {
        const updateUser = await client.patch('/users/1').set({
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'multipart/form-data',
        });
        expect(updateUser.body.error).to.containEql({statusCode: 403});
      });

      it('returns the list of all users', async () => {
        const response = await client
          .get('/users')
          .set('Authorization', `Bearer ${adminToken}`);
        const {message, data, success}: TResponse = response.body;

        expect(success).to.be.true();
        expect(message).to.be.equal('Users retrieved successfully!');
        expect(data.total).to.be.greaterThan(0);
        expect(data.items).to.containDeep([
          ...Object.values(users).map(user => _.omit(user, 'password')),
        ]);
      });

      it('returns the list of all users with pagination', async () => {
        const response = await client
          .get('/users?limit=2&page=1')
          .set('Authorization', `Bearer ${adminToken}`);
        const {message, data, success}: TResponse = response.body;

        expect(success).to.be.true();
        expect(message).to.be.equal('Users retrieved successfully!');
        expect(data.items.length).to.be.equal(2);
      });

      it('returns the list of all users with search filter', async () => {
        const response = await client
          .get('/users?q=John')
          .set('Authorization', `Bearer ${adminToken}`);
        const {message, data, success}: TResponse = response.body;

        expect(success).to.be.true();
        expect(message).to.be.equal('Users retrieved successfully!');
        expect(data.items.length).to.be.equal(1);
      });

      it('returns the list of all users with sort filter', async () => {
        const response = await client
          .get('/users?sort=fullname')
          .set('Authorization', `Bearer ${adminToken}`);
        const {message, data, success}: TResponse = response.body;
        const sortednames = data.items
          .map((user: User) => user.fullname)
          .sort();

        expect(success).to.be.true();
        expect(message).to.be.equal('Users retrieved successfully!');
        expect(data.items.map((user: User) => user.fullname)).to.be.eql(
          sortednames,
        );
      });

      it('returns the data of an existing user', async () => {
        const response = await client
          .get(`/users/${users.normalActiveUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        const {message, data, success}: TResponse = response.body;

        expect(success).to.be.true();
        expect(message).to.be.equal('User retrieved successfully!');
        expect(data).to.containEql({
          ..._.omit(users.normalActiveUser, 'password'),
        });
      });

      it('returns an error when trying GET a non-existing user', async () => {
        const response = await client
          .get(`/users/5`)
          .set('Authorization', `Bearer ${adminToken}`);
        const {message, data, success}: TResponse = response.body;

        expect(success).to.be.false();
        expect(message).to.match(/Entity not found/);
        expect(data).to.be.null();
      });

      it('deletes an existing user', async () => {
        const response = await client
          .del(`/users/${users.normalActiveUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        const {message, data, success}: TResponse = response.body;

        expect(success).to.be.true();
        expect(message).to.be.equal('User deleted successfully!');
        expect(data).to.containEql({
          ..._.omit(users.normalActiveUser, 'password'),
        });
      });

      it('returns an error when trying DELETE a non-existing user', async () => {
        const response = await client
          .del(`/users/5`)
          .set('Authorization', `Bearer ${adminToken}`);
        const {message, data, success}: TResponse = response.body;

        expect(success).to.be.false();
        expect(message).to.match(/Entity not found/);
        expect(data).to.be.null();
      });
    });
  });
});
