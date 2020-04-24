
const {casync} = require('../casync.js');

let timeoutSet=function(t,done){
	setTimeout(done,t);
};

describe('casync', function() {

    it('should return passed val', function(done) {
        let anAsyncawaitFn=casync(function*(val,done,next){
            yield timeoutSet(200,next);
            done(null,val);
        });
        anAsyncawaitFn(2,(err,res)=>done(res!==2));
    });

    it('Throwing should generate exception', function(testdone) {
        let asyncawaitFn=casync(function*(val,done,next){
            yield timeoutSet(200,next);
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

    it('returning error should generate exception', function(testdone) {
        let asyncawaitFn=casync(function*(val,done,next){
            yield timeoutSet(200,next);
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
            yield timeoutSet(200,next);
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

});
