# EveryAuth HubSpot Sample

EveryAuth is the easiest way for your app to access HubSpot APIs. This is a sample Express application that demonstrates the use of EveryAuth in a hypothetical newsletter platform to connect to HubSpot and create new HubSpot Contact on newsletter signup. 

Follow the [Integrating with HubSpot using EveryAuth](https://fusebit.io/blog/everyauth-hubspot) blog post for detailed instructions.

## Running the Sample App

Make sure to follow the one-time [EveryAuth setup instructions](../README.md) first.

Clone and build the repo:

```bash
git clone git@github.com:fusebit/everyauth-express.git
cd everyauth-express
npm i
npm run build
```

Install sample dependencies:

```bash
cd examples/hubspot
npm i
```

Run the sample app:

```bash
node index.js
```

Navigate to `http://localhost:3000/integration`, click the *Connect* button to authorize access to HubSpot. 

After authorization has completed, click the *Test newsletter signup* button, enter your e-mail address, and click *Submit*. A contact will be created in the HubSpot instance you have connected to.

## References

* [Integrating with HubSpot using EveryAuth](https://fusebit.io/blog/everyauth-hubspot) blog post.  
* [fusebit/everyauth-express](https://github.com/fusebit/everyauth-express) project documentation.  
* [HubSpot EveryAuth](https://github.com/fusebit/everyauth-express/blob/main/docs/hubspot.md) documentation.  
