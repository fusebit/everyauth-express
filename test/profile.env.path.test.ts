import * as path from 'path';
import * as everyauth from '../src';

test('Load a profile from env path', async () => {
  process.env.EVERYAUTH_PROFILE_PATH = path.join(__dirname, 'mock', 'profile');
  const profile = await everyauth.profile.getAuthedProfile();

  expect(profile.token?.length).toBeGreaterThan(1);

  expect(1).toBe(1);
});
