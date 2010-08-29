var Script = process.binding('evals').Script;
var db = require('../db');
var modules = require('./modules');

var prefixBase = require('fs').readFileSync(__dirname + '/boxed.js', 'ascii');

function SandBox (code, config) {
    var self = this;
    self.config = config;
    self.raw_server = function () {throw "server not implemented";};
    this.context={
	//__server: function () {throw "server not implemented";},
	__server: function (fun) { self.raw_server=fun || function () {throw "server not implemented";};},
	__get_code: function (name) {
	    if(modules[name]) {
		if(typeof modules[name] == "string")
		    return modules[name];
		return modules[name](self.context, config);
	    }else{
		return code[name];
	    }
	},
	__process_compile: process.compile,
	__process_exit: function () {
	    self.context=null;
	},
	
	// other things
	setTimeout: setTimeout,
	setInterval: setInterval,
	clearTimeout: clearTimeout,
	clearInterval: clearInterval
	
	,debug: console.log
    };
    try {
	Script.runInNewContext(prefixBase + "(function () { "+code._+" })();", this.context, "main");
    } catch(e) {
	console.log(e);
	console.log(e.message || "")
    }
}

SandBox.prototype.server = function (req, res) {
    try {
	this.raw_server(req, res);
    }catch (e) {
	var send="";
	if(typeof e == "string")
	    send =e;
	else{
	    send =e.message+"\n\n"+e.type+"\n\n"+e.stack;
	};
	console.log(send);
	res.end(send);
    }
};


exports.SandBox = SandBox;
exports.build = require('./build').build;