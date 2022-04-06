import * as superagent from 'superagent';
import * as express from 'express';
import { getAuthedProfile } from './profile';

const COMMIT_URL_SUFFIX = '/commit';

export const getHostedBaseUrl = (req: express.Request): string => req.baseUrl;

export const start = async (serviceId: string, userId: string, hostedBaseUrl: string): Promise<string> => {
  const profile = await getAuthedProfile();
  const baseUrl = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/connector/${serviceId}`;

  const response = await superagent
    .post(`${baseUrl}/session`)
    .set('Authorization', `Bearer ${profile.token}`)
    .set('Content-Type', 'application/json')
    .send({
      redirectUrl: `${hostedBaseUrl}${COMMIT_URL_SUFFIX}`,
      tags: {
        'fusebit.tenantId': userId,
      },
    });

  const sessionId = response.body.id;

  return `${baseUrl}/session/${sessionId}/start`;
};

export const commit = async (serviceId: string, sessionId: string) => {
  const profile = await getAuthedProfile();
  const baseUrl = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/connector/${serviceId}`;

  // Start the commit process
  let result = await superagent
    .post(`${baseUrl}/session/${sessionId}/commit`)
    .set('Authorization', `Bearer ${profile.token}`)
    .send();

  // Get the session while the commit is going to grab the tenant id; try multiple times in case there's a
  // race.
  do {
    result = await superagent.get(`${baseUrl}/session/${sessionId}/`).set('Authorization', `Bearer ${profile.token}`);
  } while (!result.body.output);

  const installId = result.body.output.entityId;

  return installId;
};
