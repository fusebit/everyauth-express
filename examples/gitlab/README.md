# GitLab Application Example

This example assumes you already have EveryAuth configured in your development environment. If you don’t, follow the [configuration steps](https://github.com/fusebit/everyauth-express#getting-started). 

This example contains an Express.js application that integrates with the GitLab API via [@gitbeaker/node](https://www.npmjs.com/package/@gitbeaker/node) to display the following information:
- User profile information
- User starred repositories

Once the application is authorized, you will see something similar like the following image:

![Screenshot demo](blog-using-gitlab-with-everyauth.png "Screenshot demo")
## Install dependencies

```shell
npm i
```

Run the application

```shell
node .
```

Navigate to `http://localhost:3000`

[Read our blog post about integrating with GitLab](https://fusebit.io/blog/integrate-gitlab-api-everyauth?utm_source=github.com&utm_medium=referral&utm_campaign=everyauth-examples&utm_content=using-gitlab-with-everyauth)