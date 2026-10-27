/* eslint-disable no-redeclare */
import type { CookieJar } from 'tough-cookie';
import type { Dispatcher } from 'undici';
import { Agent } from 'undici';

export interface CookieOptions {
  jar: CookieJar;
}

export namespace CookieAgent {
  export interface Options extends Agent.Options {
    cookies?: CookieOptions | undefined;
  }
}

export class CookieAgent extends Agent {
  constructor(options?: CookieAgent.Options);
}

export function cookie(options: CookieOptions): Dispatcher.DispatcherComposeInterceptor;
