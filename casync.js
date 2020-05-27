"use strict";
let casync=function(fn) {
    return function(){
		let args = Array.prototype.slice.call(arguments);
		if(arguments.length>fn.length-1){
			throw new Error("Incorrect number of arguments passed to casync function.");
		}
		if(typeof args[fn.length-2] !== "function"){//if last argument is a function assume continuation passing style
			throw new Error("done callback is not a function.");
		}
		let doneCalled=false;
		let done=function(){//this might not be necessary if we don't expose the done callback and always rely on `return`
			if(doneCalled===true){
				throw new Error(`Done called more than once or called after casync function returned.`);
			}else{
				doneCalled=true;
				oldDone.apply(this, arguments);
			}
		};
		let genRunning=false;
		let oldDone=args[fn.length-2];
		let doNext=(err,cargs)=>{
			if(err){
				gen.throw(err);return;
			}
			let v;
			try{
				genRunning=true;
				v=gen.next((cargs.length === 0?undefined:(cargs.length===1?cargs[0]:cargs)));
				genRunning=false;
			}catch(err){
				genRunning=false;
				done(err);return;
			}
			if(v.done===true && doneCalled===false){
				oldDone(null, v.value);//call done if the function reaches the end. (a bit like a normal function returns at the end even if return is not explicitely called)
			}
		};
		let next=(err,...cargs)=>{
			if(genRunning){
				process.nextTick(()=>{doNext(err,cargs);});//need to do nextTick in case the async function was not truly async and we didn't get a chance to yield yet.
			}else{
				doNext(err,cargs);//no nextTick here for better performance.
			}
		};
		args[fn.length-2]=done;
		args[fn.length-1]=next;
		let gen = fn.apply(this, args);
		next(null);
	};
};
if((typeof process !== 'undefined') && (process.release.name === 'node')){exports.casync=casync;}