ccms
====


Setup
=====
OPTIONAL install foreman
  gem install foreman
     or
  install http://assets.foreman.io/foreman/foreman.pkg

copy template config
copy aws-credentials.sh.tpl to app-credentials.sh and admin-credentials.sh
  fill out credentials from google doc


Run
===
1. Run "backend" server
./rundevserver.sh
  OR
./runforeman.sh (needs foreman installed)

2. Run static file dev server
Go to ../client and  ./rundev.sh

3. Go to file://..../test1.html in browser.

