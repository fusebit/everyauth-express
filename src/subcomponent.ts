import * as superagent from 'superagent';

import EveryAuthVersion from './version';

import { SERVICE_TAG, USER_TAG } from './constants';

import { getAuthedProfile } from './profile';

import { IEveryAuthTagSet, IEveryAuthSearchOptions } from './identity';

/**
 * @ignore
 */
export const getChildrenByTags = async <ISearchResultType>(
  tags: IEveryAuthTagSet,
  parentUrlElement: string,
  childElementType: 'identity' | 'install',
  options?: IEveryAuthSearchOptions
): Promise<{ items: ISearchResultType[] }> => {
  if (!tags[SERVICE_TAG]) {
    throw new Error(`Missing tag ${SERVICE_TAG}`);
  }

  if (!tags[USER_TAG]) {
    throw new Error(`Missting tag ${USER_TAG}`);
  }

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
  const baseUrl = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}${parentUrlElement}`;

  const response = await superagent
    .get(`${baseUrl}/${childElementType}/?${keyOnly.join('&')}${keyOnly.length ? '&' : ''}${params.toString()}`)
    .set('User-Agent', EveryAuthVersion)
    .set('Authorization', `Bearer ${profile.token}`);

  return response.body;
};
