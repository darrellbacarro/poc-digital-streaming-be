import {Client, expect} from '@loopback/testlab';
import {randomPassword} from 'secure-random-password';
import {PocBackendApplication} from '../..';
import {Actor, User} from '../../models';
import {TResponse} from '../../utils';
import {
  givenActors,
  givenEmptyDatabase,
  givenUserData,
} from '../helpers/database.helpers';
import {setupApplication} from './test-helper';

describe('Actor Routes', () => {
  let app: PocBackendApplication;
  let client: Client;
  let actors: {[key: string]: Partial<Actor>};
  let users: {[key: string]: Partial<User & {password: string}>};
  let password: string, adminToken: string, userToken: string;

  before(givenEmptyDatabase);

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    password = randomPassword();

    actors = {
      actor1: {
        firstname: 'Tom',
        lastname: 'Hanks',
        bio: 'Thomas Jeffrey Hanks is an American actor and filmmaker.',
        birthdate: '1956-07-09',
        gender: 'male',
      },
      actor2: {
        firstname: 'Robert',
        lastname: 'De Niro',
        bio: 'Robert De Niro is an American actor and producer.',
        birthdate: '1943-08-17',
        gender: 'male',
      },
    };

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
    };

    await givenUserData(Object.values(users));
    await givenActors([actors.actor2]);

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

  after(async () => {
    await app.stop();
  });

  describe('Allowed Roles: ADMIN', async () => {
    it('prevents unauthorized access', async () => {
      const response = await client.post('/actors').set({
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'multipart/form-data',
      });

      expect(response.statusCode).to.equal(403);
    });

    it('prevents new actor creation without images', async () => {
      const response = await client
        .post('/actors')
        .set({
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'multipart/form-data',
        })
        .field({...(actors.actor1 as Actor)});
      const {message}: TResponse = response.body;
      expect(message).to.be.equal('Photo is required!');
    });
    it('creates a new actor', async () => {
      const response = await client
        .post('/actors')
        .set({
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'multipart/form-data',
        })
        .field({...(actors.actor1 as Actor)})
        .attach('photo', 'src/__tests__/fixtures/files/file-2.png');
      const {message}: TResponse = response.body;
      expect(message).to.be.equal('Actor created successfully!');
    });
  });

  it('returns a list of actors', async () => {
    const response = await client.get('/actors');
    const {data}: TResponse = response.body;

    expect(data.items).to.have.length(1);
  });

  it('returns a list of actors with pagination', async () => {
    const response = await client.get('/actors?page=1&limit=2');
    const {data}: TResponse = response.body;

    expect(data.items).to.have.length(1);
  });

  it('returns the actor by id', async () => {
    const response = await client.get('/actors/1');
    const {data}: TResponse = response.body;

    for (const key in actors.actor1) {
      expect(data).to.hasOwnProperty(key);
    }
  });
});
