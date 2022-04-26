export * as profile from './profile';
export * as session from './session';

export { config } from './profile';
export { getIdentity, getIdentities, deleteIdentity, deleteIdentities } from './identity';
export { authorize, IEveryAuthOptions, getHostedBaseUrl } from './authorize';
