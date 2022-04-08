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

const runTest = async () => {
  const server = await startServer();

  const [completeResolve, completePromise] = getResolve<void>();

  let result = '';

  // Add the EveryAuth middleware
  server.app.use('/slack', everyauth.authorize('slack', { finishedUrl: '/complete', mapToUserId: () => 'user-1' }));

  // Let's do something interesting on completion!
  server.app.get('/complete', async (req: express.Request, res: express.Response) => {
    result = req.query.error ? (req.query.error as string) : 'success';
    res.send(result);
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
    // eslint-disable-next-line no-console
    console.log('Accept this Slack authorization');
    const result = await runTest();
    expect(result).toBe('success');
  }, 180000);

  test('Manual: Validate that the express middleware receives errors on cancels', async () => {
    // eslint-disable-next-line no-console
    console.log('Decline this Slack authorization');
    const result = await runTest();
    expect(result).toBe('access_denied');
  }, 180000);

  test('Manual: Exercise getIdentity(userId)', async () => {
    const userCredentials = await everyauth.getIdentity('slack', 'user-1');
    const slack = new WebClient(userCredentials.accessToken);
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
        const slack = new WebClient(userIdentity.accessToken);
        const result = await slack.chat.postMessage({
          text: `Hello World from EveryAuth: ${n++}`,
          channel: '#demo',
        });
        expect(result.ok).toBe(true);
      })
    );
  }, 180000);
});