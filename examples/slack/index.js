const express = require('express');
const { v4: uuidv4 } = require('uuid');
const cookieSession = require('cookie-session');

const { WebClient } = require('@slack/web-api');

const everyauth = require('@fusebit/everyauth-express');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Get userId from the authorization redirect or via session if already authorized.
const validateSession = (req, res, next) => {
  if (req.query.userId) {
    req.session.userId = req.query.userId;
  }
  if (!req.session.userId) {
    return res.redirect('/');
  }
  return next();
};

app.use(
  cookieSession({
    name: 'session',
    secret: 'secret',
  })
);

app.set('view engine', 'pug');

app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`/authorize/${uuidv4()}`);
  }
  res.redirect('/finished');
});

app.use(
  '/authorize/:userId',
  (req, res, next) => {
    if (!req.params.userId) {
      return res.redirect('/');
    }
    return next();
  },
  everyauth.authorize('slack', {
    // The endpoint of your app where control will be returned afterwards
    finishedUrl: '/finished',
    // The user ID of the authenticated user the credentials will be associated with
    mapToUserId: (req) => req.params.userId,
  })
);

app.get('/finished', validateSession, async (req, res) => {
  const userCredentials = await everyauth.getIdentity('slack', req.session.userId);
  // Call Slack API
  const slackClient = new WebClient(userCredentials.accessToken);
  const userResponse = await slackClient.users.info({ user: userCredentials.native.authed_user.id });
  res.render('index', { title: 'user profile', user: userResponse.user });
});

app.post('/message', validateSession, async (req, res) => {
  const userCredentials = await everyauth.getIdentity('slack', req.session.userId);
  // Call Slack API
  const slackClient = new WebClient(userCredentials.accessToken);
  const userResponse = await slackClient.users.info({ user: userCredentials.native.authed_user.id });
  const message = req.body.message;

  if (message) {
    await slackClient.chat.postMessage({
      text: message,
      channel: userCredentials.native.authed_user.id,
    });
  }

  res.render('index', {
    title: 'user profile',
    user: userResponse.user,
    messageSent: !!message,
    message: req.body.message || 'Please write a message',
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
