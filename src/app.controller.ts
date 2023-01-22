import { Controller, Get, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(@Res() response: Response, @Req() req: Request) {
    const message = this.appService.getHello();
    
    return response.status(200).send({message, logs: req['requestLogsData'] })
  }
}
