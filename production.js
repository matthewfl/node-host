var http = require('http');
var sandbox = require('./sandbox');
var db = require('./db');
var config = require('./config');

var boxes={};

var server = http.createServer(function (req, res) {
    if(req.connection.remoteAddress != "127.0.0.1") {res.writeHead(400, {"Connection":"close"}); return res.end();}
    if(boxes[req.headers.host]) {
	boxes[req.headers.host]._last_use = Date.now();
	boxes[req.headers.host].server(req,res);
    }else{
	var hostBase = req.headers.host.replace(config.productionBase, "");
	console.log(hostBase);
	db.get(hostBase != req.headers.host ? ("app_" + hostBase) : ("Domain_"+req.headers.host), function (code) {
	    console.log(code);
	    if(!code) {
		res.writeHead(503, {"Content-type":"text/html"});
		res.end("Host not found");
		return;
	    }
	    code = JSON.parse(code);
	    boxes[req.headers.host] = new sandbox.SandBox(code.code, {test: false, user: code.user, app: code.app});
	    boxes[req.headers.host]._loaded = Date.now();
	    boxes[req.headers.host]._last_use = Date.now();
	    boxes[req.headers.host].server(req, res);
	});
    }
});

setInterval(function () {
    var time = Date.now();
    for(var a in boxes) {
	if(time - boxes[a]._last_use > 300*1000) {
	    boxes[a] = null;
	}
    }
    for(var a in boxes) {
	if(time - boxes[a]._loaded > 7*60*1000) {
	    var hostBase = a.replace(config.productionBase, "");
	    db.get(hostBase != a ? ("app_" + hostBase) : ("Domain_"+req.headers.host), function (code) {
		code = JSON.parse(code);
		boxes[a] = new sandbox.SandBox(code.code, {test: false, user: code.user, app: code.app});
		boxes[a]._loaded = time;
		boxes[a]._last_use = time - 60*1000;
	    });
	}
    }
}, 20000);

setInterval(function () {
    console.log(config.checkOkCode);
}, config.sendOkInterval);

server.listen(/^[0-9]*$/.exec(process.argv[2]) ? process.argv[2] : process.argv[2]*1);


console.log("production up", process.argv[2]);