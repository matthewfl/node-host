var db = require('../db');
var jsmin = require('../lib/jsmin').jsmin;
var modules = require('./modules');
var spawn = require('child_process').spawn

function builder (code, user, Fname, back) {
    this.back = back;
    this.user = user;
    this.need = {};
    this.pub = {};
    this.code = {};
    this.counter=1;
    this.compiler(code, Fname, true);
    this.count();
}

builder.prototype.compiler = function (code, name, root) {
    var self=this;
    function done (code) {
	self.require(code);
	self.code[root === true ? "_" : name] = jsmin("",code,1);
    }
    try {
	var suffix = /\.([a-zA-Z0-9]*)$/.exec(name)[1].toLowerCase();
	// do compiling of code here
	try {
	    switch(suffix) {
	    case 'coffee':
		// code = code.replace(/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+/g, "");
		var cofcomp = spawn('./compiler/coffee/bin/coffee', ['-sc']);
		var data="";
		cofcomp.stdout.on('data', function (d) { 
		    
		    data += d;
		});
		cofcomp.on('exit', function () {
		    console.log("................................exit", data);
		    done(data);
		});
		setTimeout(function () {
		    cofcomp.stdin.write(code)
		    cofcomp.stdin.end();
		}, 100);
		
		break;

	    default:
		console.log("ddone");
		done(code);
	    }
	}catch(e) {
	    // report errors to users
	    code = "throw "+JSON.stringify(e);
	    console.log("edone");
	    done(code);
	}
    }catch(e){
	console.log("gdone");
	done(code);
    }
/*
  this.require(code);
  this.code[root === true ? "_" : name] = jsmin("",code,1); 
*/
};

builder.prototype.require = function (code) {
    var self = this;
    code.replace(/require\s*?\((.*?)\)/g, function (r, v) {
	try {
	    console.log(v);
	    var name = v.replace(/\"(.*)\"|\'(.*)\'/, function (r) { return r.substring(1,r.length-1); });
	    if(!self.need[name]) {
		self.need[name] = true;
		self.searcher(name);
	    }
	}catch(e) {
	    // no good way to get this back out
	    //throw "Require needs to be static";
	}
	return r;
    });
};

builder.prototype.searcher = function (name) {
    console.log(name.indexOf('/'))
    if(name.indexOf("./") == 0) {
	this.counter++;
	(function (name,self) {
	    db.get("fs_"+self.user+"_"+name.substring(2), function (code) {
		if(code) 
		    self.compiler(code,name);
		else
		    self.code[name] = "throw '"+name+" not found';";
		self.count();
	    });
	})(name, this);
    }else if(name.indexOf('/') != -1) {
	this.counter++;
	var user = name.substring(0,name.indexOf('/'));
	var file = name.substring(name.indexOf('/')+1);
	if(typeof this.pub[user] != "undefined") {
	    if(this.pub[user].indexOf(file) != -1) {
		(function (name, self) {
		    db.get("fs_"+user+"_"+file, function (code) {
			console.log(code)
			if(code)
			    self.compiler(code,name);
			else
			    self.code[name] = "throw '"+name+" not found';";
			self.count();
		    });
		})(name, this);
	    }else{
		this.code[name] = 'throw "external user module '+name+' was not found";';
		this.count();
	    }
	}else{
	    (function (user, self, name) {
		db.get("lsPublic_"+user, function (data) {
		    if(!data) {
			self.code[name] = 'throw "external user module '+name+' was not found";';
			self.count();
		    }else{
			self.pub[user] = data.split("*");
			self.searcher(name);
			self.count();
		    }
		});
	    })(user, this, name);
	}
    }else if(typeof modules[name] != "undefined") {}
    else
	this.code[name] = 'throw "Module '+name+' not found";';
};

builder.prototype.count = function () {
    if(!--this.counter)
	this.back(this.code);
};

exports.build = function (code, user, Fname, back) {
    var b = new builder(code, user, Fname, back);
};
