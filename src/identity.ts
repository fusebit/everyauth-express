import * as superagent from 'superagent';

import debugModule from 'debug';
const debug = debugModule('everyauth:identity');

import EveryAuthVersion from './version';

import { getAuthedProfile } from './profile';

import * as provider from './provider';

import { USER_TAG } from './constants';

interface IEveryAuthIdentity {
  id: string;
  tags: IEveryAuthTagSet;
  dateModified: string;
}

interface IEveryAuthIdentitySearch {
  items: IEveryAuthIdentity[];
  next?: string;
}

interface IEveryAuthCredential {
  native: provider.INative;
  accessToken: string;
}

type IEveryAuthTagSet = Record<string, string | undefined | null>;

interface IEveryAuthSearchOptions {
  next?: string;
  pageSize?: number;
}

export const getIdentity = async (
  serviceId: string,
  credentialOrUserIdOrAttributes: string | IEveryAuthTagSet
): Promise<IEveryAuthCredential> => {
  let identityId: string | undefined = undefined;

  // Is this already an identity?
  if (typeof credentialOrUserIdOrAttributes == 'string' && credentialOrUserIdOrAttributes.startsWith('idn-')) {
    identityId = credentialOrUserIdOrAttributes;
  } else {
    let identities: IEveryAuthIdentitySearch;

    if (typeof credentialOrUserIdOrAttributes == 'string') {
      identities = await getIdentitiesByTags(serviceId, { [USER_TAG]: credentialOrUserIdOrAttributes });
    } else {
      identities = await getIdentitiesByTags(serviceId, credentialOrUserIdOrAttributes);
    }

    debug(`${JSON.stringify(credentialOrUserIdOrAttributes)}: Found ${identities.items.length} matching identities`);
    const items = identities.items.sort(
      (a, b) => new Date(a.dateModified).valueOf() - new Date(b.dateModified).valueOf()
    );

    debug(`${JSON.stringify(credentialOrUserIdOrAttributes)}: returning ${items[0].id}`);
    identityId = items[0].id;
  }

  const creds = await getIdentityById(serviceId, identityId);
  return (provider as any)[serviceId].normalize(creds);
};

export const getIdentities = async (
  serviceId: string,
  attributes: IEveryAuthTagSet,
  options?: IEveryAuthSearchOptions
): Promise<IEveryAuthIdentitySearch> => {
  const identities = await getIdentitiesByTags(serviceId, attributes, options);

  debug(`${JSON.stringify(attributes)}: Found ${identities.items.length} matching identities`);

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

export const getIdentityById = async (serviceId: string, identityId: string): Promise<IEveryAuthIdentity> => {
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

export const getIdentityByUser = async (serviceId: string, userId: string): Promise<IEveryAuthIdentity> => {
  const result = await getIdentitiesByTags(serviceId, { [USER_TAG]: userId });

  if (result.items.length != 1) {
    debug(`${userId}: No matching identity found for ${serviceId}`);
    throw new Error(`Unable to find User '${userId}'`);
  }

  return getIdentityById(serviceId, result.items[0].id);
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
