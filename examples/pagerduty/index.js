const express = require('express');
const everyauth = require('@fusebit/everyauth-express');
const { v4: uuidv4 } = require('uuid');
const cookieSession = require('cookie-session');
const { api } = require('@pagerduty/pdjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'pug');

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
    // The endpoint of your app where control will be returned afterwards
    finishedUrl: '/finished',
    // The user ID of the authenticated user the credentials will be associated with
    mapToUserId: (req) => req.params.userId,
  })
);

/**
 * Display the authorizing user PagerDuty service directory
 */
app.get('/finished', validateSession, async (req, res) => {
  // Handle if any error occurs during the authorization flow.
  const { error } = req.query;

  if (error) {
    return res.render('index', {
      error,
    });
  }

  // Get PagerDuty service credentials.
  const creds = await everyauth.getIdentity('pagerduty', req.session.userId);
  const sdk = api({ token: creds.accessToken, tokenType: 'bearer' });

  // List service directory
  const services = (await sdk.get('/services')).resource;

  // Get authorizing user PagerDuty profile information.
  const me = (await sdk.get('/users/me')).data.user;

  // Display the data
  res.render('index', {
    title: 'Welcome to EveryAuth PagerDuty Demo App!',
    name: me.name,
    avatar_url: me.avatar_url,
    services,
  });
});

/**
 * Create a new incident for a specific service
 */
app.post('/incident', validateSession, async (req, res) => {
  // Handle if any error occurs during the authorization flow.
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

  // Get PagerDuty service credentials.
  const creds = await everyauth.getIdentity('pagerduty', req.session.userId);
  const sdk = api({ token: creds.accessToken, tokenType: 'bearer' });

  // Get authorizing user PagerDuty profile information.
  const me = (await sdk.get('/users/me')).data.user;

  const incident = await sdk.post('/incidents', {
    data: {
      incident: {
        type: 'incident',
        title: 'The server is on fire.',
        service: {
          id: req.query.service,
          type: 'service_reference',
        },
      },
    },
  });

  // Display the created incident
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
