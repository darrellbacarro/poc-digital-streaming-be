import {BindingScope, ContextTags, injectable, Provider} from '@loopback/core';
import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import {FILE_UPLOAD_SERVICE} from '../keys';
import {FileUploadHandler} from '../types';

export interface UploadService {
  handler: FileUploadHandler;
  deleteFile: (path: string) => Promise<void>;
}

@injectable({
  scope: BindingScope.TRANSIENT,
  tags: {[ContextTags.KEY]: FILE_UPLOAD_SERVICE},
})
export class FileUploadProvider implements Provider<UploadService> {
  value(): UploadService {
    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, path.resolve(__dirname, '../../uploads'));
      },
      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomInt(0, 1000000000);
        const ext = path.extname(file.originalname);
        const filenamewithoutext = path.basename(file.originalname, ext);
        cb(null, filenamewithoutext + '-' + uniqueSuffix + ext);
      },
    });

    return {
      handler: multer({
        storage,
        limits: {
          fileSize: 8000000,
        },
      }).any(),
      deleteFile: async (path: string) => {
        try {
          await fs.promises.unlink(path);
        } catch (err) {
          console.log(err);
        }
      },
    };
  }
}
