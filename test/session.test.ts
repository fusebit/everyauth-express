import * as path from 'path';
import * as everyauth from '../src';

test('Starting a session returns a valid start url', async () => {
  process.env.EVERYAUTH_PROFILE_PATH = path.join(__dirname, 'mock', 'profile');
  const profile = await everyauth.profile.loadProfile();

  const startUrl = await everyauth.session.start('slack', 'user-1', 'https://localhost:3000');
  expect(startUrl).toMatch(
    // eslint-disable-next-line security/detect-non-literal-regexp
    new RegExp(
      `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/integration/everyauth/session/.*/start`
    )
  );
});