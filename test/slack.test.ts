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
  let savedResolve: (val: T) => void = (val) => {};
  const tmpPromise = new Promise<T>((resolve) => (savedResolve = resolve));
  return [savedResolve, tmpPromise];
};

const startServer = async (): Promise<IServer> => {
  const app = express();

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  const [portResolve, portPromise] = getResolve<number>();
  const getPort = () => {
    portResolve((listener.address() as any).port);
  };
  const listener: http.Server = app.listen(0, getPort);

  const port = await portPromise;

  const httpTerminator = createHttpTerminator({
    server: listener,
  });

  return { app, listener, port, close: async () => httpTerminator.terminate() };
};

const runTest = async (onSuccess?: (req: express.Request, res: express.Response) => Promise<void>) => {
  const server = await startServer();

  const [completeResolve, completePromise] = getResolve<void>();

  let result = '';

  // Add the EveryAuth middleware
  server.app.use(
    '/slack',
    everyauth.authorize('slack', { finishedUrl: '/complete', mapToUserId: (req: express.Request) => 'user-1' })
  );

  // Let's do something interesting on completion!
  server.app.get('/complete', async (req: express.Request, res: express.Response) => {
    result = req.query.error ? (req.query.error as string) : 'success';
    if (req.query.error || !onSuccess) {
      res.send(result);
    } else {
      await onSuccess(req, res);
    }
    completeResolve();
  });

  // Open the browser to test, and wait for the process to complete
  open(`http://localhost:${server.port}/slack`);
  await completePromise;

  await server.close();

  return result;
};

describe('Manual Test Cases', () => {
  test('Manual: Validate that the express middleware works for Slack', async () => {
    console.log('Accept this Slack authorization');
    const result = await runTest();
    expect(result).toBe('success');
  }, 180000);

  test('Manual: Validate that the express middleware receives errors on cancels', async () => {
    console.log('Decline this Slack authorization');
    const result = await runTest();
    expect(result).toBe('access_denied');
  }, 180000);

  test('Manual: Exercise getIdentity(userId)', async () => {
    const userCredentials = await everyauth.getIdentity('slack', 'user-1');
    const slack = new WebClient(userCredentials.access_token);
    const result = await slack.chat.postMessage({
      text: 'Hello World from EveryAuth',
      channel: '#demo',
    });
    expect(result.ok).toBe(true);
  });

  test('Manual: Exercise getIdentities, and getIdentity(identityId)', async () => {
    const users = await everyauth.getIdentities('slack', { ['fusebit.tenantId']: 'user-1' });

    let n = 0;

    await Promise.all(
      users.items.map(async (user) => {
        const userIdentity = await everyauth.getIdentity('slack', user.id);
        const slack = new WebClient(userIdentity.access_token);
        const result = await slack.chat.postMessage({
          text: `Hello World from EveryAuth: ${n++}`,
          channel: '#demo',
        });
        expect(result.ok).toBe(true);
      })
    );
  }, 180000);
});
