const express = require('express');
const everyauth = require('@fusebit/everyauth-express');
const { v4: uuidv4 } = require('uuid');
const cookieSession = require('cookie-session');
const { api } = require('@pagerduty/pdjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'pug');

const handleSession = (req, res, next) => {
  if (req.query.userId) {
    req.session.userId = req.query.userId;
  }

  if (!req.session.userId) {
    return res.redirect('/');
  }

  return next();
};

app.use(cookieSession({ name: 'sess', secret: process.env.COOKIE_SECRET || 'supersecuresecret' }));

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
  everyauth.authorize('pagerduty', {
    finishedUrl: '/finished',
    mapToUserId: (req) => req.params.userId,
  })
);

app.get('/finished', handleSession, async (req, res) => {
  const creds = await everyauth.getIdentity('pagerduty', req.session.userId);
  const sdk = api({ token: creds.accessToken, tokenType: 'bearer' });
  const services = await (await sdk.get('/services')).resource;
  const me = await (await sdk.get('/users/me')).data.user;
  res.render('index', {
    title: 'Welcome to EveryAuth PagerDuty Demo App!',
    name: me.name,
    avatar_url: me.avatar_url,
    svcs: services,
  });
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
