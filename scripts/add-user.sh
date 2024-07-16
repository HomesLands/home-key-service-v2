#!/usr/bin/env bash

until mongo admin --host mongo -u admin -p admin123 --eval "print(\"Waited for connection\")"
do
    sleep 1
done

echo "Adding user to MongoDB..."

mongo admin --host mongo -u admin -p admin123 --eval "db = db.getSiblingDB(\"thaimobility\");db.createUser({user: \"thaimobility\", pwd: \"admin123\", roles: [{role: \"dbOwner\", db: \"thaimobility\"}]})"

echo "User added."

#for i in 5 ; do
#    mongo admin --host mongo -u admin -p admin123 --eval "print(\"Waited for connection\")" > /dev/null 2>&1
#
#    result=$?
#    if [ $result -eq 0 ] ; then
#      if [ $# -gt 0 ] ; then
#        mongo admin --host mongo -u admin -p admin123 --eval "db = db.getSiblingDB(\"thaimobility\");db.createUser({user: \"thaimobility\", pwd: \"admin123\", roles: [{role: \"dbOwner\", db: \"thaimobility\"}]})"
#      fi
#      exit 0
#    fi
#    sleep 1
#  done
#  echo "Operation timed out" >&2
#  exit 1