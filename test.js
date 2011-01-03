var http = require('http');
var urlParse = require('url').parse;
var config = require('./config');
var sandbox = require('./sandbox');

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
		boxes[name] = new sandbox.SandBox(d, {test: true, user: urlInfo.query.user || null, name: urlInfo.query.fileName || null, _tmp_db: tmp_db});
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

server.listen(config.testPort);
