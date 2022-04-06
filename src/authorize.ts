import * as express from 'express';

import * as session from './session';

export interface IEveryAuthContext {
  // XXX Needs actual useful information
  finishedUrl: string;
}

export interface IEveryAuthOptions {
  finishedUrl: string;
  mapToUserId: (req: express.Request) => Promise<string>;
  mapToTenantId?: (req: express.Request) => Promise<string>;
  // Return false to abort;
  onAuthorized?: (req: express.Request, res: express.Response, everyCtx: IEveryAuthContext) => Promise<boolean>;
  // Return false to indicate the res is handled.
  onComplete?: (req: express.Request, res: express.Response, everyCtrx: IEveryAuthContext) => Promise<void>;
}

export const authorize = (serviceId: string, options: IEveryAuthOptions): express.Router => {
  const router = express.Router();

  router.get('/', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = await options.mapToUserId(req);

    const nextUrl = await session.start(serviceId, userId, session.getHostedBaseUrl(req));

    res.redirect(nextUrl);
  });

  router.get('/complete', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const sessionId = req.query.session as string;

    // Call options.onAuthorized with the nascient session object
    if (options.onAuthorized) {
      if (!options.onAuthorized(req, res, { finishedUrl: options.finishedUrl })) {
        return;
      }
    }

    // Update the session object if it's changed
    const identityId = await session.commit(serviceId, sessionId);

    // Check for error
    // XXX

    if (options.onComplete) {
      if (!options.onComplete(req, res, { finishedUrl: options.finishedUrl })) {
        return;
      }
    }

    // Propagate to redirect
    res.redirect(options.finishedUrl);
  });

  return router;
};
