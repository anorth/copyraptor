#!/bin/bash

source ./app-credentials.sh
export PORT=3000 

cd server
nodemon app.js 

#node-dev app.js
#node app.js
