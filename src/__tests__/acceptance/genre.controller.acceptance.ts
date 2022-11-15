import {Client, expect} from '@loopback/testlab';
import {randomPassword} from 'secure-random-password';
import {PocBackendApplication} from '../..';
import {Genre, User} from '../../models';
import {TResponse} from '../../utils';
import {
  givenEmptyDatabase,
  givenGenres,
  givenUserData,
} from '../helpers/database.helpers';
import {setupApplication} from './test-helper';

describe('Gender Routes', () => {
  let app: PocBackendApplication;
  let client: Client;
  let genres: {[key: string]: Partial<Genre>};
  let users: {[key: string]: Partial<User & {password: string}>};
  let password: string, adminToken: string, userToken: string;

  before(givenEmptyDatabase);

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    password = randomPassword();

    genres = {
      genre1: {
        title: 'Action',
        gradient: 'gradient1',
      },
      genre2: {
        title: 'Adventure',
        gradient: 'gradient2',
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
    await givenGenres([genres.genre2]);

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

  it('returns a list of genres', async () => {
    const response = await client.get('/genres');
    const {data}: TResponse = response.body;

    expect(data.items).to.have.length(1);
  });

  it('returns a list of genres with pagination', async () => {
    const response = await client.get('/genres?page=1&limit=2');
    const {data}: TResponse = response.body;

    expect(data.items).to.have.length(1);
  });

  it('returns the genre by id', async () => {
    const response = await client.get('/genres/1');
    const {data}: TResponse = response.body;

    for (const key in genres.genre1) {
      expect(data).to.hasOwnProperty(key);
    }
  });

  describe('Allowed Roles: ADMIN', async () => {
    it('prevents unauthorized access', async () => {
      const response = await client.post('/genres').set({
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.statusCode).to.equal(403);
    });
    it('creates a new genre', async () => {
      const response = await client
        .post('/genres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(genres.genre1);

      const {message}: TResponse = response.body;
      expect(message).to.be.equal('Genre Created');
    });
  });
});
