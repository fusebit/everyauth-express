import * as superagent from 'superagent';

import debugModule from 'debug';
const debug = debugModule('everyauth:profile');

import { getAuthedProfile, IProfile } from './profile';
import EveryAuthVersion from './version';

import { USER_TAG } from './constants';

const COMMIT_URL_SUFFIX = '/commit';

const META_INTEGRATION_ID = 'everyauth';

const getSessionUrl = (profile: IProfile) =>
  `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/integration/${META_INTEGRATION_ID}`;

export const start = async (serviceId: string, userId: string, hostedBaseUrl: string): Promise<string> => {
  const profile = await getAuthedProfile();
  const baseUrl = getSessionUrl(profile);

  const payload = {
    redirectUrl: `${hostedBaseUrl}${COMMIT_URL_SUFFIX}`,
    tags: {
      [USER_TAG]: userId,
    },
    components: [serviceId],
  };

  const response = await superagent
    .post(`${baseUrl}/session`)
    .set('Authorization', `Bearer ${profile.token}`)
    .set('User-Agent', EveryAuthVersion)
    .set('Content-Type', 'application/json')
    .send(payload);

  const sessionId = response.body.id;

  debug(`${userId}: created session ${sessionId}`);

  return `${baseUrl}/session/${sessionId}/start`;
};

export const commit = async (serviceId: string, sessionId: string): Promise<{ identityId: string; userId: string }> => {
  const profile = await getAuthedProfile();
  const baseUrl = getSessionUrl(profile);

  debug(`${sessionId}: committing`);

  // Start the commit process
  let result = await superagent
    .post(`${baseUrl}/session/${sessionId}/commit`)
    .set('User-Agent', EveryAuthVersion)
    .set('Authorization', `Bearer ${profile.token}`)
    .send();

  // Get the session while the commit is going to grab the tenant id; try multiple times in case there's a
  // race.
  do {
    result = await superagent
      .get(`${baseUrl}/session/${sessionId}/`)
      .set('User-Agent', EveryAuthVersion)
      .set('Authorization', `Bearer ${profile.token}`);
  } while (!result.body.output);

  // Convert the install to an identity
  const installId = result.body.output.entityId;

  const install = await superagent
    .get(`${baseUrl}/install/${installId}/`)
    .set('User-Agent', EveryAuthVersion)
    .set('Authorization', `Bearer ${profile.token}`);

  const identityId = install.body.data[serviceId].entityId;
  const userId = result.body.tags[USER_TAG];

  debug(`${userId}: created identity ${identityId}`);

  return { identityId, userId };
};
