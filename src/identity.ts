import * as superagent from 'superagent';

import { getAuthedProfile } from './profile';

const USER_KEY = 'fusebit.tenantId';

interface IEveryAuthCredential {
  id: string;
  tags: IEveryAuthTagSet;
  dateModified: string;
  access_token?: string;
}

interface IEveryAuthCredentialSearch {
  items: IEveryAuthCredential[];
  next?: string;
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
  let identityId: string;

  // Determine which lookup mode we're in:
  if (typeof credentialOrUserIdOrAttributes == 'string') {
    if (credentialOrUserIdOrAttributes.startsWith('idn-')) {
      identityId = credentialOrUserIdOrAttributes;
    } else {
      const identities = await getIdentitiesByTags(serviceId, { [USER_KEY]: credentialOrUserIdOrAttributes });
      const items = identities.items.sort(
        (a, b) => new Date(a.dateModified).valueOf() - new Date(b.dateModified).valueOf()
      );
      identityId = items[0].id;
    }
  } else {
    const identities = await getIdentitiesByTags(serviceId, credentialOrUserIdOrAttributes);
    const items = identities.items.sort(
      (a, b) => new Date(a.dateModified).valueOf() - new Date(b.dateModified).valueOf()
    );
    identityId = items[0].id;
  }

  const creds = await getIdentityById(serviceId, identityId);
  return creds;
};

export const getIdentities = async (
  serviceId: string,
  attributes: IEveryAuthTagSet,
  options?: IEveryAuthSearchOptions
): Promise<IEveryAuthCredentialSearch> => {
  const identities = await getIdentitiesByTags(serviceId, attributes, options);

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

export const getIdentityById = async (serviceId: string, identityId: string): Promise<IEveryAuthCredential> => {
  const profile = await getAuthedProfile();
  const tokenPath = `/api/${identityId}/token`;
  const baseUrl = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/connector/${serviceId}`;
  const tokenResponse = await superagent.get(`${baseUrl}${tokenPath}`).set('Authorization', `Bearer ${profile.token}`);

  const connectorToken = tokenResponse.body;
  const isEmpty = !connectorToken || Object.keys(connectorToken).length === 0;

  if (isEmpty) {
    throw new Error(`Cannot find Identity '${identityId}'`);
  }

  return connectorToken;
};

export const getIdentityByUser = async (serviceId: string, userId: string): Promise<IEveryAuthCredential> => {
  const result = await getIdentitiesByTags(serviceId, { [USER_KEY]: userId });

  if (result.items.length != 1) {
    throw new Error(`Unable to find User '${userId}'`);
  }

  return getIdentityById(serviceId, result.items[0].id);
};

const getIdentitiesByTags = async (
  serviceId: string,
  tags: IEveryAuthTagSet,
  options?: IEveryAuthSearchOptions
): Promise<IEveryAuthCredentialSearch> => {
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
    .set('Authorization', `Bearer ${profile.token}`);

  return response.body;
};
