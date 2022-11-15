import {Client, expect} from '@loopback/testlab';
import _ from 'lodash';
import {randomPassword} from 'secure-random-password';
import {PocBackendApplication} from '../..';
import {Movie, User} from '../../models';
import {TResponse} from '../../utils';
import {givenEmptyDatabase, givenUserData} from '../helpers/database.helpers';
import {setupApplication} from './test-helper';

describe('Movie Routes', () => {
  let app: PocBackendApplication;
  let client: Client;
  let movies: {[key: string]: Partial<Movie>};
  let users: {[key: string]: Partial<User & {password: string}>};
  let password: string, adminToken: string, userToken: string;

  before(givenEmptyDatabase);

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    password = randomPassword();

    movies = {
      movie1: {
        title: 'The Shawshank Redemption',
        release_year: 1994,
        runtime: 142,
        plot: 'Two imprisoned',
        cost: 1000000,
        actors: [],
        genres: [],
      },
      movie2: {
        title: 'The Godfather',
        release_year: 1972,
        runtime: 175,
        plot: 'The aging patriarch',
        cost: 1000000,
        actors: [],
        genres: [],
      },
      movie3: {
        title: 'The Dark Knight',
        release_year: 2008,
        runtime: 152,
        plot: 'When the menace',
        cost: 1000000,
        actors: [],
        genres: [],
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
    it('prevents new movie creation without images', async () => {
      const response = await client
        .post('/movies')
        .set({
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'multipart/form-data',
        })
        .field({...movies.movie1});

      const {message}: TResponse = response.body;
      expect(message).to.be.equal('No poster and/or backdrop image provided!');
    });

    it('creates a new movie', async () => {
      const response = await client
        .post('/movies')
        .set({
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'multipart/form-data',
        })
        .field({...movies.movie1})
        .attach('poster', 'src/__tests__/fixtures/files/file-1.png')
        .attach('backdrop', 'src/__tests__/fixtures/files/file-2.png');

      const {message}: TResponse = response.body;
      expect(message).to.be.equal('Movie Created');
    });

    it('returns a list of movies', async () => {
      const response = await client.get('/movies');

      const {data}: TResponse = response.body;
      expect(data.items).to.have.length(1);
    });

    it('returns a movie by id', async () => {
      const response = await client.get('/movies/1');

      const {data}: TResponse = response.body;
      expect(data).to.have.properties(
        _.omit(movies.movie1, 'actors', 'genres'),
      );
    });
  });
});
