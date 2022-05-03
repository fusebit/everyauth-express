const express = require('express');
const { Gitlab } = require('@gitbeaker/node');
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
  everyauth.authorize('gitlab', {
    // The endpoint of your app where control will be returned afterwards
    finishedUrl: '/finished',
    // The user ID of the authenticated user the credentials will be associated with
    mapToUserId: (req) => req.params.userId,
  })
);

app.get('/finished', validateSession, async (req, res) => {
  const userCredentials = await everyauth.getIdentity('gitlab', req.session.userId);
  const gitlabClient = new Gitlab({ oauthToken: userCredentials.accessToken });
  const user = await gitlabClient.Users.current();

  // Get the last top 10 user starred repositories from GitLab.
  const projects = await gitlabClient.Projects.all({ maxPages: 1, perPage: 10, starred: true });
  res.render('index', {
    title: `GitLab Profile for ${user.username}`,
    ...user,
    projects,
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
