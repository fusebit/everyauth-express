const express = require('express');
const everyauth = require('@fusebit/everyauth-express');

const { WebClient } = require('@slack/web-api');

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.redirect('/slack');
});

app.use(
  '/slack',
  everyauth.authorize('slack', {
    finishedUrl: '/finished',
    mapToUserId: (req) => 'user-123', // req.user.id in production
  })
);

app.get('/finished', async (req, res) => {
  const userId = 'user-123'; // req.user.id in production

  // Send a message over slack.
  const userCredentials = await everyauth.getIdentity('slack', userId);
  const slack = new WebClient(userCredentials?.accessToken);
  const directMessageChannel = userCredentials?.native.authed_user.id;
  await slack.chat.postMessage({
    text: `Hello World from EveryAuth to ${userId}`,
    channel: directMessageChannel,
  });

  res.send(`Thanks for registering ${userId}`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
