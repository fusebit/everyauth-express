import * as express from 'express';

import { USER_TAG, TENANT_TAG } from './constants';

import * as session from './session';

import debugModule from 'debug';
const debug = debugModule('everyauth:authorize');
const dbg = ({ userId, tenantId }: { userId?: string; tenantId?: string }, msg: string) => {
  debug(`${tenantId || ''}${tenantId ? '/' : ''}${userId}: ${msg}`);
};

export interface IEveryAuthContext {
  finishedUrl: string /** The url which the service was configured to use. */;

  /**
   * The identity that the user has been authenticated to; this is a database key internal to EveryAuth, and
   * can be saved to reduce a lookup roundtrip on subsequent requests.
   */
  identityId: string;

  tenantId: string /** The tenantId supplied by the mapToTenantId function for this request. */;
  userId: string /** The userId supplied by the mapToUserId function for this request. */;
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
   * Map the current request to a unique tenantId that can be used to retrieve the authorized token on
   * subsequent requests.  Usually extracts the value from the output of the authorization system, or can be a
   * constant for experimentation and testing purposes.
   *
   * The tenant represents the larger customer, which may include multiple authorized users.
   */
  mapToTenantId?: ((req: express.Request) => Promise<string>) | ((req: express.Request) => string);

  /**
   * Map the current request to a unique userId tag that can be used to retrieve the authorized token on
   * subsequent requests.  Usually extracts the value from the output of the authorization system, or can be a
   * constant for experimentation and testing purposes.
   */
  mapToUserId: ((req: express.Request) => Promise<string>) | ((req: express.Request) => string);
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
 *
 * @param serviceId The name of the service to authorize the user against.
 * @param options Configuration options to control the behavior of this authorization.
 * @return An Express Router
 */
export const authorize = (serviceId: string, options: IEveryAuthOptions): express.Router => {
  const router = express.Router({ mergeParams: true });

  const redirect = (req: express.Request, res: express.Response, ids: { userId: string; tenantId?: string }) => {
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

    finUrl.searchParams.append('userId', ids.userId);
    if (ids.tenantId) {
      finUrl.searchParams.append('tenantId', ids.tenantId);
    }
    if (req.query.error) {
      finUrl.searchParams.append('error', req.query.error as string);
    }

    return res.redirect(fullUrl ? finUrl.toString() : `${finUrl.pathname}?${finUrl.searchParams.toString()}`);
  };

  router.get('/', async (req: express.Request, res: express.Response) => {
    const userId = await options.mapToUserId(req);
    const tenantId = options.mapToTenantId ? await options.mapToTenantId(req) : undefined;
    const hostedBaseUrl = getHostedBaseUrl(options, req);

    dbg({ userId, tenantId }, `Authorizing on ${hostedBaseUrl}`);

    const nextUrl = await session.start(serviceId, tenantId, userId, getHostedBaseUrl(options, req));

    res.redirect(nextUrl);
  });

  router.get('/commit', async (req: express.Request, res: express.Response) => {
    const sessionId = req.query.session as string;

    // Check for error
    if (req.query.error) {
      const sessionEntity = await session.get(sessionId);

      const ids = {
        // eslint-disable-next-line security/detect-object-injection
        userId: sessionEntity.tags[USER_TAG] as string,
        // eslint-disable-next-line security/detect-object-injection
        tenantId: sessionEntity.tags[TENANT_TAG] as string,
      };

      dbg(ids, `Error ${req.query.error}`);
      return redirect(req, res, ids);
    }

    // Update the session object if it's changed
    const { identityId, tenantId, userId } = await session.commit(serviceId, sessionId);

    dbg({ userId, tenantId }, `Success ${identityId}`);

    dbg({ userId, tenantId }, `Redirect to ${options.finishedUrl}`);

    // Propagate to redirect
    redirect(req, res, { userId, tenantId });
  });

  return router;
};
