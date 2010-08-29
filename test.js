var http = require('http');
var config = require('./config');
var sandbox = require('./sandbox');

var box;

http.createServer(function (req, res) {
    console.log("connect");
    res.writeHead(200, {"Content-type": "text/plain"});
    if(box) return box.server(req, res);

    //res.end(req.headers.host);
    var data="";
    req.on('data', function(d) {
	data += d.toString('ascii', 0);
    });
    req.on('end', function () {
	console.log(data);
	sandbox.build(data, "void", function (d) {
	    console.log(d);
	    box = new sandbox.SandBox(d, {test: true});
	    res.write(config.testBase);
	    res.end();
	});
    });
}).listen(config.testPort);