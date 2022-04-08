import express = require('express');
import open = require('open');
import * as http from 'http';
import { WebClient } from '@slack/web-api';

import { createHttpTerminator } from 'http-terminator';

import * as everyauth from '../src';

interface IServer {
  app: express.Application;
  listener: http.Server;
  port: number;
  close: () => Promise<void>;
}

const getResolve = <T>(): [(result: T) => void, Promise<T>] => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  let savedResolve: (val: T) => void = () => {};
  const tmpPromise = new Promise<T>((resolve) => (savedResolve = resolve));
  return [savedResolve, tmpPromise];
};

const startServer = async (): Promise<IServer> => {
  const app = express();

  app.get('/', (_, res) => {
    res.send('Hello World!');
  });

  const [portResolve, portPromise] = getResolve<number>();
  const getPort = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    portResolve((listener.address() as any).port);
  };
  const listener: http.Server = app.listen(0, getPort);

  const port = await portPromise;

  const httpTerminator = createHttpTerminator({
    server: listener,
  });

  return { app, listener, port, close: async () => httpTerminator.terminate() };
};

const runTest = async (options?: { deny?: boolean } & Partial<everyauth.IEveryAuthOptions>) => {
  const server = await startServer();

  const [completeResolve, completePromise] = getResolve<void>();

  let result = '';

  server.app.get('/allow', (req: express.Request, res: express.Response) => {
    res.send('<html><body style="background-color:#00c100"><br/>ACCEPT<br/><br/><p style="font-size:40px"><a href="/slack">continue</a></p></body></html>');
  });

  server.app.get('/reject', (req: express.Request, res: express.Response) => {
    res.send('<html><body style="background-color:#c10000"><br/>REJECT<br/><br/><p style="font-size:40px"><a href="/slack">continue</a></p></body></html>');
  });

  // Add the EveryAuth middleware
  server.app.use(
    '/slack',
    everyauth.authorize('slack', { finishedUrl: '/complete', mapToUserId: () => 'user-1', ...(options ? options : {}) })
  );

  // Let's do something interesting on completion!
  server.app.get('/complete', async (req: express.Request, res: express.Response) => {
    result = req.query.error ? (req.query.error as string) : 'success';
    res.send(result);
    completeResolve();
  });

  // Open the browser to test, and wait for the process to complete
  open(`http://localhost:${server.port}/${options?.deny ? 'reject' : 'allow'}`);
  await completePromise;

  await server.close();

  return result;
};

describe('Manual Test Cases', () => {
  beforeAll(async () => {
    let next: string | undefined = undefined;

    do {
      const identities: any = await everyauth.getIdentities('slack', { userId: 'user-1' }, { next });
      await Promise.all(identities.items.map((identity: any) => everyauth.deleteIdentity('slack', identity.id)));
      next = identities.next;
    } while (next);
  });

  test('Manual: Validate that the express middleware works for Slack', async () => {
    const result = await runTest();
    expect(result).toBe('success');
  }, 180000);

  test('Manual: Validate that the express middleware receives errors on cancels', async () => {
    const result = await runTest({ deny: true });
    expect(result).toBe('access_denied');
  }, 180000);

  test('Manual: Exercise getIdentity(userId)', async () => {
    const userCredentials = await everyauth.getIdentity('slack', 'user-1');
    const slack = new WebClient(userCredentials.accessToken);
    const result = await slack.chat.postMessage({
      text: 'Hello World from EveryAuth: getIdentity',
      channel: '#demo',
    });
    expect(result.ok).toBe(true);
  });

  test('Manual: Exercise getIdentities, and getIdentity(identityId)', async () => {
    const users = await everyauth.getIdentities('slack', { userId: 'user-1' });

    let n = 0;

    await Promise.all(
      users.items.map(async (user) => {
        const userIdentity = await everyauth.getIdentity('slack', user.id);
        const slack = new WebClient(userIdentity.accessToken);
        const result = await slack.chat.postMessage({
          text: `Hello World from EveryAuth: ${n++}`,
          channel: '#demo',
        });
        expect(result.ok).toBe(true);
      })
    );
  }, 180000);

  test('Manual: Re-auth a user', async () => {
    const result = await runTest();
    expect(result).toBe('success');
  }, 180000);

  //
  // At this point there are two `user-1` identities.
  //

  test('Manual: Validate getIdentity(userId) throws on duplicate identities', async () => {
    await expect(everyauth.getIdentity('slack', 'user-1')).rejects.toThrow();
  });

  test('Manual: Verify no matches with tenantId', async () => {
    const identities = await everyauth.getIdentities('slack', { tenantId: 'sonicity', userId: 'user-1' });
    expect(identities.items.length).toBe(0);
  });

  test('Manual: Verify no matches with undefined tenantId', async () => {
    const identities = await everyauth.getIdentities('slack', { tenantId: undefined, userId: 'user-1' });
    expect(identities.items.length).toBe(0);
  });

  test('Manual: Create two new identities that have tenants set', async () => {
    let result = await runTest({ mapToTenantId: () => 'tenant-1' });
    expect(result).toBe('success');

    result = await runTest({ mapToTenantId: () => 'tenant-2' });
    expect(result).toBe('success');
  }, 180000);

  test('Manual: Validate that tenant searching works with null or specified', async () => {
    let identities = await everyauth.getIdentities('slack', { tenantId: null, userId: 'user-1' });
    expect(identities.items.length).toBe(0);

    identities = await everyauth.getIdentities('slack', { tenantId: undefined, userId: 'user-1' });
    expect(identities.items.length).toBe(2);

    identities = await everyauth.getIdentities('slack', { tenantId: 'tenant-1', userId: 'user-1' });
    expect(identities.items.length).toBe(1);
  }, 180000);
});
