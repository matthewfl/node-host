var http = require('http');
var sandbox = require('./sandbox');
var db = require('./db');
var config = require('./config');

var boxes={};

var baseHostMatch = new RegExp(config.productionBase.replace(/\./g, "\\.")+"$");

var server = http.createServer(function (req, res) {
    if(boxes[req.headers.host]) {
	boxes[req.headers.host].server(req,res);
    }else{
	var hostBase = req.headers.host.replace(baseHostMatch, "");
	db.get(hostBase != req.headers.host ? ("baseHost_" + hostBase) : ("host_"+req.headers.host), function (code) {
	    if(!code) {
		res.writeHead(503, {"Content-type":"text/html"});
		res.end("Host not found");
		return;
	    }
	    code = JSON.parse(code);
	    boxes[req.headers.host] = new sandbox.SandBox(code.code, {test: false, user: code.user, app: code.app});
	    boxes[req.headers.host].server(req, res);
	});
    }
});

server.listen(/^[0-9]*$/.exec(process.argv[2]) ? process.argv[2] : process.argv[2]*1);


console.log("production up", process.argv[2]);