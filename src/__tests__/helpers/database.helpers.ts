import {Getter} from '@loopback/core';
import {genSalt, hash} from 'bcryptjs';
import _ from 'lodash';
import {Actor, Genre, Movie, Review, User} from '../../models';
import {
  ActorRepository,
  GenreRepository,
  MovieRepository,
  ReviewRepository,
  UserCredentialRepository,
  UserRepository,
} from '../../repositories';
import {mongodb} from '../fixtures/datasources/mongodb.datasource';

const userCredsRepo = new UserCredentialRepository(mongodb);
const userRepo = new UserRepository(mongodb, Getter.fromValue(userCredsRepo));
const actorRepo = new ActorRepository(mongodb);
const genreRepo = new GenreRepository(mongodb);
const movieRepo = new MovieRepository(mongodb);
const reviewRepo = new ReviewRepository(mongodb);

export async function givenEmptyDatabase() {
  await Promise.all([
    userRepo.deleteAll(),
    userCredsRepo.deleteAll(),
    actorRepo.deleteAll(),
    genreRepo.deleteAll(),
    movieRepo.deleteAll(),
    reviewRepo.deleteAll(),
  ]);
}

export async function givenUserData(
  data: Partial<User & {password: string}>[],
) {
  return Promise.all(
    data.map(async user => {
      const savedUser = await userRepo.create(_.omit(user, 'password'));
      const password = await hash(user.password!, await genSalt());

      await userRepo.userCredentials(savedUser.id).create({password});
      return savedUser;
    }),
  );
}

export async function givenMovies(movies: Partial<Movie>[]) {
  return Promise.all(movies.map(movie => movieRepo.create(movie)));
}

export async function givenActors(actors: Partial<Actor>[]) {
  return Promise.all(actors.map(actor => actorRepo.create(actor)));
}

export async function givenGenres(genres: Partial<Genre>[]) {
  return Promise.all(genres.map(genre => genreRepo.create(genre)));
}

export async function givenReviews(reviews: Partial<Review>[]) {
  return Promise.all(reviews.map(review => reviewRepo.create(review)));
}
