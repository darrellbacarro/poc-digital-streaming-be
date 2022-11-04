import {inject} from '@loopback/core';
import {Response, RestBindings} from '@loopback/rest';

type TResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export class Responder {
  constructor(
    @inject(RestBindings.Http.RESPONSE)
    private res: Response,
  ) {}

  private buildResponseJson<T>(
    success: boolean,
    data: T,
    message: string,
  ): TResponse<T> {
    return {
      success,
      data,
      message,
    };
  }

  public success<T>(data: T, message = 'Success!', status = 200): Response {
    this.res
      .status(status)
      .send(this.buildResponseJson<T>(true, data, message));
    return this.res;
  }

  public error<T>(data: T, message = 'Failed!', status = 400): Response {
    this.res
      .status(status)
      .send(this.buildResponseJson<T>(false, data, message));
    return this.res;
  }
}
