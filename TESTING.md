# How to run tests

EveryAuth comes with a test suite that makes use of a configured EveryAuth profile.  In order to set it up,
first run the `scripts/test/populateTestProfiles.sh` script via `test:setup`:

```
npm run test:setup
```

# Automatic tests

Run the tests that don't require any user action or credentials:

```
npm run test
```

# Manual tests

Run the tests that require human action (such as approving OAuth dialogs):

```
npom run test:manual
```
