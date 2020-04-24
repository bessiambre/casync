"use strict";
exports.casync=function(fn) {
    return function(){
		let args = Array.prototype.slice.call(arguments);
		let next=(err,...cargs)=>{
			if(err){
				gen.throw(err);return;
            }
            try{
				gen.next((cargs.length === 0?undefined:(cargs.length===1?cargs[0]:cargs)));
			}catch(err){
				if(typeof done === "function"){
					done(err);
				}else{
					throw err;
				}
			}
		};
		let done=args[args.length-1];//if last argument is a function assume continuation passing style
        args.push(next);
        let gen = fn.apply(this, args);
        next(null);
    };
};