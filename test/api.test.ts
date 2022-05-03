process.env.EVERYAUTH_VERSION_PREFIX = 'test-';

import * as path from 'path';
import * as everyauth from '../src';

process.env.EVERYAUTH_PROFILE_PATH = path.join(__dirname, 'mock', 'profile');

test('deleteIdentities throws with empty search criteria', async () => {
  await expect(async () => await everyauth.deleteIdentities('slack', {})).rejects.toThrow(
    /The 'idsOrTags' parameter, if not null, must specify at least one identity selection criteria/
  );
});

test('deleteIdentities throws with undefined search criteria', async () => {
  await expect(async () => await everyauth.deleteIdentities('slack', undefined)).rejects.toThrow(
    /The 'idsOrTags' parameter, if not null, must specify at least one identity selection criteria/
  );
});
