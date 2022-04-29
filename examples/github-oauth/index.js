const express = require('express');
const { Octokit } = require('octokit');
const { v4: uuidv4 } = require('uuid');
const cookieSession = require('cookie-session');

const everyauth = require('@fusebit/everyauth-express');

const app = express();
const port = 3000;

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
  everyauth.authorize('githuboauth', {
    // The endpoint of your app where control will be returned afterwards
    finishedUrl: '/finished',
    // The user ID of the authenticated user the credentials will be associated with
    mapToUserId: (req) => req.params.userId,
  })
);

app.get('/finished', validateSession, async (req, res) => {
  const userCredentials = await everyauth.getIdentity('githuboauth', req.session.userId);
  const client = new Octokit({ auth: userCredentials?.accessToken });
  const { data } = await client.rest.users.getAuthenticated();
  const { data: repos } = await client.request('GET /user/repos', {});
  res.render('index', {
    title: `GitHub Profile for ${data.login}`,
    ...data,
    used_storage: Math.round((data.disk_usage * 100) / data.plan.space, 2),
    public_repos: repos,
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
