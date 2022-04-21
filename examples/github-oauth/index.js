const express = require('express');
const everyauth = require('@fusebit/everyauth-express');
const { Octokit } = require('octokit');
const { v4: uuidv4 } = require('uuid');
const cookieSession = require('cookie-session');

const app = express();
const port = 3000;
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
  everyauth.authorize('githuboauth', {
    finishedUrl: '/finished',
    mapToUserId: (req) => req.params.userId,
  })
);

app.get('/finished', async (req, res) => {
  // Get userId from the authorization redirect or via cookie if already authorized.
  if (req.query.userId) {
    req.session.userId = req.query.userId;
  }

  const userId = req.query.userId || req.session.userId;

  if (!userId) {
    res.redirect('/');
  }

  const userCredentials = await everyauth.getIdentity('githuboauth', userId);
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
