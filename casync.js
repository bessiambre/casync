"use strict";
let nextTick=process.nextTick || ((c)=>{setTimeout(c,0);});//for browsers
let casync=function(fn) {
    return function(){
		let args = Array.prototype.slice.call(arguments);
		if(arguments.length>fn.length){
			throw new Error("Incorrect number of arguments passed to casync function.");
		}
		if(typeof args[fn.length-1] !== "function"){//if last argument is a function assume continuation passing style
			throw new Error("done callback is not a function.");
		}
		let doneCalled=false;
		let oldDone=args[fn.length-1];
		let done=function(){
				doneCalled=true;
				oldDone.apply(this, arguments);
		};
		let genRunning=false;
		let doNext=(err,cargs)=>{
			let v;
			try{
				genRunning=true;
				if(err){
					v=gen.throw(err);
				}else{
					v=gen.next((cargs.length === 0?undefined:(cargs.length===1?cargs[0]:cargs)));
				}
				genRunning=false;
			}catch(err){
				genRunning=false;
				done(err);return;
			}
			if(v.done===true && doneCalled===false){
				done(null, v.value);//call done if the function reaches the end. (a bit like a normal function returns at the end even if return is not explicitely called)
			}
		};
		let next=(err,...cargs)=>{
			if(doneCalled===true){
				throw new Error(`next called after casync function done.`);
			}
			if(genRunning){
				process.nextTick(()=>{doNext(err,cargs);});//need to do nextTick in case the async function was not truly async and we didn't get a chance to yield yet.
			}else{
				doNext(err,cargs);//no nextTick here for better performance.
			}
		};
		args[fn.length-1]=next;
		let gen = fn.apply(this, args);
		next(null);
	};
};
if((typeof process !== 'undefined') && (process.release.name === 'node')){exports.casync=casync;}