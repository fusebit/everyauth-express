import * as superagent from 'superagent';
import { getAuthedProfile, IProfile } from './profile';

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
      'fusebit.tenantId': userId,
    },
    components: [serviceId],
  };

  const response = await superagent
    .post(`${baseUrl}/session`)
    .set('Authorization', `Bearer ${profile.token}`)
    .set('Content-Type', 'application/json')
    .send(payload);

  const sessionId = response.body.id;

  return `${baseUrl}/session/${sessionId}/start`;
};

export const commit = async (sessionId: string) => {
  const profile = await getAuthedProfile();
  const baseUrl = getSessionUrl(profile);

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
