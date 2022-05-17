# PagerDuty Application Example

This example assumes you already have EveryAuth configured in your development environment. In case you don’t, follow the [configuration steps](https://github.com/fusebit/everyauth-express#getting-started).

You have an existing Express application that needs to integrate with the PagerDuty API to display the following information.

- User information
- Services within the PagerDuty account
- Create a new incident for a specific service

The application will display the authorized user's PagerDuty account profile and the services it's got access to.

Once the application is authorized, you will see something similar similar the following image:

![Screenshot demo](pd-demo.png 'Screenshot demo')

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

[Read our blog post about integrating with PagerDuty](https://fusebit.io/blog/using-pagerduty-with-everyauth?utm_source=github.com&utm_medium=referral&utm_campaign=everyauth-examples&utm_content=using-pagerduty-with-everyauth)
