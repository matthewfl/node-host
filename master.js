var db = require('./db');
var child = require('child_process');
var sys = require('sys');
var config = require('./config');
db._isMaster();

var proc = [];
var front;
var time=Date.now();


function instance (name, args) {
    this.Dorestart=true;
    this.name =name;
    this.args =args;
    this.load();
}
instance.prototype.ok = function () {
    // should check the ram and the cpu usage
    return (time - this.lastOk) < config.checkInterval;
};

instance.prototype.restart = function () {
    console.log("restarted", time - this.lastOk, this.name, this.args);
    this.lastOk += 1000;
    var tmp = this.Dorestart, self=this;
    this.Dorestart = false;
    //this.child.removeListener('exit', this.exited);
    try {
	this.child.kill();
    }catch(e) {}
    this.load();
    setTimeout(function () { 
	self.Dorestart = tmp;
    },50);
};

instance.prototype.load = function () {
    var self=this;
    this.lastOk = time + 2000;
    this.child = child.spawn(this.name, this.args);
    this.child.stdout.on('data', function () { self.print.apply(self, arguments); });
    self.child.on('exit', function () {self.exited.apply(self, arguments);});
};

instance.prototype.exited = function (code) {
    if(this.Dorestart == true) {
	this.restart();
	console.log("died");
    }
}

instance.prototype.print = function (d) {
    var s = d.toString("ascii"),b;
    if(s.indexOf(config.checkOkCode)!=-1) this.lastOk = Date.now();
    else console.log(this.args.join(" "), s);
};

instance.prototype.bringDown = function () {
    try {
	this.child.kill();
    }catch(e) {}
};

front = new instance('node', ['front-end.js']); // do not want the front in the kill ring
console.log("front started");

proc.push(new instance('node', ['test.js']));
console.log("test started");

for(var n=0;n<config.productionNumber;n++) {
    proc.push(new instance('node', ['production.js', config.productionStart+n]));
}

setInterval(function () {
    time = Date.now();
    for(var i=0;i<proc.length;i++) {
	if(!proc[i].ok())
	    proc[i].restart();
    }
}, config.checkInterval);
