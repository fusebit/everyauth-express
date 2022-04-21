import * as path from 'path';
import * as fs from 'fs';

import * as everyauth from '../src';

test('Load a profile from an env with JWT profile', async () => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const jsonProfile = fs.readFileSync(path.join(__dirname, 'mock', 'jwt.json'), 'utf8');
  process.env.EVERYAUTH_PROFILE_TOKEN = jsonProfile;
  const profile = await everyauth.profile.getAuthedProfile();

  expect(profile.accessToken?.length).toBeGreaterThan(1);
});
