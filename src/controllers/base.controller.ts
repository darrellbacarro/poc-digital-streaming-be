import {Filter} from '@loopback/repository';
import {Request, Response} from '@loopback/rest';
import {FileUploadHandler, UploadedFile} from '../types';

export class BaseController {
  public static parseUploadBody(
    handler: FileUploadHandler,
    request: Request,
    response: Response,
  ): Promise<{files: UploadedFile[]; fields: any}> {
    return new Promise((resolve, reject) => {
      handler(request, response, async err => {
        if (err) reject(err);
        else {
          resolve(BaseController.getFilesAndFields(request));
        }
      });
    });
  }

  public static getFilesAndFields(request: Request) {
    const uploadedFiles = request.files;
    const mapper = (f: any) =>
      <UploadedFile>{
        filename: f.originalname,
        filepath: f.path,
        publicUrl: f.publicUrl ?? f.filepath,
        fieldname: f.fieldname,
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

  public static buildFilters(
    filters: {
      q?: string;
      page?: number;
      limit?: number;
      sort?: string;
    },
    matchFields: string[] = [],
  ): Filter<any> {
    const filter: Filter = {};
    const {q, page, limit, sort} = filters;

    if (q) {
      filter.where = {
        or: matchFields.map((field: string) => ({
          [field]: {like: q, options: 'i'},
        })),
      };
    }

    if (sort) filter.order = sort.split(',');
    if (page && limit) {
      filter.limit = limit;
      filter.skip = (page - 1) * limit;
    }

    return filter;
  }
}
