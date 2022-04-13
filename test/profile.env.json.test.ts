import * as path from 'path';
import * as fs from 'fs';

import * as everyauth from '../src';

test('Load a profile from an env with a JSON profile', async () => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const jsonProfile = fs.readFileSync(path.join(__dirname, 'mock', 'profile.json'), 'utf8');
  process.env.EVERYAUTH_PROFILE_JSON = jsonProfile;
  const profile = await everyauth.profile.getAuthedProfile();

  expect(profile.token?.length).toBeGreaterThan(1);

  expect(1).toBe(1);
});
