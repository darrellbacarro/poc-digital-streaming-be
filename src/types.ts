import {RequestHandler} from 'express-serve-static-core';

export type FileUploadHandler = RequestHandler;

export type UploadedFile = {
  filename: string;
  filepath: string;
  savedname: string;
};
