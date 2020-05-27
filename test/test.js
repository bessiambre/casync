
const {casync} = require('../casync.js');

let timeoutSet=function(t,done){
	setTimeout(done,t);
};

describe('casync', function() {

	it('should return passed val', function(done) {
		let anAsyncawaitFn=casync(function*(val,done,next){
			yield timeoutSet(20,next);
			done(null,val);
		});
		anAsyncawaitFn(2,(err,res)=>done(res!==2));
	});

	it('should return passed val 2', function(done) {
		let anAsyncawaitFn=casync(function*(val,done,next){
			yield timeoutSet(20,next);
			return val;
		});
		anAsyncawaitFn(2,(err,res)=>done(res!==2));
	});

	it('Works with non truly async function', function(done) {
		let anAsyncawaitFn=casync(function*(val,done,next){
			yield next(null,val);
			done(null,val);
		});
		anAsyncawaitFn(2,(err,res)=>done(res!==2));
	});

	it('Throwing should generate exception', function(testdone) {
		let asyncawaitFn=casync(function*(val,done,next){
			yield timeoutSet(20,next);
			throw new Error("poo");
			done(null,val);
		});
		let anotherAsyncawaitFn=casync(function* (p,done,next) {
			let a;
			try{
				a = yield asyncawaitFn(2,next);
			}catch(err){
				testdone(err.message!=="poo");return;
			}
			testdone(true);
		});
		anotherAsyncawaitFn(3,(err,res)=>{});
	});

	it('return works after caught exception', function(testdone) {
		let asyncawaitFn=casync(function*(val,done,next){
			yield timeoutSet(20,next);
			throw new Error("poo");
			done(null,val);
		});
		let anotherAsyncawaitFn=casync(function* (p,done,next) {
			let a;
			try{
				a = yield asyncawaitFn(2,next);
			}catch(err){
				return "val";
			}
			testdone(true);
		});
		anotherAsyncawaitFn(3,(err,res)=>{
			testdone(res!=="val");
		});
	});

	it('returning error should generate exception', function(testdone) {
		let asyncawaitFn=casync(function*(val,done,next){
			yield timeoutSet(20,next);
			done(new Error("poo"));return;
			done(null,val);
		});
		let anotherAsyncawaitFn=casync(function* (p,done,next) {
			let a;
			try{
				a = yield asyncawaitFn(2,next);
			}catch(err){
				testdone(err.message!=="poo");return;
			}
			testdone(true);
		});
		anotherAsyncawaitFn(3,(err,res)=>{});
	});

	it('Thrown error should be turned into passed error', function(testdone) {
		let asyncawaitFn=casync(function*(val,done,next){
			yield timeoutSet(20,next);
			done(null,val);
		});
		let anotherAsyncawaitFn=casync(function* (p,done,next) {
			let a;
			try{
				a = yield asyncawaitFn(2,next);
			}catch(err){
				testdone(true);return;
			}
			throw "poo";
			done(null,a);
		});
		anotherAsyncawaitFn(3,(err,res)=>{
			testdone(err!=="poo");
		});
	});
	
	it('Done should automatically be called when generater reaches end', function(testdone) {
		let asyncawaitFn=casync(function*(val,done,next){
			yield timeoutSet(20,next);
		});
		asyncawaitFn(3,(err,res)=>{
			testdone(false);
		});
	});

	it('this pointer set correctly on methods', function(testdone) {

		function Constr(){
			this.x=42;
		}
		Constr.prototype.asyncawaitFn=casync(function*(val,done,next){
			yield timeoutSet(20,next);
			done(null,this.x);
		});
		let o=new Constr();
		o.asyncawaitFn(3,(err,res)=>{
			testdone(res!==42);
		});
	});

	it('Throws if done called twice', function(testdone) {

		let asyncawaitFn=casync(function*(val,done,next){
			yield timeoutSet(20,next);
			done(null,val);
			try{
				done(null,val);
			}catch(e){
				testdone(e.message!=="Done called more than once or called after casync function returned.");
			}
		});
		asyncawaitFn(3,(err,res)=>{
			
		});
	});


	it('Throws if incorrect number of aruments passed', function(testdone) {

		let asyncawaitFn=casync(function*(val,done,next){
			yield timeoutSet(20,next);
			return val;			
		});
		try{
			asyncawaitFn(3,4,(err,res)=>{
				console.log(err||res);
			});
		}catch(e){
			testdone(e.message!=="Incorrect number of arguments passed to casync function.");
		}
	});

});
