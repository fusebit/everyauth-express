import * as everyauth from '../src';

test('Validate that the traversal stops when the parent directory is found', async () => {
  process.chdir('/tmp');
  await expect(everyauth.profile.getAuthedProfile()).rejects.toThrow();
});
