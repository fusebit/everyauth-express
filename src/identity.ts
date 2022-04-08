import * as superagent from 'superagent';

import debugModule from 'debug';
const debug = debugModule('everyauth:identity');

import EveryAuthVersion from './version';

import { getAuthedProfile } from './profile';

import * as provider from './provider';

import { USER_TAG, TENANT_TAG } from './constants';

interface IEveryAuthIdentity {
  id: string /** A unique key for this identity. */;
  tags: IEveryAuthTagSet /** A set of key/value pairs that act as attributes on this identity. */;
  dateModified: string /** The last date that the identity was modified. */;
}

/** The results from a getIdentities search. */
interface IEveryAuthIdentitySearch {
  items: IEveryAuthIdentity[];
  next?: string /** A token that can be supplied back to request the next page of results. */;
}

/** A specific credential associated with an identityId, normalized to provide a standard interface. */
interface IEveryAuthCredential {
  native: provider.INative /** The raw identity from a service. */;
  accessToken: string /** The OAuth2 accessToken used to authenticate a request. */;
}

/**
 * A set of key/value attributes. Use 'undefined' to indicate that any value will match, for a particular
 * key, during a search.
 */
type IEveryAuthTagSet = Record<string, string | undefined | null>;

interface IEveryAuthUserTenantSet {
  userId?: string;
  tenantId?: string;
}

/** Options that control the pagination of getIdentities requests. */
interface IEveryAuthSearchOptions {
  next?: string;
  pageSize?: number;
}

/**
 * Retrieve a valid accessToken for a specific service.  If search criteria such as a userId or attributes are
 * used, only the most recent matching identity will be returned.
 *
 * @param serviceId The service to search for matching identities within.
 * @param identityOrIdsOrAttributes Either an identity id uniquely identifying a specific identity, a
 * userId that can be used to search for a matching identity, or a set of attributes that will be used to
 * search.
 * @return A credential with a valid token.
 * @throws An exception is thrown if no identities are found, or more than one identity is found.
 */
export const getIdentity = async (
  serviceId: string,
  identityOrIdsOrAttributes: string | IEveryAuthUserTenantSet | IEveryAuthTagSet
): Promise<IEveryAuthCredential> => {
  let identityId;

  // Is this already an identity?
  if (typeof identityOrIdsOrAttributes == 'string' && identityOrIdsOrAttributes.startsWith('idn-')) {
    identityId = identityOrIdsOrAttributes;
  } else {
    let identities: IEveryAuthIdentitySearch;

    if (typeof identityOrIdsOrAttributes == 'string') {
      identities = await getIdentitiesByTags(serviceId, { [USER_TAG]: identityOrIdsOrAttributes });
    } else if (identityOrIdsOrAttributes.userId || identityOrIdsOrAttributes.tenantId) {
      identities = await getIdentitiesByTags(serviceId, {
        [USER_TAG]: identityOrIdsOrAttributes.userId,
        [TENANT_TAG]: identityOrIdsOrAttributes.tenantId,
      });
    } else {
      identities = await getIdentitiesByTags(serviceId, identityOrIdsOrAttributes as IEveryAuthTagSet);
    }

    debug(`${JSON.stringify(identityOrIdsOrAttributes)}: Found ${identities.items.length} matching identities`);
    if (identities.items.length > 1) {
      throw new Error(
        `The userId "${JSON.stringify(
          identityOrIdsOrAttributes
        )}" resolves to more than one identity. Either use "getIdentities" to list all of the matching identities, or remove redundant identity using "everynode identity rm" or "deleteIdentity"`
      );
    }

    debug(`${JSON.stringify(identityOrIdsOrAttributes)}: returning ${identities.items[0].id}`);

    identityId = identities.items[0].id;
  }

  const creds = await getIdentityById(serviceId, identityId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,security/detect-object-injection
  return (provider as any)[serviceId].normalize(creds);
};

/**
 * Search for matching identities and return all matches found. The results do not include valid tokens.
 *
 * @param serviceId The service to search for matching identities within.
 * @param idsOrAttributes Either a { userId, tenantId } that can be used to search for a matching identity, or a set of
 * attributes that will be used to search.
 * @param options Options to control the pagination or request subsequent pages of results.
 * @return A set of matching identities
 */
export const getIdentities = async (
  serviceId: string,
  idsOrAttributes: IEveryAuthUserTenantSet | IEveryAuthTagSet,
  options?: IEveryAuthSearchOptions
): Promise<IEveryAuthIdentitySearch> => {
  let identities;

  if (idsOrAttributes.userId || idsOrAttributes.tenantId) {
    identities = await getIdentitiesByTags(
      serviceId,
      {
        ...('userId' in idsOrAttributes ? { [USER_TAG]: idsOrAttributes.userId } : {}),
        ...('tenantId' in idsOrAttributes ? { [TENANT_TAG]: idsOrAttributes.tenantId } : {}),
      },
      options
    );
  } else {
    identities = await getIdentitiesByTags(serviceId, idsOrAttributes as IEveryAuthTagSet, options);
  }

  debug(`${JSON.stringify(idsOrAttributes)}: Found ${identities.items.length} matching identities`);

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
  const baseUrl = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/connector/${serviceId}`;

  await superagent
    .delete(`${baseUrl}/identity/${identityId}`)
    .set('User-Agent', EveryAuthVersion)
    .set('Authorization', `Bearer ${profile.token}`)
    .ok(() => true);
};

const getIdentityById = async (serviceId: string, identityId: string): Promise<IEveryAuthIdentity> => {
  const profile = await getAuthedProfile();
  const tokenPath = `/api/${identityId}/token`;
  const baseUrl = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/connector/${serviceId}`;
  const tokenResponse = await superagent
    .get(`${baseUrl}${tokenPath}`)
    .set('User-Agent', EveryAuthVersion)
    .set('Authorization', `Bearer ${profile.token}`);

  const connectorToken = tokenResponse.body;
  const isEmpty = !connectorToken || Object.keys(connectorToken).length === 0;

  if (isEmpty) {
    debug(`${identityId}: Not found for ${serviceId}`);
    throw new Error(`Cannot find Identity '${identityId}'`);
  }

  debug(`${identityId}: Loaded token for ${serviceId}`);
  return connectorToken;
};

const getIdentitiesByTags = async (
  serviceId: string,
  tags: IEveryAuthTagSet,
  options?: IEveryAuthSearchOptions
): Promise<IEveryAuthIdentitySearch> => {
  // Convert the IEveryAuthTagSet into the right query parameters
  const params = new URLSearchParams();
  const keyOnly: string[] = [];
  Object.entries(tags).forEach(([key, value]) => {
    if (value === null) {
      value = 'null';
    } else if (value === undefined) {
      keyOnly.push(`tag=${encodeURIComponent(key)}`);
      return;
    } else {
      value = encodeURIComponent(value);
    }
    params.append('tag', `${encodeURIComponent(key)}=${value}`);
  });

  if (options) {
    if (options.next) {
      params.set('next', options.next);
    }

    if (options.pageSize) {
      params.set('pageSize', `${options.pageSize}`);
    }
  }

  const profile = await getAuthedProfile();
  const baseUrl = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/connector/${serviceId}`;

  const response = await superagent
    .get(`${baseUrl}/identity/?${keyOnly.join('&')}${keyOnly.length ? '&' : ''}${params.toString()}`)
    .set('User-Agent', EveryAuthVersion)
    .set('Authorization', `Bearer ${profile.token}`);

  return response.body;
};
