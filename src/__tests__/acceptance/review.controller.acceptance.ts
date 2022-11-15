import {Client, expect} from '@loopback/testlab';
import {randomPassword} from 'secure-random-password';
import {PocBackendApplication} from '../..';
import {User} from '../../models';
import {TResponse} from '../../utils';
import {
  givenEmptyDatabase,
  givenReviews,
  givenUserData,
} from '../helpers/database.helpers';
import {setupApplication} from './test-helper';

describe('Review Routes', () => {
  let app: PocBackendApplication;
  let client: Client;
  let reviews: {[key: string]: any};
  let users: {[key: string]: Partial<User & {password: string}>};
  let password: string, adminToken: string, userToken: string;

  before(givenEmptyDatabase);

  before('setupApplication', async () => {
    ({app, client} = await setupApplication());

    password = randomPassword();

    reviews = {
      review1: {
        content: 'This is a review',
        rating: 5,
        movie: {
          movieId: '1',
          title: 'Movie 1',
          poster:
            'https://image.tmdb.org/t/p/w500/8WUVHemHFH2ZIP6NWkwlHWsyrEL.jpg',
        },
        user: {
          userId: '1',
          fullname: 'John Doe',
          photo:
            'https://image.tmdb.org/t/p/w500/8WUVHemHFH2ZIP6NWkwlHWsyrEL.jpg',
        },
        approved: false,
      },
      review2: {
        content: 'This is a review 2',
        rating: 5,
        movie: {
          movieId: '2',
          title: 'Movie 2',
          poster:
            'https://image.tmdb.org/t/p/w500/8WUVHemHFH2ZIP6NWkwlHWsyrEL.jpg',
        },
        user: {
          userId: '2',
          fullname: 'Jane Doe',
          photo:
            'https://image.tmdb.org/t/p/w500/8WUVHemHFH2ZIP6NWkwlHWsyrEL.jpg',
        },
        approved: false,
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
    await givenReviews([reviews.review2]);

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
      const response = await client.get('/reviews').set({
        Authorization: `Bearer ${userToken}`,
      });

      expect(response.statusCode).to.equal(403);
    });
  });

  describe('Allowed Roles: USER', async () => {
    it('prevents unauthorized access for POST /reviews', async () => {
      const response = await client.post('/reviews').set({
        Authorization: `Bearer ${adminToken}`,
      });

      expect(response.statusCode).to.equal(403);
    });
    it('creates a new review', async () => {
      const response = await client
        .post('/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reviews.review1);

      const {message}: TResponse = response.body;
      expect(message).to.be.equal('Review Submitted');
    });
  });
});
