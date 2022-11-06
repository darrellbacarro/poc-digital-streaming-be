import {BindingScope, ContextTags, injectable, Provider} from '@loopback/core';
import multer from 'multer';
import FirebaseStorage from 'multer-firebase-storage';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {FileUploadHandler} from '../types';
import credentials from './fb-credentials.json';

@injectable({
  scope: BindingScope.TRANSIENT,
  tags: {[ContextTags.KEY]: FILE_UPLOAD_SERVICE},
})
export class FileUploadProvider implements Provider<FileUploadHandler> {
  value(): FileUploadHandler {
    const fb = FirebaseStorage({
      bucketName: 'poc-app-3eca2.appspot.com',
      credentials: {
        clientEmail: credentials.client_email,
        privateKey: credentials.private_key,
        projectId: credentials.project_id,
      },
      public: true,
      unique: true,
    });

    return multer({
      storage: fb,
      limits: {
        fileSize: 8000000,
      },
    }).any();
  }
}
