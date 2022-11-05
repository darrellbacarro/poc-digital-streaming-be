import {BindingKey} from '@loopback/core';
import {FileUploadHandler} from './types';

export const FILE_UPLOAD_SERVICE = BindingKey.create<FileUploadHandler>(
  'services.FileUpload',
);

export const STORAGE_DIRECTORY = BindingKey.create<string>('storage.directory');
