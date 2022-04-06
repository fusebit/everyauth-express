import * as express from 'express';

export interface IEveryAuthContext {
  finishedUrl: string;
  identity: any;
}

export interface IEveryAuthOptions {
  finishedUrl: string;
  mapToUserId: (req: express.Request) => Promise<string>;
  mapToTenantId?: (req: express.Request) => Promise<string>;
  onAuthorized?: (req: express.Request, res: express.Response, everyCtrx: IEveryAuthContext) => Promise<void>;
  onComplete?: (req: express.Request, res: express.Response, everyCtrx: IEveryAuthContext) => Promise<void>;
}

export const authorize = (serviceId: string, options: IEveryAuthOptions): express.Router => {
  const router = express.Router();

  router.get('/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Create the session with the redirectUrl as '/complete';
    // req.redirect(session.nextUrl);
  });

  router.get('/complete', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Call options.onAuthorized with the nascient session object
    // Update the session object if it's changed
    // session.commit()
    // Check for error, and propagate to redirect
    // res.redirect(options.finishedUrl);
  });

  return router;
};
