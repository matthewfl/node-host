function async (fun, args) {
    if(!fun.length) return;
    args = args || [];
    var call=fun.shift();
    if(typeof call == "function") call = [ call ];
    var count=call.length;
    var n=0;
    var ret=[];
    while(call.length) {
	call.shift().apply((function (num){ 
	    function r (a) {
		ret[num]=a;
		if(!--count)
		    async(fun, ret);
	    }
	    for(var c=0;c<args.length;c++)
		r[c]=args[c];
	    return r;
	})(n++));
    }
}

exports.async = async;
