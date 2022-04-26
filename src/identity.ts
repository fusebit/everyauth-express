import * as superagent from 'superagent';

import debugModule from 'debug';
const debug = debugModule('everyauth:identity');

import EveryAuthVersion from './version';
import { getAuthedProfile } from './profile';

import * as provider from './provider';

import { SERVICE_TAG, USER_TAG, TENANT_TAG, SESSION_TAG } from './constants';
import { getInstallIdBySession } from './install';
import { getChildrenByTags } from './subcomponent';

/**
 * A set of key/value tags. Use 'undefined' to indicate that any value will match, for a particular
 * key, during a search.
 */
export type IEveryAuthTagSet = Record<string, string | undefined | null>;

interface IEveryAuthIdentity {
  id: string /** A unique key for this identity. */;
  tags: IEveryAuthTagSet /** A set of key/value pairs that act as tags on this identity. */;
  dateModified: string /** The last date that the identity was modified. */;
}

/** The results from a getIdentities search. */
interface IEveryAuthIdentitySearch {
  items: IEveryAuthIdentity[];
  next?: string /** A token that can be supplied back to request the next page of results. */;
}

/** Options that control the pagination of getIdentities requests. */
export interface IEveryAuthSearchOptions {
  next?: string;
  pageSize?: number;
}

/** A specific credential associated with an identityId, normalized to provide a standard interface. */
interface IEveryAuthCredential {
  native: provider.INative /** The raw identity from a service. */;
  accessToken: string /** The OAuth2 accessToken used to authenticate a request. */;
  fusebit: {
    accountId: string;
    subscriptionId: string;
    serviceId: string;
    identityId: string /** The unique internal id associated with this credential. */;
  };
}

interface IEveryAuthUserTenantSet {
  userId?: string;
  tenantId?: string;
}

/**
 * Retrieve a valid accessToken for a specific service.  If search criteria such as a userId or tags are
 * used, only the most recent matching identity will be returned.
 *
 * @param serviceId The service to search for matching identities within.
 * @param identityOrIdsOrTags Either an identity id uniquely identifying a specific identity, a
 * userId that can be used to search for a matching identity, or a set of tags that will be used to
 * search.
 * @return A credential with a valid token, or undefined if no matching credential is found.
 * @throws An exception is thrown if more than one matching identity is found.
 */
export const getIdentity = async (
  serviceId: string,
  identityOrIdsOrTags: string | IEveryAuthUserTenantSet | IEveryAuthTagSet
): Promise<IEveryAuthCredential | undefined> => {
  let identityId;

  // Is this already an identity?
  if (typeof identityOrIdsOrTags == 'string' && identityOrIdsOrTags.startsWith('idn-')) {
    identityId = identityOrIdsOrTags;
  } else {
    let identities: IEveryAuthIdentitySearch;

    if (typeof identityOrIdsOrTags == 'string') {
      identities = await getIdentitiesByTags(serviceId, {
        [USER_TAG]: identityOrIdsOrTags,
        [TENANT_TAG]: identityOrIdsOrTags,
      });
    } else if (identityOrIdsOrTags.userId || identityOrIdsOrTags.tenantId) {
      identities = await getIdentitiesByTags(serviceId, {
        [USER_TAG]: identityOrIdsOrTags.userId,
        [TENANT_TAG]: identityOrIdsOrTags.tenantId || identityOrIdsOrTags.userId,
      });
    } else {
      identities = await getIdentitiesByTags(serviceId, identityOrIdsOrTags as IEveryAuthTagSet);
    }

    debug(`${JSON.stringify(identityOrIdsOrTags)}: Found ${identities.items.length} matching identities`);
    if (identities.items.length > 1) {
      throw new Error(
        `The userId "${JSON.stringify(
          identityOrIdsOrTags
        )}" resolves to more than one identity. Either use "getIdentities" to list all of the matching identities, or remove redundant identity using "everyauth identity rm" or "deleteIdentity"`
      );
    }

    if (identities.items.length == 0) {
      return undefined;
    }

    debug(`${JSON.stringify(identityOrIdsOrTags)}: returning ${identities.items[0].id}`);

    identityId = identities.items[0].id;
  }

  const creds = await getTokenForIdentity(serviceId, identityId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any,security/detect-object-injection
  return ((provider as any)[serviceId] || (provider as any)['oauth']).normalize(creds);
};

/**
 * Search for matching identities and return all matches found. The results do not include security tokens.
 *
 * @param serviceId The service to search for matching identities within.
 * @param idsOrTags Either a { userId, tenantId } that can be used to search for a matching identity, or a set of
 * tags that will be used to search.
 * @param options Options to control the pagination or request subsequent pages of results.
 * @return A set of matching identities
 */
export const getIdentities = async (
  serviceId: string,
  idsOrTags: IEveryAuthUserTenantSet | IEveryAuthTagSet,
  options?: IEveryAuthSearchOptions
): Promise<IEveryAuthIdentitySearch> => {
  let identities;

  if (idsOrTags.userId || idsOrTags.tenantId) {
    identities = await getIdentitiesByTags(
      serviceId,
      {
        [SERVICE_TAG]: serviceId,
        ...('userId' in idsOrTags ? { [USER_TAG]: idsOrTags.userId } : {}),
        ...('tenantId' in idsOrTags ? { [TENANT_TAG]: idsOrTags.tenantId } : {}),
      },
      options
    );
  } else {
    identities = await getIdentitiesByTags(serviceId, idsOrTags as IEveryAuthTagSet, options);
  }

  debug(`${JSON.stringify(idsOrTags)}: Found ${identities.items.length} matching identities`);

  // Sanitize the return set.
  return {
    items: identities.items.map((identity) => ({
      id: identity.id,
      tags: identity.tags,
      dateModified: identity.dateModified,
    })),
    next: identities.next,
  };
};

/**
 * Delete a specified identity.
 *
 * @param serviceId The service to search for matching identities within.
 * @param identityId The identity to delete.
 */
export const deleteIdentity = async (serviceId: string, identityId: string): Promise<void> => {
  const profile = await getAuthedProfile();
  const baseUrl = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}`;
  const conUrl = `/connector/${serviceId}`;
  const intUrl = '/integration/everyauth';

  // Get the identity object
  const identity = await superagent
    .get(`${baseUrl}${conUrl}/identity/${identityId}`)
    .set('User-Agent', EveryAuthVersion)
    .set('Authorization', `Bearer ${profile.accessToken}`)
    .ok(() => true);

  if (identity.statusCode === 404) {
    // Already deleted.
    return;
  }

  if (identity.statusCode > 299) {
    throw new Error(`Loading the requested entity failed with status ${identity.statusCode}`);
  }

  // Get the parent install object.
  // eslint-disable-next-line security/detect-object-injection
  const installId = await getInstallIdBySession(identity.body.tags[SESSION_TAG]);

  if (installId) {
    // Delete install
    await superagent
      .delete(`${baseUrl}${intUrl}/install/${installId}`)
      .set('User-Agent', EveryAuthVersion)
      .set('Authorization', `Bearer ${profile.accessToken}`)
      .ok(() => true);
  }

  // Delete identity
  await superagent
    .delete(`${baseUrl}${conUrl}/identity/${identityId}`)
    .set('User-Agent', EveryAuthVersion)
    .set('Authorization', `Bearer ${profile.accessToken}`)
    .ok(() => true);
};

const getTokenForIdentity = async (serviceId: string, identityId: string): Promise<IEveryAuthIdentity> => {
  const profile = await getAuthedProfile();
  const tokenPath = `/api/${identityId}/token`;
  const baseUrl = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/connector/${serviceId}`;
  const tokenResponse = await superagent
    .get(`${baseUrl}${tokenPath}`)
    .set('User-Agent', EveryAuthVersion)
    .set('Authorization', `Bearer ${profile.accessToken}`);

  const connectorToken = tokenResponse.body;
  const isEmpty = !connectorToken || Object.keys(connectorToken).length === 0;

  if (isEmpty) {
    debug(`${identityId}: Not found for ${serviceId}`);
    throw new Error(`Cannot find Identity '${identityId}'`);
  }

  debug(`${identityId}: Loaded token for ${serviceId}`);

  connectorToken.fusebit = {
    accountId: profile.account,
    subscriptionId: profile.subscription,
    serviceId,
    identityId,
  };

  return connectorToken;
};

const getIdentitiesByTags = async (
  serviceId: string,
  tags: IEveryAuthTagSet,
  options?: IEveryAuthSearchOptions
): Promise<IEveryAuthIdentitySearch> => {
  return getChildrenByTags<IEveryAuthIdentity>(
    { ...tags, [SERVICE_TAG]: serviceId },
    `/connector/${serviceId}`,
    'identity',
    options
  );
};
