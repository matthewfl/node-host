var net = require('net');
//var nStore = require('./lib/nstore');
var config = require('./config');

var master=false;
var connection;
var store;

exports.get = function (key, callback) {
    if(master)
	store.get(key, callback);
};

exports.has = function (key, callback) {
    if(master)
	store.get(key, function (err) {
	    callback(!err);
	});
};

exports.set = function (key, value, callback) {
    callback = callback || function () {};
    if(typeof value != "string")
	value = JSON.stringify(value);
    if(master)
	store.save(key, value, callback);
};

exports.remove = function (key, callback) {
    callback = callback || function () {};
    if(master)
	store.save(key, null, callback);
};

exports._isMaster = function () {
    master=true;
    store = require('./lib/nstore')('./database.db');
    net.createServer(function (stream) {
	
    }).listen(config.dbPort);

};

function checkConnection () {
    if(!connection) {
	
    }
}