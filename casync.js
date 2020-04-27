"use strict";
exports.casync=function(fn,strict=true) {
    return function(){
		let args = Array.prototype.slice.call(arguments);
		let doneCalled=false;
		let doneAutoCalled=false;
		let done=null;
		let next=(err,...cargs)=>{
			if(err){
				gen.throw(err);return;
			}
			try{
				let v=gen.next((cargs.length === 0?undefined:(cargs.length===1?cargs[0]:cargs)));
				if(strict && v.done && !doneCalled){
					doneAutoCalled=true;
					done(null);//call done if the function reaches the end. (a bit like a normal function returns at the end even if return is not explicitely called)
				}
			}catch(err){
				if(done!==null){
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
					throw new Error(`Done called more than once.${(doneAutoCalled?"Done was called automatically when casync-ed function reached the end. If you don't want this behavior you may pass strict=false as the second parameter of casync(fn,strict)":'')}`);
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