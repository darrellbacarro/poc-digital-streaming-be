import { juggler } from '@loopback/repository';

export const mongodb = new juggler.DataSource({
  name: 'mongodb',
  connector: 'memory',
});