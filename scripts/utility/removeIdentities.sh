#!/bin/bash

SERVICE=$1
if [ "$SERVICE" = "" ]; then
  echo Usage: $0 \<serviceName\>
  echo
  echo Removes all identities associated with a particular service.
  exit 1
fi

echo WARNING:
echo
echo This will remove all identities associated with a particular service.  All users previously authenticated
echo will be removed, and will have to reauthorize.
echo
read -p "Continue (Y/N)? " -n 1 P; if [ "$P" == 'y' -o "$P" == 'Y' ]; then echo; else exit 1; fi

everyauth identity ls ${SERVICE} -o json | jq -r '.items | .[] | .id' | xargs -n 1 -I '{}' everyauth identity rm ${SERVICE} {} -q
