# Reddit Example

This example assumes you already have EveryAuth configured in your development environment. If you don't, follow the [configuration steps](https://github.com/fusebit/everyauth-express#getting-started). 

This example contains an Express.js application that integrates with the Reddit API using the [snoowrap](https://www.npmjs.com/package/snoowrap) package to display the following information:
- Reddit user profile: Prefixed user name, snoovatar, karma and banner image.
- Get the top 30 upvote comments sorted descending by upvotes.


Once the application is authorized, you will see something similar like the following image:

![Screenshot demo](reddit-example.png "Screenshot demo")
## Install dependencies

```bash
npm i
```

Run the application

```bash
node .
```

Navigate to `http://localhost:3000`

If you're in development mode run

```bash
npm run dev
```

[Read our blog post about integrating with Reddit](https://fusebit.io/blog/using-reddit-with-everyauth?utm_source=github.com&utm_medium=referral&utm_campaign=everyauth-examples&utm_content=using-reddit-with-everyauth)