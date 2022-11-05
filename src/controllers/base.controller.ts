import {Request, Response} from '@loopback/rest';
import {FileUploadHandler, UploadedFile} from '../types';

export class BaseController {
  protected static parseUploadBody(
    handler: FileUploadHandler,
    request: Request,
    response: Response,
  ): Promise<{files: UploadedFile[]; fields: any}> {
    return new Promise((resolve, reject) => {
      handler(request, response, err => {
        if (err) reject(err);
        else {
          resolve(BaseController.getFilesAndFields(request));
        }
      });
    });
  }

  protected static getFilesAndFields(request: Request) {
    const uploadedFiles = request.files;
    const mapper = (f: globalThis.Express.Multer.File) =>
      <UploadedFile>{
        filename: f.originalname,
        filepath: f.path,
        savedname: f.filename,
      };
    let files: UploadedFile[] = [];
    if (Array.isArray(uploadedFiles)) {
      files = uploadedFiles.map(mapper);
    } else {
      for (const filename in uploadedFiles) {
        files.push(...uploadedFiles[filename].map(mapper));
      }
    }
    return {files, fields: request.body};
  }
}
