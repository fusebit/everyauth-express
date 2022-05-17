#!/usr/bin/env bash
export EVERYAUTH_TOKEN=$(everyauth token -e 10y)
sls deploy
