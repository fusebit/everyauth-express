import * as path from 'path';
import * as everyauth from '../src';

test('Load a profile by walking upwards, looking for a .fusebit directory', async () => {
  const profile = await everyauth.profile.getAuthedProfile();

  expect(profile.token?.length).toBeGreaterThan(1);

  expect(1).toBe(1);
});
