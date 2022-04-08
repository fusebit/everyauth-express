const express = require('express');
const everyauth = require('@fusebit/everyauth-express');

const { WebClient } = require('@slack/web-api');

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.redirect('/benn/slack');
});

app.use(
  '/:userId/slack',
  everyauth.authorize('slack', { finishedUrl: '/finished', mapToUserId: (req) => req.params.userId })
);

app.get('/finished', async (req, res) => {
  const userId = req.query.userId;

  // Send a message over slack.
  const userCredentials = await everyauth.getIdentity('slack', userId);
  const slack = new WebClient(userCredentials.accessToken);
  await slack.chat.postMessage({
    text: `Hello World from EveryAuth to ${userId}`,
    channel: '#demo',
  });

  res.send(`Thanks for registering ${userId}`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
