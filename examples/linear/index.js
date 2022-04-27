const express = require('express');
const everyauth = require('@fusebit/everyauth-express');
const { LinearClient } = require('@linear/sdk');
const { v4: uuidv4 } = require('uuid');
const cookieSession = require('cookie-session');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = 3000;

// Get userId from the authorization redirect or via session if already authorized.
const handleSession = (req, res, next) => {
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
  everyauth.authorize('linear', {
    // The endpoint of your app where control will be returned afterwards
    finishedUrl: '/finished',
    // The user ID of the authenticated user the credentials will be associated with
    mapToUserId: (req) => req.params.userId,
  })
);

app.post('/create-issue', handleSession, async (req, res) => {
  const userCredentials = await everyauth.getIdentity('linear', req.session.userId);
  const linearClient = new LinearClient({ accessToken: userCredentials?.accessToken });
  const { teamId, title, description } = req.body;
  const me = await linearClient.viewer;

  const { _issue } = await linearClient.issueCreate({ teamId, title, description, assigneeId: me.id });
  const linearIssue = await linearClient.issue(_issue.id);

  res.render('issue-created', {
    ...linearIssue,
  });
});

app.get('/finished', handleSession, async (req, res) => {
  const userCredentials = await everyauth.getIdentity('linear', req.session.userId);
  const linearClient = new LinearClient({ accessToken: userCredentials?.accessToken });
  const me = await linearClient.viewer;
  const teams = await me.teams();
  const myIssues = await me.assignedIssues({
    first: 10,
    orderBy: 'updatedAt',
    filter: {
      state: {
        name: {
          neq: 'Done',
        },
        and: {
          name: {
            neq: 'Canceled',
          },
        },
      },
    },
  });
  res.render('index', {
    title: `Linear demo for ${me.displayName}`,
    ...me,
    issues: myIssues.nodes,
    teams: teams.nodes,
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
