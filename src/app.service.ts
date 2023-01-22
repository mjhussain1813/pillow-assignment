import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    const apiResponse="Hello World!"
    return apiResponse;
  }
}
