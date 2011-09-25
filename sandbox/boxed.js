var global = this,
exports={},
__dirname="./",
__filename="main.js";

__server_function = function () {throw "server not implemented";};
__server = function (s) { __server_function=s; };
___server(function (req, res) {
    function a () {
	try {
	__server_function(req, res);
	}catch(e) {} // make this report the error
    }
    setTimeout(a, 0);
});

(function () {
    // this code runs with the client code
    
    // copied here to pervent code from overwriting
    var get_code = __get_code;
    var exit = __process_exit;
    var compile = __process_compile;
    var loop_check = __loop_check_;

    var modules = {};
    global.require = function (name) {
	if(modules[name]) return modules[name];
	var code = get_code(name);
	if(typeof code == "string") {
	    var fn = eval("(function (exports, __server, __loop_check_, require, __get_code, __process_compile, __process_exit, debug) {\n " + code + " \n return exports;\n})");
	    modules[name]=(function () { return {} })();
	    return fn.apply(modules[name], [modules[name], __server, loop_check, global.require, __get_code, __process_compile, __process_exit, debug]);
	    return modules[name];
	}else if(typeof code == "undefined") {
	    throw "module "+name+" was not found";
	}else{
	    return modules[name] = code;
	}
    };
    global.Buffer = require('buffer').Buffer;
})();


