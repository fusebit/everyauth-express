const express = require('express');
const everyauth = require('@fusebit/everyauth-express');
const { Octokit } = require('octokit');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;
app.set('view engine', 'pug');

app.use(
  '/authorize',
  everyauth.authorize('githuboauth', {
    finishedUrl: '/finished',
    mapToUserId: (req) => uuidv4(),
  })
);

app.get('/finished', async (req, res) => {
  const userId = req.query.userId;
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
