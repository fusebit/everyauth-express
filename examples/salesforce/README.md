# EveryAuth Salesforce Sample

EveryAuth is the easiest way for your app to access Salesforce APIs. This is a sample Express application that demonstrates the use of EveryAuth in a hypothetical newsletter platform to connect to Salesforce and create new Salesforce Contacts on newsletter signup. 

Follow the [Integrating with Salesforce using EveryAuth](https://fusebit.io/blog/everyauth-salesforce) blog post for detailed instructions.

## Running the Sample App

Make sure to follow the one-time [EveryAuth setup instructions](../README.md) first.

Next, clone and the repo, install dependencies, and run the sample app:

```bash
git clone git@github.com:fusebit/everyauth-express.git
cd everyauth-express/examples/salesforce
npm i
node index.js
```

Then, navigate to `http://localhost:3000/integration`, click the *Connect* button to authorize access to Salesforce. 

After authorization has completed, click the *Test newsletter signup* button, enter your e-mail address, and click *Submit*. A record will be created in the Salesforce instance you have connected to.

## References

* [Integrating with Salesforce using EveryAuth](https://fusebit.io/blog/everyauth-salesforce) blog post.  
* [fusebit/everyauth-express](https://github.com/fusebit/everyauth-express) project documentation.  
* [Salesforce EveryAuth](https://github.com/fusebit/everyauth-express/blob/main/docs/sfdc.md) documentation.  
