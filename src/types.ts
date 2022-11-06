import {SchemaObject} from '@loopback/rest';
import {RequestHandler} from 'express-serve-static-core';

export type FileUploadHandler = RequestHandler;

export type UploadedFile = {
  filename: string;
  filepath: string;
  publicUrl: string;
  fieldname: string;
};

export type IValidation<T> = (data: T) => Promise<null | string>;

export type TCheckEmailFilter = {
  email: string;
  id?: {[key: string]: string};
};

export type TCheckEmailPayload = {
  email: string;
  id?: string;
};

export const ResponseSchema: SchemaObject = {
  type: 'object',
  title: 'Response',
  'x-typescript-type': 'Response',
  properties: {
    success: {
      type: 'boolean',
    },
    data: {
      type: 'object',
    },
    message: {
      type: 'string',
    },
  },
};
