# EveryAuth Salesforce Sample

EveryAuth is the easiest way for your app to access Salesforce APIs. This is a sample Express application that demonstrates the use of EveryAuth in a hypothetical newlestter platform to connect to Salesforce and create new Salesforce Contacts on newsletter signup. 

Follow the [Integrating with Salesforce using Everyauth](https://fusebit.io/blog/everyauth-salesforce) blog post for detailed instructions.

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
cd examples/salesforce
npm i
```

Run the sample app:

```bash
node index.js
```

Navigate to `http://localhost:3000/integration`, click the *Connect* button to authorize access to Salesforce. 

After authorization has completed, click the *Test newsletter signup* button, enter your e-mail address, and click *Submit*. A record will be created in the Salesforce instance you have connected to.

## References

* [Integrating with Salesforce using Everyauth](https://fusebit.io/blog/everyauth-salesforce) blog post.  
* [fusebit/everyauth-express](https://github.com/fusebit/everyauth-express) project documentation.  
* [Salesforce EveryAuth](https://github.com/fusebit/everyauth-express/blob/main/docs/sfdc.md) documentation.  
