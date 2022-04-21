import * as path from 'path';
import * as fs from 'fs';

import * as jwt from 'jsonwebtoken';

import debugModule from 'debug';
const debug = debugModule('everyauth:profile');

const JWT_CACHE_MARGIN = 1000 * 60 * 5; // 5 minute margin before refreshing the key.
const JWT_DEFAULT_EXPIRES_IN = 60 * 60 * 24;

const settingsName = 'settings.json';
const keyDir = 'keys';
const publicKeyFileName = 'pub';
const privateKeyFileName = 'pri';
const jwtAlgorithm = 'RS256';

interface IProfilePki {
  algorithm: string;
  audience: string;
  issuer: string;
  subject: string;
  kid: string;
  privateKey: string;
  publicKey: string;
}

// Output from `everyauth profile export`
interface IProfile {
  profile: {
    created: string;
    updated: string;
    account: string;
    subscription: string;
    baseUrl: string;
    issuer: string;
    subject: string;
    keyPair: string;
    kid: string;
  };
  type: string;
  pki: IProfilePki;
}

// Output from `everyauth token`
export interface IAuthedProfile {
  account: string;
  subscription: string;
  baseUrl: string;
  accessToken: string;
  expiresAt: string;
  expiresAtMs: number;
}

export let cachedFoundProfile: IProfile;
export let cachedJwt: IAuthedProfile = {
  account: '',
  subscription: '',
  baseUrl: '',
  accessToken: '',
  expiresAt: '',
  expiresAtMs: 0,
};

/**
 * Supply a profile to use directly, instead of using the automatic discovery options.
 *
 * @param profile A profile object, generated either via `everyauth profile export` or via `everyauth token`.  Can include the private and
 * public keys used to authenticate with the remote service for ever-fresh credential generation.
 */
export const config = async (profile: IProfile | IAuthedProfile) => {
  if ('profile' in profile) {
    cachedFoundProfile = profile;
    return;
  }

  cachedJwt = profile;
};

export const loadEnvironmentToken = (): IAuthedProfile | undefined => {
  const profile = process.env.EVERYAUTH_PROFILE_TOKEN
    ? (cachedFoundProfile = JSON.parse(process.env.EVERYAUTH_PROFILE_TOKEN))
    : undefined;

  if (!profile) {
    return undefined;
  }

  cachedJwt = profile;
  cachedJwt.expiresAtMs = Number(new Date(cachedJwt.expiresAt));
  cachedFoundProfile = profile;

  return profile;
};

export const loadProfile = async (profileName?: string): Promise<IProfile> => {
  if (cachedFoundProfile) {
    return cachedFoundProfile;
  }

  // Look for the EVERYAUTH_PROFILE_JSON object
  if (process.env.EVERYAUTH_PROFILE_JSON) {
    return (cachedFoundProfile = JSON.parse(process.env.EVERYAUTH_PROFILE_JSON));
  }

  // Look for the EVERYAUTH_PROFILE_PATH to load a specific directory with a settings.json file in it
  if (process.env.EVERYAUTH_PROFILE_PATH) {
    return (cachedFoundProfile = await loadProfileFromDisk(process.env.EVERYAUTH_PROFILE_PATH, profileName));
  }

  // Recursively look upwards for a `.fusebit` directory
  let settingsDir = '.';
  while (settingsDir != '/') {
    try {
      cachedFoundProfile = await loadProfileFromDisk(path.join(settingsDir, '.fusebit'), profileName);
      return cachedFoundProfile;
    } catch (_) {
      // Ignore filesystem errors and try again
    }
    settingsDir = path.resolve(path.join(settingsDir, '..'));
  }

  throw new Error(`No ${settingsName} found in this tree.`);
};

const loadProfileFromDisk = async (settingsDir: string, profileName?: string): Promise<IProfile> => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const settings = JSON.parse(fs.readFileSync(path.join(settingsDir, settingsName), 'utf8'));

  const profile = settings.profiles[profileName || settings.defaults.profile];
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const publicKey = fs.readFileSync(
    path.join(settingsDir, keyDir, profile.keyPair, profile.kid, publicKeyFileName),
    'utf8'
  );
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const privateKey = fs.readFileSync(
    path.join(settingsDir, keyDir, profile.keyPair, profile.kid, privateKeyFileName),
    'utf8'
  );

  const result = {
    profile,
    type: 'pki',
    pki: {
      algorithm: jwtAlgorithm,
      audience: process.env.FUSEBIT_AUDIENCE || profile.baseUrl, // Provide an override for local test targets.
      issuer: profile.issuer,
      subject: profile.subject,
      kid: profile.kid,
      privateKey,
      publicKey,
    },
  };

  debug(`${settingsDir}: loaded profile`);
  return result;
};

export const getAuthedProfile = async (profileName?: string): Promise<IAuthedProfile> => {
  if (cachedJwt.expiresAtMs > Date.now() + JWT_CACHE_MARGIN) {
    return cachedJwt;
  }

  // Is there a profile in the environment?
  const envProfile = loadEnvironmentToken();
  if (envProfile) {
    return envProfile;
  }

  const profile = await loadProfile(profileName);

  const options = {
    algorithm: profile.pki.algorithm as jwt.Algorithm,
    expiresIn: JWT_DEFAULT_EXPIRES_IN,
    audience: profile.profile.baseUrl,
    issuer: profile.pki.issuer,
    subject: profile.pki.subject,
    keyid: profile.pki.kid,
    header: {
      jwtId: Date.now().toString(),
      alg: profile.pki.algorithm,
    },
  };

  cachedJwt = {
    account: profile.profile.account,
    subscription: profile.profile.subscription,
    baseUrl: profile.profile.baseUrl,
    expiresAtMs: Date.now() + JWT_DEFAULT_EXPIRES_IN * 1000,
    expiresAt: new Date(cachedJwt.expiresAtMs).toUTCString(),
    accessToken: jwt.sign({}, profile.pki.privateKey, options),
  };

  debug(`${profile.profile.keyPair}: generated pki key, expiring at ${cachedJwt.expiresAt}`);
  return cachedJwt;
};
