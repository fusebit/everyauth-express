process.env.EVERYAUTH_VERSION_PREFIX = 'test-';

import express = require('express');
import superagent = require('superagent');
import open = require('open');
import * as http from 'http';
import { WebClient } from '@slack/web-api';

import { createHttpTerminator } from 'http-terminator';

import EveryAuthVersion from '../src/version';

import { SERVICE_TAG, TENANT_TAG, USER_TAG } from '../src/constants';
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

const runTest = async (
  serviceId: string,
  options?: { deny?: boolean; functions?: boolean } & Partial<everyauth.IEveryAuthOptions>
) => {
  const server = await startServer();

  const [completeResolve, completePromise] = getResolve<void>();

  let result = '';

  server.app.get('/allow', (req: express.Request, res: express.Response) => {
    res.send(
      `<html><body style="background-color:#00c100"><br/>ALLOW<br/><br/><p style="font-size:40px"><a href="/${
        req.query.functions ? 'also/slack' : 'slack'
      }">continue</a></p></body></html>`
    );
  });

  server.app.get('/reject', (req: express.Request, res: express.Response) => {
    res.send(
      `<html><body style="background-color:#c10000"><br/>CANCEL<br/><br/><p style="font-size:40px"><a href="/${
        req.query.functions ? 'also/slack' : 'slack'
      }">continue</a></p></body></html>`
    );
  });

  // Add the EveryAuth middleware
  server.app.use(
    '/slack',
    everyauth.authorize(serviceId, {
      finishedUrl: '/complete',
      mapToUserId: () => 'user-1',
      ...(options ? options : {}),
    })
  );

  server.app.use(
    '/also/:serviceId',
    everyauth.authorize(async (req) => req.params.serviceId, {
      finishedUrl: async () => '/complete',
      mapToUserId: () => 'user-1',
      ...(options ? options : {}),
    })
  );

  // Let's do something interesting on completion!
  server.app.get('/complete', async (req: express.Request, res: express.Response) => {
    result = !!req.query.error === !!options?.deny ? 'success' : `failed: ${req.query.error as string}`;

    res.send(result);

    expect(req.query.serviceId).toBe(serviceId);
    expect(req.query.tenantId?.length).toBeGreaterThan(1);
    expect(req.query.userId?.length).toBeGreaterThan(1);

    completeResolve();
  });

  // Open the browser to test, and wait for the process to complete
  open(
    `http://localhost:${server.port}/${options?.deny ? 'reject' : 'allow'}${options?.functions ? '?functions' : ''}`
  );
  await completePromise;

  await server.close();

  return result;
};

describe('Manual Test Cases', () => {
  beforeAll(async () => {
    await everyauth.deleteIdentities('slack', { userId: 'user-1' });
  });

  test('Manual: Validate that the express middleware works for Slack', async () => {
    const result = await runTest('slack');
    expect(result).toBe('success');
  }, 30000);

  test('Manual: Validate that the express middleware receives errors on cancels', async () => {
    const result = await runTest('slack', { deny: true });
    expect(result).toBe('success');
  }, 30000);

  test('Manual: Exercise getIdentity(userId)', async () => {
    const userCredentials = await everyauth.getIdentity('slack', 'user-1');
    expect(userCredentials).toBeDefined();
    expect(userCredentials?.accessToken).toBeDefined();
    expect(userCredentials?.fusebit.accountId).toBeDefined();
    expect(userCredentials?.fusebit.subscriptionId).toBeDefined();
    expect(userCredentials?.fusebit.serviceId).toBe('slack');
    expect(userCredentials?.fusebit.identityId).toBeDefined();

    const slack = new WebClient(userCredentials?.accessToken);
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
        const slack = new WebClient(userIdentity?.accessToken);
        const result = await slack.chat.postMessage({
          text: `Hello World from EveryAuth: ${n++}`,
          channel: '#demo',
        });
        expect(result.ok).toBe(true);
      })
    );
  }, 30000);

  test('Manual: Re-auth a user, with alt configuration', async () => {
    const result = await runTest('slack', { functions: true });
    expect(result).toBe('success');
  }, 30000);

  //
  // At this point there are two `user-1` identities.
  //

  test('Manual: Validate getIdentity(userId) throws on duplicate identities', async () => {
    const profile = await everyauth.profile.getAuthedProfile();
    const identityUrl = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/connector/slack/identity/`;

    /* This works fine. */
    await expect(everyauth.getIdentity('slack', 'user-1')).resolves.toMatchObject({});

    /* Add an additional identity to cause a failure. */
    const dupIdentity = await superagent
      .post(identityUrl)
      .set('User-Agent', EveryAuthVersion)
      .set('Authorization', `Bearer ${profile.accessToken}`)
      .set('Content-Type', 'application/json')
      .send({ data: { test: true }, tags: { [USER_TAG]: 'user-1', [TENANT_TAG]: 'user-1', [SERVICE_TAG]: 'slack' } });

    /* This should throw, due to duplicate matching identities. */
    await expect(everyauth.getIdentity('slack', 'user-1')).rejects.toThrow();

    /* Clean up. */
    await superagent
      .delete(`${identityUrl}${dupIdentity.body.id}`)
      .set('User-Agent', EveryAuthVersion)
      .set('Authorization', `Bearer ${profile.accessToken}`);
  });

  test('Manual: Verify no matches with invalid tenantId', async () => {
    const identities = await everyauth.getIdentities('slack', { tenantId: 'sonicity', userId: 'user-1' });
    expect(identities.items.length).toBe(0);
  });

  test('Manual: Create two new identities that have tenants set', async () => {
    let result = await runTest('slack', { mapToTenantId: () => 'tenant-1' });
    expect(result).toBe('success');

    result = await runTest('slack', { mapToTenantId: () => 'tenant-2' });
    expect(result).toBe('success');
  }, 30000);

  test('Manual: Validate that tenant searching works with null or specified', async () => {
    let identities = await everyauth.getIdentities('slack', { tenantId: undefined, userId: 'user-1' });
    expect(identities.items.length).toBe(3);

    identities = await everyauth.getIdentities('slack', { tenantId: 'tenant-1', userId: 'user-1' });
    expect(identities.items.length).toBe(1);

    identities = await everyauth.getIdentities('slack', { tenantId: 'tenant-1' });
    expect(identities.items.length).toBe(1);

    identities = await everyauth.getIdentities('slack', { userId: 'user-1' });
    expect(identities.items.length).toBe(3);
  }, 30000);

  test('Manual: Validate that deleteIdentities removes all identities', async () => {
    await everyauth.deleteIdentities('slack', null);
    const identities = await everyauth.getIdentities('slack', { userId: 'user-1' });
    expect(identities.items.length).toBe(0);
  }, 30000);
});
