import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  pingServer():string{
    return "hey server is up and running"
  }
}
