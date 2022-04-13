import * as superagent from 'superagent';

import debugModule from 'debug';
const debug = debugModule('everyauth:profile');
const dbg = ({ userId, tenantId }: { userId?: string; tenantId?: string }, msg: string) => {
  debug(`${tenantId || ''}${tenantId ? '/' : ''}${userId}: ${msg}`);
};

import { getAuthedProfile, IProfile } from './profile';
import EveryAuthVersion from './version';
import { getInstallIdByTags } from './install';

import { SERVICE_TAG, USER_TAG, TENANT_TAG } from './constants';

const COMMIT_URL_SUFFIX = '/commit';

const META_INTEGRATION_ID = 'everyauth';

export interface ISession {
  id: string;

  tags: Record<string, string | null>;
}

const getSessionUrl = (profile: IProfile) =>
  `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/integration/${META_INTEGRATION_ID}`;

export const start = async (
  serviceId: string,
  tenantId: string | undefined,
  userId: string,
  hostedBaseUrl: string
): Promise<string> => {
  const profile = await getAuthedProfile();
  const baseUrl = getSessionUrl(profile);

  const payload: { redirectUrl: string; tags: Record<string, string>; components: string[]; installId?: string } = {
    redirectUrl: `${hostedBaseUrl}${COMMIT_URL_SUFFIX}`,
    tags: {
      [SERVICE_TAG]: serviceId,
      [USER_TAG]: userId,
      ...(tenantId
        ? {
            [TENANT_TAG]: tenantId,
          }
        : {}),
    },
    components: [serviceId],
  };

  // Is there an existing matching user?
  payload.installId = await getInstallIdByTags({ serviceId, userId, tenantId });
  dbg(
    { tenantId, userId },
    payload.installId ? `Found matching install, reusing ${payload.installId}` : 'No matching install found'
  );

  const response = await superagent
    .post(`${baseUrl}/session`)
    .set('Authorization', `Bearer ${profile.token}`)
    .set('User-Agent', EveryAuthVersion)
    .set('Content-Type', 'application/json')
    .send(payload);

  const sessionId = response.body.id;

  dbg({ tenantId, userId }, `created session ${sessionId}`);

  return `${baseUrl}/session/${sessionId}/start`;
};

export const get = async (sessionId: string): Promise<ISession> => {
  const profile = await getAuthedProfile();
  const baseUrl = getSessionUrl(profile);

  const response = await superagent
    .get(`${baseUrl}/session/${sessionId}`)
    .set('Authorization', `Bearer ${profile.token}`)
    .set('User-Agent', EveryAuthVersion);

  return response.body;
};

export const commit = async (
  serviceId: string,
  sessionId: string
): Promise<{ identityId: string; tenantId: string; userId: string }> => {
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

  // eslint-disable-next-line security/detect-object-injection
  const identityId = install.body.data[serviceId].entityId;
  // eslint-disable-next-line security/detect-object-injection
  const userId = result.body.tags[USER_TAG];
  // eslint-disable-next-line security/detect-object-injection
  const tenantId = result.body.tags[TENANT_TAG];

  dbg({ userId, tenantId }, `Established identity ${identityId}`);

  return { identityId, tenantId, userId };
};
