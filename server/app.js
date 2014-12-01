var express = require('express');
var Mandrill = require('mandrill-api/mandrill');

var config = require((!!process.env.ENV) ? ('./config-' + process.env.ENV) : './config');
var datastore = require('./datastore');
var createApi = require('./api');
var createSite = require('./website');
var createAdmin = require('./admin/admin');

var store = new datastore.Datastore(process.env.DATABASE_URL);
var mandrill = new Mandrill.Mandrill();

var app = express();

///// Web site /////

var website = createSite(mandrill);
app.use('/', website);

///// API /////

var api = createApi(config, store);
app.use('/api', api);

///// Admin site /////

var admin = createAdmin(store);
app.use('/admin', admin);

///// Bootstrap /////

store.testConnection().then(function () {
  console.log("Datastore connection ok");
}).catch(function(err) {
  console.log("Datastore connection failed");
  throw err;
}).done();

mandrill.users.info(function(info) {
  console.log('Mandrill reputation: ' + info.reputation + ', Hourly Quota: ' + info.hourly_quota);
});

console.log("Listening on " + process.env.PORT);
app.listen(process.env.PORT);
