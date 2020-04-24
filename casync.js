"use strict";
exports.casync=function(fn) {
    return function(){
		let args = Array.prototype.slice.call(arguments);
		let doneCalled=false;
		let done;
		let next=(err,...cargs)=>{
			if(err){
				gen.throw(err);return;
			}
			try{
				let v=gen.next((cargs.length === 0?undefined:(cargs.length===1?cargs[0]:cargs)));
				// if(v.done && !doneCalled){
				// 	done(null);//call done if the function reaches the end. (a but like a normal function returns at the end even if return is not explicitely called)
				// }
			}catch(err){
				if(done){
					done(err);
				}else{
					throw err;
				}
			}
		};
		if(typeof args[args.length-1] === "function"){//if last argument is a function assume continuation passing style
			let oldDone=args[args.length-1];
			done=function(){
				if(doneCalled){
					throw new Error("Done called more than once.");
				}else{
					doneCalled=true;
					oldDone.apply(this, arguments);
				}
			}
			args[args.length-1]=done;
		}
		args.push(next);
		let gen = fn.apply(this, args);
		next(null);
	};
};