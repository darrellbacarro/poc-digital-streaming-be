import {BindingScope, ContextTags, injectable, Provider} from '@loopback/core';
import multer from 'multer';
import FirebaseStorage from 'multer-firebase-storage';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {FileUploadHandler} from '../types';

@injectable({
  scope: BindingScope.TRANSIENT,
  tags: {[ContextTags.KEY]: FILE_UPLOAD_SERVICE},
})
export class FileUploadProvider implements Provider<FileUploadHandler> {
  value(): FileUploadHandler {
    const fb = FirebaseStorage({
      bucketName: 'poc-app-3eca2.appspot.com',
      credentials: {
        clientEmail: process.env.CLIENT_EMAIL,
        privateKey: process.env.PRIVATE_KEY,
        projectId: process.env.PROJECT_ID,
      },
      public: true,
      unique: true,
    });

    return multer({
      storage: process.env.NODE_ENV === 'test' ? multer.memoryStorage() : fb,
      limits: {
        fileSize: 8000000,
      },
    }).any();
  }
}
