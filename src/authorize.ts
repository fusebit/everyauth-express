import * as express from 'express';

import * as session from './session';

import debugModule from 'debug';
const debug = debugModule('everyauth:authorize');

export interface IEveryAuthContext {
  /** The url which the service was configured to use. *.
  finishedUrl: string;
  /**
   * The identity that the user has been authenticated to; this is a database key internal to EveryAuth, and
   * can be saved to reduce a lookup roundtrip on subsequent requests.
   */
  identityId: string;
  /** The userId supplied by the mapToUserId function for this request. */
  userId: string;
}

export interface IEveryAuthOptions {
  /**
   * The URL that the user should be sent to after the operation is complete. Can be either
   * '/path/component/only' or a fully qualified URL.
   *
   * Supplied with an `error` query parameter if the operation resulted in an error.
   */
  finishedUrl: string;

  /**
   * Either a string or a function which generates a string that contains the protocol, hostname, port, and
   * path to the current mount point.  If this is not supplied, the EveryAuth system attempts to determine it
   * programmatically by looking at various attributes on the request object.
   */
  hostedBaseUrl?: string | ((req: express.Request) => string);

  /**
   * Map the current request to a unique userId tag that can be used to retrieve the authorized token on
   * subsequent requests.  Usually extracts the value from the output of the authorization system, or can be a
   * constant for experimentation and testing purposes.
   */
  mapToUserId: ((req: express.Request) => Promise<string>) | ((req: express.Request) => string);

  /**
   * Called after the authorization process completed.
   *
   * Return false to indicate that the request was responded to, and that EveryAuth should not redirect the
   * caller to the finishedUrl automatically.
   */
  onComplete?: (req: express.Request, res: express.Response, everyCtx: IEveryAuthContext) => Promise<boolean>;
}

/**
 * @ignore
 *
 * Tries to determine the publically-visible URL for this part of the router.
 */
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

/**
 * Authorize a user with a particular service.
 * @param serviceId The name of the service to authorize the user against.
 * @param options Configuration options to control the behavior of this authorization.
 * @return An Express Router
 */
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

    // Update the session object if it's changed
    const { identityId, userId } = await session.commit(serviceId, sessionId);

    debug(`${userId}: Success ${identityId}`);

    // Future: Call options.onAuthorized with the committed identity object, or just id.
    if (options.onComplete) {
      if (!(await options.onComplete(req, res, { finishedUrl: options.finishedUrl, identityId, userId }))) {
        return;
      }
    }

    debug(`${userId}: Redirect to ${options.finishedUrl}`);

    // Propagate to redirect
    res.redirect(options.finishedUrl);
  });

  return router;
};