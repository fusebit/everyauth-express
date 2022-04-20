import * as path from 'path';
import * as fs from 'fs';

import * as jwt from 'jsonwebtoken';

import debugModule from 'debug';
const debug = debugModule('everyauth:profile');

const JWT_CACHE_MARGIN = 1000 * 60 * 5; // 5 minute margin before refreshing the key.
const settingsName = 'settings.json';
const keyDir = 'keys';
const publicKeyFileName = 'pub';
const privateKeyFileName = 'pri';
const jwtAlgorithm = 'RS256';

interface IProfilePki {
  algorithm: 'RS256';
  audience: string;
  issuer: string;
  subject: string;
  kid: string;
  privateKey?: string;
  publicKey?: string;
}

export interface IProfile {
  created: string;
  updated: string;
  account: string;
  subscription: string;
  baseUrl: string;
  issuer: string;
  subject: string;
  keyPair: string;
  kid: string;
  pki: IProfilePki;

  staticToken?: string;
  token?: string;
}

export let cachedFoundProfile: IProfile;

export const cachedJwt: {
  expiresAt: number;
  token: string;
} = { expiresAt: 0, token: '' };

/**
 * Supply a profile to use directly, instead of using the automatic discovery options.
 *
 * @param profile A profile object, created from a previously initialized profile.  Includes the private and
 * public keys used to authenticate with the remote service.
 */
export const config = async (profile: IProfile) => {
  cachedFoundProfile = profile;
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

  profile.pki = {
    algorithm: jwtAlgorithm,
    audience: process.env.FUSEBIT_AUDIENCE || profile.baseUrl, // Provide an override for local test targets.
    issuer: profile.issuer,
    subject: profile.subject,
    kid: profile.kid,
    privateKey,
    publicKey,
  };

  debug(`${settingsDir}: loaded profile`);
  return profile;
};

export const getAuthedProfile = async (profileName?: string): Promise<IProfile> => {
  if (cachedJwt.expiresAt > Date.now() + JWT_CACHE_MARGIN) {
    return { ...cachedFoundProfile, token: cachedJwt.token };
  }

  const profile = await loadProfile(profileName);
  const options = {
    algorithm: profile.pki.algorithm,
    expiresIn: 60 * 60 * 24,
    audience: profile.baseUrl,
    issuer: profile.pki.issuer,
    subject: profile.pki.subject,
    keyid: profile.pki.kid,
    header: {
      jwtId: Date.now().toString(),
      alg: profile.pki.algorithm,
    },
  };

  cachedJwt.expiresAt = Date.now() + 60 * 60 * 24 * 1000;
  cachedJwt.token = profile.staticToken ? profile.staticToken : jwt.sign({}, profile.pki.privateKey as string, options);

  debug(`${profile.keyPair}: generated pki key, expiring at ${new Date(cachedJwt.expiresAt).toUTCString()}`);
  return { ...cachedFoundProfile, token: cachedJwt.token };
};
