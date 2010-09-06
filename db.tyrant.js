var tyrant = require('./lib/tyrant');
var config = require('./config')

tyrant.connect(config.dbPort, config.dbHost);

exports._isMaster=function (){};

exports.get = function (key, callback) {
    tyrant.get(key, function (err, dat) {
	callback(err ? null : dat[0]);
    });
};

exports.has = function (key, callback) {
    tyrant.get(key, function (err, dat) {
	callback(!err);
    });
};

exports.set = function (key, value, callback) {
    callback = callback || function () {};
    tyrant.put(key, value, callback);
};

exports.remove = function (key, callback) {
    callback = callback || function () {};
    tyrant.out(key, function () { callback (); });
};