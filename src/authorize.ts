import * as express from 'express';

import * as session from './session';

import debugModule from 'debug';
const debug = debugModule('everyauth:authorize');

export interface IEveryAuthContext {
  // XXX Needs actual useful information
  finishedUrl: string;
  identityId?: string;
}

export interface IEveryAuthOptions {
  finishedUrl: string;
  hostedBaseUrl?: string | ((req: express.Request) => string);
  mapToUserId: ((req: express.Request) => Promise<string>) | ((req: express.Request) => string);
  // Return false to abort;
  onAuthorized?: (req: express.Request, res: express.Response, everyCtx: IEveryAuthContext) => Promise<boolean>;
  // Return false to indicate the res is handled.
  onComplete?: (req: express.Request, res: express.Response, everyCtx: IEveryAuthContext) => Promise<boolean>;
}

export const getHostedBaseUrl = (options: IEveryAuthOptions, req: express.Request): string => {
  // Supplied in options; use that.
  if (options.hostedBaseUrl) {
    if (typeof options.hostedBaseUrl == 'string') {
      return options.hostedBaseUrl;
    } else if (typeof options.hostedBaseUrl == 'function') {
      return options.hostedBaseUrl(req);
    }
  }

  // Discovery time!
  //
  // Sometimes the originalUrl includes the entire request, sometimes it doesn't!
  if (req.originalUrl.startsWith('http')) {
    return req.originalUrl;
  }

  // req.hostname doesn't preserve the port, unfortunately, so test the Host header to see if it's present.
  let port = '';
  if (req.headers['host'] && req.headers['host'].includes(':')) {
    port = `:${req.headers['host'].split(':')[1]}`;
  }

  // Return a hopefully valid URL.
  return `${req.protocol}://${req.hostname}${port}${req.originalUrl}`;
};

export const authorize = (serviceId: string, options: IEveryAuthOptions): express.Router => {
  const router = express.Router();

  const redirectOnError = (req: express.Request, res: express.Response) => {
    // Parse the finishedUrl, supporting both a plain path and a full url.
    let finUrl: URL | undefined = undefined;
    let fullUrl = false;

    try {
      finUrl = new URL(options.finishedUrl);
      fullUrl = true;
    } catch (_) {
      // Not a fully qualified url, probably just a path.
    }
    if (!finUrl) {
      finUrl = new URL(`http://localhost${options.finishedUrl}`);
    }

    finUrl.searchParams.append('error', req.query.error as string);

    return res.redirect(fullUrl ? finUrl.toString() : `${finUrl.pathname}?${finUrl.searchParams.toString()}`);
  };

  router.get('/', async (req: express.Request, res: express.Response) => {
    const userId = await options.mapToUserId(req);
    const hostedBaseUrl = getHostedBaseUrl(options, req);
    debug(`${userId}: Authorizing on ${hostedBaseUrl}`);
    const nextUrl = await session.start(serviceId, userId, getHostedBaseUrl(options, req));

    res.redirect(nextUrl);
  });

  router.get('/commit', async (req: express.Request, res: express.Response) => {
    const sessionId = req.query.session as string;

    // Check for error
    if (req.query.error) {
      debug(`Error: ${req.query.error}`);
      return redirectOnError(req, res);
    }

    // Future: Call options.onAuthorized with the nascient identity object
    if (options.onAuthorized) {
      if (!(await options.onAuthorized(req, res, { finishedUrl: options.finishedUrl }))) {
        return;
      }
    }

    // Update the session object if it's changed
    const { identityId, userId } = await session.commit(serviceId, sessionId);

    debug(`${userId}: Success ${identityId}`);

    // Future: Call options.onAuthorized with the committed identity object, or just id.
    if (options.onComplete) {
      if (!(await options.onComplete(req, res, { finishedUrl: options.finishedUrl, identityId }))) {
        return;
      }
    }

    debug(`${userId}: Redirect to ${options.finishedUrl}`);

    // Propagate to redirect
    res.redirect(options.finishedUrl);
  });

  return router;
};
