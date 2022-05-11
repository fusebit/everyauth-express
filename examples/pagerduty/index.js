const express = require('express');
const everyauth = require('@fusebit/everyauth-express');
const { v4: uuidv4 } = require('uuid');
const cookieSession = require('cookie-session');
const { api } = require('@pagerduty/pdjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'pug');

const ensureSession = (req, res, next) => {
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
  everyauth.authorize('pagerduty', {
    finishedUrl: '/finished',
    mapToUserId: (req) => req.params.userId,
  })
);

app.get('/finished', ensureSession, async (req, res) => {
  const { error } = req.query;
  if (error) {
    return res.render('index', {
      error,
    });
  }

  const creds = await everyauth.getIdentity('pagerduty', req.session.userId);
  const sdk = api({ token: creds.accessToken, tokenType: 'bearer' });
  const services = (await sdk.get('/services')).resource;
  const me = (await sdk.get('/users/me')).data.user;
  res.render('index', {
    title: 'Welcome to EveryAuth PagerDuty Demo App!',
    name: me.name,
    avatar_url: me.avatar_url,
    services,
  });
});

app.post('/incident', ensureSession, async (req, res) => {
  const { error, service } = req.query;
  if (error) {
    return res.render('index', {
      error,
    });
  }

  if (!service) {
    return res.render('index', {
      error: 'Missing a service to trigger the incident',
    });
  }

  const creds = await everyauth.getIdentity('pagerduty', req.session.userId);
  const sdk = api({ token: creds.accessToken, tokenType: 'bearer' });
  const me = (await sdk.get('/users/me')).data.user;
  
  const incident = await sdk.post('/incidents', {
    data: {
      'incident': {
        'type': 'incident',
        'title': 'The server is on fire.',
        'service': {
          'id': req.query.service,
          'type': 'service_reference'
        }
      }
    }
  });

  res.render('incident', {
    title: 'Incident created',
    name: me.name,
    avatar_url: me.avatar_url,
    incident: incident.data.incident,
  });
});

app.listen(PORT, () => {
  console.log(`Example app running on http://localhost:${PORT}`);
});
