import * as superagent from 'superagent';

import EveryAuthVersion from './version';
import { getAuthedProfile } from './profile';

import debugModule from 'debug';
const debug = debugModule('everyauth:install');

import { SERVICE_TAG, USER_TAG, TENANT_TAG, SESSION_TAG } from './constants';
import { IEveryAuthTagSet } from './identity';
import { getChildrenByTags } from './subcomponent';

interface IEveryAuthInstall {
  id: string;
  tags: IEveryAuthTagSet;
  dateModified: string;
}

/**
 * @ignore
 *
 * Used during session.start to see if there's an existing install that matches these tags.
 */
export const getInstallIdByTags = async (tags: IEveryAuthTagSet): Promise<string | undefined> => {
  const installs = await getChildrenByTags<IEveryAuthInstall>(
    {
      [SERVICE_TAG]: tags.serviceId,
      [USER_TAG]: tags.userId,
      [TENANT_TAG]: tags.tenantId || tags.userId,
    },
    '/integration/everyauth',
    'install'
  );

  debug(`${JSON.stringify(tags)}: Found ${installs.items.length} matching installs`);
  if (installs.items.length > 1) {
    throw new Error(
      `The userId "${JSON.stringify(
        tags
      )}" resolves to more than one install. Either use "getIdentities" to list all of the matching identities, or remove redundant identities using "everyauth identity rm" or "deleteIdentity"`
    );
  }

  if (installs.items.length == 0) {
    return undefined;
  }

  const installId = installs.items[0].id;

  debug(`${JSON.stringify(tags)}: found ${installId}`);
  return installId;
};

/**
 * @ignore
 *
 * Load via a matching master.session tag.
 */
export const getInstallIdBySession = async (sessionId: string): Promise<string | undefined> => {
  const profile = await getAuthedProfile();
  const baseUrl = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/integration/everyauth/install`;

  const installs = await superagent
    .get(`${baseUrl}?tag=${SESSION_TAG}=${sessionId}`)
    .set('User-Agent', EveryAuthVersion)
    .set('Authorization', `Bearer ${profile.token}`);

  if (installs.body.items.length > 1) {
    throw new Error(`Too many installs for session ${sessionId}; contact support.`);
  }

  if (installs.body.items.length === 0) {
    return;
  }

  debug(`${installs.body.items[0].id}: Found from ${sessionId}`);
  return installs.body.items[0].id;
};
