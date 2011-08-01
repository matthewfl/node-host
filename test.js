var http = require('http');
var urlParse = require('url').parse;
var config = require('./config');
var sandbox = require('./sandbox');

var io = require('./lib/socket.io');
var fs = require('fs');
var format = require('./lib/format').format;
var EventEmitter = require('events').EventEmitter;

var ErrorEmitter = new EventEmitter();
var LogEmitter = new EventEmitter();


var boxes = {};

var server = http.createServer(function (req, res) {
    if(req.connection.remoteAddress != "127.0.0.1") {res.writeHead(400, {"Connection":"close"}); return res.end();}
    console.log("connect", req.headers.host);
    //res.writeHead(200, {"Content-type": "text/plain"});
    if(req.headers.host == config.testHost) {
	res.writeHead(200, {"Content-type": "text/plain"});
	var data="";
	req.on('data', function(d) {
	    data += d.toString('ascii', 0);
	});
	req.on('end', function () {
	    var urlInfo = urlParse(req.url, true);
	    console.log(data, urlInfo.query.user, urlInfo.query.file, req.url);
	    if(urlInfo.query.key != config.testSKey) {
		res.write("This test server has expired");
		res.end();
		return;
	    }
	    sandbox.build(data, urlInfo.query.user, urlInfo.query.file, function (d) {
		console.log(d)
		var name;
		if(urlInfo.query.user && urlInfo.query.user != "null" && urlInfo.query.file && urlInfo.query.file != "null")
		    name = urlInfo.query.token+"."+urlInfo.query.file.replace(/[^a-zA-Z0-9]/g,"-")+"."+urlInfo.query.user+config.testBase;
		else
		    name = Math.random().toString().substring(2,12) + config.testBase;
		name = name.toLowerCase();
		var tmp_db={};
		if(boxes[name]) {
		    clearTimeout(boxes[name]._timer);
		    tmp_db=boxes[name].config._tmp_db;
		}
		boxes[name] = new sandbox.SandBox(d, {test: true, user: urlInfo.query.user || null, name: urlInfo.query.fileName || null, _tmp_db: tmp_db, 
						      error: function () {
							  ErrorEmitter.emit(name, format.apply(this, arguments));
						      },
						      log: function () {
							  LogEmitter.emit(name, format.apply(this, arguments));
						      }
						     });
		boxes[name]._timer = setTimeout(function () {
		    boxes[name] =null;
		}, config.testTimeToLive);
		res.write("http://"+name /* + ":8000" for testing */);
		if(boxes[name].error) res.write("\nerror\n");
		res.end();
	    });
	});
    }else{
	if(boxes[req.headers.host]) {
	    boxes[req.headers.host].server(req, res);
	}else{
	    res.writeHead(503, {"Content-type": "text/html"});
	    res.write("This test server has expired");
	    res.end();
	}
    }
});

setInterval(function () {
    console.log(config.checkOkCode);
}, config.sendOkInterval);


function print_clean(data) {
    return data.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

var base_live_console = fs.readFileSync('./static/live_console.html').toString()

var live_console = http.createServer(function (req, res) {
    res.end(base_live_console);
});

io = io.listen(live_console);

io.sockets.on('connection', function (socket) {
    var host=false;
    function error_send(s) {
	socket.send("<p style='color:red'>"+print_clean(s)+"</p>");
    }
    function log_send(s) {
	socket.send("<p>"+print_clean(s)+"</p>");
    }
    socket.on('disconnect', function () {
	if(host) {
	    ErrorEmitter.removeListener(host, error_send);
	    LogEmitter.removeListener(host, log_send);
	}
    });
    socket.on('message',  function (data) {
	console.log("=========================================",data);
	if(host) {
	    ErrorEmitter.removeListener(host, error_send);
	    LogEmitter.removeListener(host, log_send);
	}
	host = data;
	ErrorEmitter.on(host, error_send);
	LogEmitter.on(host, log_send);
	socket.send("Connected to: "+data+"<br>");
    });
    socket.send("Loading Connection...<br>");
});

server.listen(config.testPort);

live_console.listen(config.testConsole);
