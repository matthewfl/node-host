var db = require('./db');
var child = require('child_process');
var sys = require('sys');
var config = require('./config');
db._isMaster();

var proc = [];
var front;


function instance (name, args) {
    this.Dorestart=true;
    this.name =name;
    this.args =args;
    this.load();
}
instance.prototype.ok = function () {
    // should check the ram and the cpu usage
    return true;
};

instance.prototype.restart = function () {
    var tmp = this.Dorestart;
    this.Dorestart = false;
    try {
	this.child.kill('KILL');
    }catch(e) {}
    this.load();
    this.Dorestart = tmp;
};

instance.prototype.load = function () {
    var self=this;
    this.child = child.spawn(this.name, this.args);
    //sys.pump(this.ret.stdout, process.stdout);
    this.child.stdout.on('data', function (d) { console.log(d.toString("ascii")); });
    this.child.on('exit', function (code) {
	console.log("died");
	if(self.Dorestart == true)
	    self.restart();
    });
};

instance.prototype.bringDown = function () {

};

front = new instance('node', ['front-end.js']); // do not want the front in the kill ring
console.log("front started");

proc.push(new instance('node', ['test.js']));
console.log("test started");

for(var n=0;n<config.productionNumber;n++) {
    proc.push(new instance('node', ['production.js', config.productionStart+n]));
}

setInterval(function () {
    for(var i=0;i<proc.length;i++) {
	if(!proc[i].ok())
	    proc[i].restart();
    }
}, config.checkInterval);
