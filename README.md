# Callback async/await
Promise free, fast async/await using [plain old callbacks](https://caolan.github.io/async/v3/global.html#AsyncFunction) ([continuation passing style](https://medium.com/@b.essiambre/continuation-passing-style-patterns-for-javascript-5528449d3070?source=friends_link&sk=976fb25ca6c15eba3a4badcf55ba698e)).

```js
const {casync} = require('casync');

let addTitleToReadme=casync(function*(prepend,next){
	let data = yield fs.readFile('README.md',next);
	console.log(prepend+"\n"+data);
});

addTitleToReadme("#This is a Good Title");
```

## Installation

```bash
$ npm install casync
```

## Features

  * Small and simple implementation (only 39 lines of code, no dependency).
  * Proper exception handling.
  * Checks for repeated calls to done callback.
  * More than 2x as fast as native async/await.
  * Promise free!

This module currently contains a single function: `casync` which is a simple generator function wrapper that allows you to pause execution when calling [asyncronous functions](https://caolan.github.io/async/v3/global.html#AsyncFunction).

To use it, just replace your normal callback function
```js
let anAsyncFn=function(p,done){...};
```
with:
```js
let anAsyncFn=casync(function*(p,done,next){...});
```
And then you can use `yield` inside the function in order to basically `await` asyncronous operations. When the yield is encountered. The execution stops. When the provided `next` callback is called, the execution resumes (til the next yield or the end of the function). It's that simple.

The `next` callback follows the normal convention of taking an error as the first parameter and taking returned results in the parameters that follow. 
```js
function next(err, res...)
```
If there are no errors or exceptions (null is passed to `err`), the results are returned and can be assigned to a variabe at the line that yielded. If there are multiple arguments after the `err` parameter, they are passed as an array.

## Error Handling

If `err` is not null, this `err` is thrown from the `yield` line.

```js
let addTitleToReadme=casync(function*(t,done,next){
	let data = yield fs.readFile('LICENSE',next);
    //Thrown errors are passed to done callback so any of the two error
    //styles would result in an exception at the yield line.
	throw new Error("poo");
	//done(new Error("poo"));return;//This would throw too.

	done(null,t+"\n"+data);return;//never gets here
});

let anotherAsyncawaitFn=casync(function* (t,done,next) {
	let fileWithTitle;
	try{
		fileWithTitle = yield addTitleToReadme(t,next);
	}catch(err){
		console.log("there was an error");//This will be printed whether asyncawaitFn throws or whether it calls done with a non-null first parameter.
		console.log(err);
	}
    done(null,fileWithTitle);return;
});

anotherAsyncawaitFn("A Title",(err,res)=>{
    console.log(res);
});
```

Errors thrown in a casync wrapped function are caught and passed to it's done function, (the last callback before `next`, if there is one).
```js
let anotherAsyncawaitFn=casync(function* (t,done,next) {
	let fileWithTitle;
	fileWithTitle = yield addTitleToReadme(t,next);
    throw "poo";
    done(null,fileWithTitle);return;
});

anotherAsyncawaitFn("A Title",(err,res)=>{
    if(err){
        console.log(err);//logs "poo"
    }
});
```
## Performance

```js
function resolveAfterSetTimeout() {
	return new Promise(resolve => {
		process.nextTick(() => {
			resolve('resolved');
	  	});
	});
}
async function asyncCall() {
	let startT=new Date().getTime();
	for(let i=0;i<100000;i++){
		const result = await resolveAfterSetTimeout();
	}
	let endT=new Date().getTime();
	console.log(`${endT-startT}ms (async)`);//81ms
}
asyncCall();
```



```js
function callBackAfterSetTimeout(done){
	process.nextTick(
		  ()=>{done(null,'result');}
	);
}
let casyncCall=casync(function*(done,next){
	startT=new Date().getTime();
	for(let i=0;i<100000;i++){
		const result= yield callBackAfterSetTimeout(next);
	}
	endT=new Date().getTime();
	console.log(`${endT-startT}ms (casync)`);//31ms
});
casyncCall(()=>{});
```
2.6x faster than native on my laptop (node v8.10.0)

## Why?

I got questions has to why you would do this. People seem to alude to a state of 'callback hell' that they may have experienced in the past.

I think there's a reason for these bad memories which is that there is little good information out there on how to structure asyncronous code with callbacks. A secondary reason might have been the dislike of too many scopes and brackets but this problem is completely solved with casync/await.

Proper continuation passing style (CPS) code always has a single callback at the end of functions that is called when the work is done (calling this `done` function is analogus to returning in a direct style function). 

```js
function asyncFn(x,done){
    ...
    done(err,result);return;
}
```

This callback should 99% of the time be passed as an inline anonymous function

```js
asyncFn(x,/*then*/(err, res)=>{

});
```

I'm sure just the fact that promises use the 'then' function name helps understand the intended flow. I think maybe the /* then */ comment should be included in any callback based asyncronous tutorial to help people new to the subject understand the pattern.

Adding the `done` callback as the last parameter is imporant for psychological reasons. When you call the function, you can put a newline at the start of the callback body and execution reads from top to bottom.

There is a straitforward mapping between non async, direct functions that use `return` statements and CPS style functions.

```js
function syncronous(x){
    return x;
}
```
becomes
```js
function asyncronous(x,done){
    done(null,x);return;
}
```
To transform a direct style function to CPS, you just append a done parameter and replace `return result;` statements with `done(err,result);return;`
Compilers sometimes do this automatically with your code since some optimizations can only be done in CPS form. Calls to functions can similarly be transformed, although it can create recursively contained scopes and potentially a lot of brackets (a problem that casync/await solves).

One aggravating factor that results in 'callback hell' is that javascript makes it really easy to stray off of the well structured single inline callback pattern. You can easily pass named functions, or create functions that take multiple callbacks. Javascript's power is sometimes its drawback. Beginners can easily shoot themselves in the foot.

There may be a bit too much flexibility in what gets passed to asyncronous functions (maybe language level constructs could make the single anonymous inline functions mandatory) but at least with CPS, the callback is required right there where you call the function.

Promises are a caching layer for function results and errors along with a state machine to manage this caching layer. Part of it might promote better code structure mostly because of better documentation and the 'then' keyword. However, on top of the excess flexibility brought by callbacks on the calling side, promises add more flexibility and extra ways to shoot at your feet on the returning side.  It allows passing the next point of execution flow arround to be added later. Passing promises arround can lead to convoluted code.

99% of the time, you just pass an anonymous inline function to promises `promiseReturning().then(()=>{...})`. You don't make use of the caching layer and state machine. They're just deadweight computation. Calling asyncronous(()=>{...}) would give the exact same result with less computation.

For the rare cases when you really need to pass execution flow arround, by all means use promises but there is no reason to add the extra caching layer and state machine by default to something as common as a function call. Just provide the anonymous function inline as the last parameter and be done with it.  The function syntax ends up very straitforward especially using casync/await.

With casync/await, more advanced use cases are covered by libraries like [async](https://caolan.github.io/async/v3/). These functions can all be used with `yield`.

```js
let arrayOfResults=yield async.parallel([
    async.apply(fs.writeFile, 'testfile1', 'test1'),
    async.apply(fs.writeFile, 'testfile2', 'test2')
],next);
```

## Future

Casync/await gets you better syntax with less scopes and brackets and avoids the [pitfals]((https://medium.com/@b.essiambre/continuation-passing-style-patterns-for-javascript-5528449d3070?source=friends_link&sk=976fb25ca6c15eba3a4badcf55ba698e)) of promises. This is almost best of both worlds and maybe good enough.

But also, what's nice with CPS structured code, is that because it's a simple transform away from regular direct style functions, it would be fairly easy to create language level syntax sugar that does all the work for you.

One day you might be able to write.

```js
casync function getTheNews(x){
    let news=cawait fetchWebPage('https://news.ycombinator.com');
    return news;
}
```

And the compiler would read this as:

```js
getTheNews = casync(function*(x, done, next)){
    let news=yield fetchWebPage('https://news.ycombinator.com',next);
    done(null,news);return;

}
```

This woud provide very straightforward asyncronous code with no extra state machines or caching layers so you would get best performance.

Of course, until this gets syntax sugared and integrated into the javascript spec, you'll need to use the longer form.

When inquiring about getting it into the javascript spec I was told: "We make no promise", which I took as a good sign. :-)

## License

MIT