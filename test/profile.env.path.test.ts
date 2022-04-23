import * as path from 'path';
import * as everyauth from '../src';

test('Load a profile from env path', async () => {
  process.env.EVERYAUTH_PROFILE_PATH = path.join(__dirname, 'mock', 'profile');
  const profile = await everyauth.profile.getAuthedProfile();

  expect(profile.accessToken?.length).toBeGreaterThan(1);
});
