var net = require('net');
//var nStore = require('./lib/nstore');
var config = require('./config');

var master=false;
var store;

exports.get = function (key, callback) {
    if(master)
	store.get(key, function (err, doc, meta) { callback(err ? null : doc) });
    else
	queue.add("r"+key, callback);
};

exports.has = function (key, callback) {
    if(master)
	store.get(key, function (err) {
	    callback(!err);
	});
    else
	queue.add("h"+key, function (a) { callback(!!a); });
};

exports.set = function (key, value, callback) {
    callback = callback || function () {};
    if(typeof value != "string")
	value = JSON.stringify(value);
    if(master)
	store.save(key, value, callback);
    else
	queue.add("s"+key.length+"\n"+key+value, callback);
};

exports.remove = function (key, callback) {
    callback = callback || function () {};
    if(master)
	store.save(key, null, callback);
    else
	queue.add("d"+key, callback);
};

exports.setCat = function (key, value, callback) {
    exports.get(key, function (d) {
	exports.set(key, d?d:""+value, callback);
    });
};

exports.addInt = function (key, value, callback) {
    exports.get(key, function (d) {
	exports.set(key, d*1+value);
	callback(d*1+value);
    });
};

exports._isMaster = function () {
    master=true;
    store = require('./lib/nstore')('./database.db');
    net.createServer(function (stream) {
	console.log('db connection');
	stream.setEncoding('ascii');
	stream.on('data', function (data) {
	    switch(data[0]) {
	    case 'e':
		stream.end();
		return;
	    case 'r':
		store.get(data.substring(1).split("\n")[0], function (err, doc, meta) {
		    stream.write(doc+"\n");
		});
		return;
	    case 's':
		var length = data.substring(1).split("\n")[0]*1;
		var key = data.substring(data.indexOf("\n"),length);
		var value = data.substring(length+1);
		store.save(key,value,function () {});
		stream.write("\n");
		return;
	    case 'd':
		store.save(data.substring(1).split("\n")[0], null, function () {});
		stream.write("\n");
		return;
	    case 'h':
		store.get(data.substring(1).split("\n")[0], function (err, doc, meta) {
		    stream.write(err ? "0\n" : "1\n");
		});
	    }
	});
	stream.on('end', function (data) {
	    stream.end();
	});
    }).listen(config.testDbPort);

};



var queue = {
    connection: false,
    buffer: "",
    checkConnection: function () {
	if(!queue.connection) {
	    queue.running = true;
	    queue.connection = net.createConnection(config.testDbPort);
	    queue.connection.on('data', function (data) {
		queue.buffer += data;
		var l = queue.buffer.indexOf("\n");
		if(l != -1) {
		    queue.callback.shift()(queue.buffer.substring(0,l));
		    queue.buffer = queue.buffer.substring(l+1);
		    queue.running = false;
		    process.nextTick(queue.doAct)
		}
	    });
	    queue.connection.on('connect', function () {
		queue.running = false;
		process.nextTick(queue.doAct);
	    });
	    queue.connection.on('end', function () {
		queue.connection = false;
	    });
	}
    },
    running: false,
    doAct: function () {
	queue.checkConnection();
	if(!queue.running && queue.q.length) {
	    queue.connection.write(queue.q.shift() + "\n");
	}
    },
    q: [],
    callback: [],
    add: function (msg, callback) {
	queue.q.push(msg);
	queue.callback.push(callback);
	queue.doAct();
    },
};