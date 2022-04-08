import * as superagent from 'superagent';

import debugModule from 'debug';
const debug = debugModule('everyauth:identity');

import EveryAuthVersion from './version';

import { getAuthedProfile } from './profile';

import * as provider from './provider';

import { USER_TAG } from './constants';

interface IEveryAuthIdentity {
  /** A unique key for this identity. */
  id: string;
  /** A set of key/value pairs that act as attributes on this identity. */
  tags: IEveryAuthTagSet;
  /** The last date that the identity was modified. */
  dateModified: string;
}

/** The results from a getIdentities search. */
interface IEveryAuthIdentitySearch {
  items: IEveryAuthIdentity[];
  /** A token that can be supplied back to request the next page of results. */
  next?: string;
}

/** A specific credential associated with an identityId, normalized to provide a standard interface. */
interface IEveryAuthCredential {
  /** One of the raw results from a particular service; varies based on what service is requested. */
  native: provider.INative;
  /** The OAuth2 accessToken used to authenticate a request. */
  accessToken: string;
}

/**
 * A set of key/value attributes. Use 'undefined' to indicate that any value will match, for a particular
 * key, during a search.
 */
type IEveryAuthTagSet = Record<string, string | undefined | null>;

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
 * @param identityIdOrUserIdOrAttributes Either an identity id uniquely identifying a specific identity, a
 * userId that can be used to search for a matching identity, or a set of attributes that will be used to
 * search.
 * @return A credential with a valid token.
 * @throws An exception is thrown if no identities are found, or more than one identity is found.
 */
export const getIdentity = async (
  serviceId: string,
  identityIdOrUserIdOrAttributes: string | IEveryAuthTagSet
): Promise<IEveryAuthCredential> => {
  let identityId;

  // Is this already an identity?
  if (typeof identityIdOrUserIdOrAttributes == 'string' && identityIdOrUserIdOrAttributes.startsWith('idn-')) {
    identityId = identityIdOrUserIdOrAttributes;
  } else {
    let identities: IEveryAuthIdentitySearch;

    if (typeof identityIdOrUserIdOrAttributes == 'string') {
      identities = await getIdentitiesByTags(serviceId, { [USER_TAG]: identityIdOrUserIdOrAttributes });
    } else {
      identities = await getIdentitiesByTags(serviceId, identityIdOrUserIdOrAttributes);
    }

    debug(`${JSON.stringify(identityIdOrUserIdOrAttributes)}: Found ${identities.items.length} matching identities`);
    if (identities.items.length > 1) {
      throw new Error(
        `The userId "${JSON.stringify(
          identityIdOrUserIdOrAttributes
        )}" resolves to more than one identity. Either use "getIdentities" to list all of the matching identities, or remove redundant identity using "everynode identity rm" or "deleteIdentity"`
      );
    }

    debug(`${JSON.stringify(identityIdOrUserIdOrAttributes)}: returning ${identities.items[0].id}`);

    identityId = identities.items[0].id;
  }

  const creds = await getIdentityById(serviceId, identityId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,security/detect-object-injection
  return (provider as any)[serviceId].normalize(creds);
};

/**
 * Search for matching identities and return all matches found. The results do not include valid tokens.
 * @param serviceId The service to search for matching identities within.
 * @param userIdOrAttributes A set of attributes that are used as search criteria.
 * @param userIdOrAttributes Either a userId that can be used to search for a matching identity, or a set of
 * attributes that will be used to search.
 * @param options Options to control the pagination or request subsequent pages of results.
 * @return A set of matching identities
 */
export const getIdentities = async (
  serviceId: string,
  userIdOrAttributes: string | IEveryAuthTagSet,
  options?: IEveryAuthSearchOptions
): Promise<IEveryAuthIdentitySearch> => {
  let identities;

  if (typeof userIdOrAttributes == 'string') {
    identities = await getIdentitiesByTags(serviceId, { [USER_TAG]: userIdOrAttributes }, options);
  } else {
    identities = await getIdentitiesByTags(serviceId, userIdOrAttributes, options);
  }

  debug(`${JSON.stringify(userIdOrAttributes)}: Found ${identities.items.length} matching identities`);

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
  Object.entries(tags).forEach(([key, value]) => {
    if (value === null) {
      value = 'null';
    } else if (value === undefined) {
      value = '';
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
    .get(`${baseUrl}/identity/?${params.toString()}`)
    .set('User-Agent', EveryAuthVersion)
    .set('Authorization', `Bearer ${profile.token}`);

  return response.body;
};
