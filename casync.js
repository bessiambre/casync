"use strict";
let casync=function(fn,strict=true) {
    return function(){
		let args = Array.prototype.slice.call(arguments);
		if(arguments.length!==fn.length-1){
			throw new Error("Incorrect number of arguments passed to casync function.");
		}
		let doneCalled=false;
		let doneAutoCalled=false;
		let done=null;
		let genRunning=false;
		let doNext=(err,cargs)=>{
			if(err){
				gen.throw(err);return;
			}
			try{
				genRunning=true;
				let v=gen.next((cargs.length === 0?undefined:(cargs.length===1?cargs[0]:cargs)));
				genRunning=false;
				if(strict && v.done && !doneCalled){
					doneAutoCalled=true;
					done(null,v.value);//call done if the function reaches the end. (a bit like a normal function returns at the end even if return is not explicitely called)
				}
			}catch(err){
				genRunning=false;
				if(done!==null){
					done(err);
				}else{
					throw err;
				}
			}
		};
		let next=(err,...cargs)=>{
			if(genRunning){
				process.nextTick(()=>{doNext(err,cargs);});//need to do nextTick in case the async function was not truly async and we didn't get a chance to yield yet.
			}else{
				doNext(err,cargs);//no nextTick here for better performance.
			}
		};
		if(typeof args[fn.length-2] === "function"){//if last argument is a function assume continuation passing style
			let oldDone=args[fn.length-2];
			done=function(){
				if(doneCalled){
					throw new Error(`Done called more than once.${(doneAutoCalled?"Done was called automatically when casync-ed function reached the end. If you don't want this behavior you may pass strict=false as the second parameter of casync(fn,strict)":'')}`);
				}else{
					doneCalled=true;
					oldDone.apply(this, arguments);
				}
			};
			args[fn.length-2]=done;
		}
		args[fn.length-1]=next;
		let gen = fn.apply(this, args);
		next(null);
	};
};
if((typeof process !== 'undefined') && (process.release.name === 'node')){exports.casync=casync;}