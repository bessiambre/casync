# Callback async/await
Promise free, fast, simplified async/await using [plain old callbacks](https://caolan.github.io/async/v3/global.html#AsyncFunction) ([continuation passing style](https://medium.com/@b.essiambre/continuation-passing-style-patterns-for-javascript-5528449d3070?source=friends_link&sk=976fb25ca6c15eba3a4badcf55ba698e)).

```js
const {casync} = require('casync');

let addTitleToReadme=casync(function*(prepend,done,next){
	let data = yield fs.readFile('README.md',next);
	return prepend+"\n"+data;
});
```

From another casync function:

```js
...
let readmeWithTitle=yield addTitleToReadme("#This is a Good Title",next);
console.log(readmeWithTitle);
```

Or from outside a casync function:

```js
addTitleToReadme("#This is a Good Title",(err,readmeWithTitle)=>{
	console.log(err || readmeWithTitle);
});

```
## Installation

```bash
$ npm install casync
```

## Features

  * Small and simple implementation (only 54 lines of code, no dependency).
  * Proper exception handling.
  * More than 2x as fast as native async/await.
  * Returned value or thrown errors passed to done callback
  * Promise free!

This module currently contains a single function: `casync` which is a simple generator function wrapper that allows you to pause execution when calling [asynchronous functions](https://caolan.github.io/async/v3/global.html#AsyncFunction).

To use it, just replace your normal callback function
```js
let anAsyncFn=function(p,done){...};
```
with:
```js
let anAsyncFn=casync(function*(p,done,next){...});
```
And then you can use `yield` inside the function in order to basically `await` asynchronous operations. When the yield is encountered, the execution stops. When the provided `next` callback is called, the execution resumes (til the next yield or the end of the function). Within a casync function, a `return` statement's return value will be automatically passed to the function's `done` callback (the last callback passed to the function before `next` in the list of arguments, if there is one), effectively transforming `return res;` statements into `done(null,res);return;`.

The `next` callback which is normally passed to an asynchronous functions from a yield line, follows the normal convention of taking an error as the first parameter and taking returned results in the parameters that follow. 
```js
function next(err, res...)
```
If the asynchronous call finishes with no errors or exceptions (if null is passed as `err`), the results are returned by the `yield` statement and can be assigned to a variabe. If there are multiple arguments after the `err` parameter, they are passed as an array.

## Error Handling

If `next` is passed an `err` instead, this `err` is thrown from the `yield` line. Thrown errors inside a casync function are also automatically caught and passed to its done callback (`next` if called from another casync function) and potentially re-thrown at the caller yield line.

```js
let addTitleToReadme=casync(function*(t,done,next){
	let data = yield fs.readFile('LICENSE',next);
	//any of the two error styles
    //would result in an exception at the yield line.
	throw new Error("poo");//This is automatically passed to done calback and thrown from yield line
	done(new Error("poo"));return;//This would throw at the yield line too.

	return t+"\n"+data;//never gets here
});

let anotherAsyncawaitFn=casync(function* (t,done,next) {
	let fileWithTitle;
	try{
		fileWithTitle = yield addTitleToReadme(t,next);
	}catch(err){
		console.log("there was an error");//This will be printed whether asyncawaitFn throws or whether it calls done with a non-null first parameter.
		console.log(err);
	}
    return fileWithTitle;
});

anotherAsyncawaitFn("A Title",/*then*/(err,res)=>{
    console.log(err || res);
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

I got questions has to why you would do this. People seem to allude to a state of 'callback hell' that they may have experienced in the past.

I think there's a reason for these bad memories which is that there is little good information out there on how to structure asynchronous code with callbacks. A secondary reason might have been the dislike of too many scopes and brackets but this problem is completely solved with casync/await.

Proper continuation passing style (CPS) functions always takes a single callback at the end of function parameters that is called when the work is done (calling this `done` function is analogous to returning in a direct style function). 

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

I'm sure just the fact that promises use the 'then' function name helps understand the intended flow. I think maybe the /* then */ comment should be included in any callback based asynchronous tutorial to help people new to the subject understand the pattern.

Adding the `done` callback as the last parameter is important for psychological reasons. When you call the function, you can put a newline at the start of the callback body and execution reads from top to bottom.

There is a straightforward mapping between non async, direct functions that use `return` statements and CPS style functions.

```js
function syncronous(x){
    return x;
}
```
becomes
```js
function asynchronous(x,done){
    done(null,x);return;
}
```
To transform a direct style function to CPS, you just append a done parameter and replace `return result;` statements with `done(err,result);return;`
Compilers sometimes do this automatically with your code since some optimizations can only be performed in CPS form. Calls to functions can also be transformed, although it's a recursive algorithm that can create russian dolls of scopes and potentially a lot of brackets (a problem that casync/await solves). The one to one mapping between direct style and CPS is a key feature, paving the way for syntax sugaring the CPS away. More on that bellow.

One aggravating factor that results in 'callback hell' is that javascript makes it really easy to stray off of the well structured single inline callback pattern. You can easily pass named functions, or create functions that take multiple callbacks. Javascript's power is sometimes its main drawback. Beginners can easily shoot themselves in the foot.

There may be a bit too much flexibility in what gets passed to asynchronous functions but at least with CPS, the callback is required right there where you call the function.

Promises are a caching layer for function results and errors along with a state machine to manage this caching layer. Part of the promise pattern might promote better code structure mostly because of better documentation and the 'then' keyword. However, on top of the excess flexibility brought by callbacks on the calling side, promises add further flexibility and extra ways to shoot at your feet on the returning side.  It allows passing the next point of execution flow around to be added later and elsewhere. Passing promises around can lead to a convoluted execution flow.

99% of the time, you just pass an anonymous inline function to promises `promiseReturning().then(()=>{...})`. You don't make use of the caching layer and state machine. They're just deadweight computation. Calling asynchronous(()=>{...}) would give the exact same result with less computation.

For the rare cases when you really need to pass execution flow arround, by all means use promises but there is no reason to add the extra caching layer and state machine by default to something as common as a function call. Just provide the anonymous function inline as the last parameter and be done with it.  The function syntax ends up very straightforward especially using casync/await.

With casync/await, more advanced use cases are covered by libraries like [async](https://caolan.github.io/async/v3/). These functions can all be used with `yield`.

```js
let arrayOfResults=yield async.parallel([
    async.apply(fs.writeFile, 'testfile1', 'test1'),
    async.apply(fs.writeFile, 'testfile2', 'test2')
],next);
```

to use a library lacking proper callback support:
```js
	const { callbackify } = require("util");//included in nodejs, no module to install
	...
	let res = yield callbackify(promiseReturningFn)(param,next);
	...
```

or on a method that uses the `this` pointer:

```js
	obj.promiseReturningMethodCb=callbackify(obj.promiseReturningMethod);
	let res = yield obj.promiseReturningMethodCb(param,next);
```

To use in browsers download casync.js and then:

```html
<script src="casync.js"></script>
```

## Future

Casync/await gets you better syntax with less scopes and brackets and avoids the [pitfalls](https://medium.com/@b.essiambre/continuation-passing-style-patterns-for-javascript-5528449d3070?source=friends_link&sk=976fb25ca6c15eba3a4badcf55ba698e) of promises. This is almost best of both worlds and maybe good enough. But here is where the one to one mapping between direct style and CPS is key.

Because CPS structured code is a simple transform away from regular direct style functions, it would be fairly easy to create language level syntax sugar that does all the work for you.

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
    return news;
});
```

This would provide very straightforward asynchronous code without extra state machines or caching layers, with better encapsulation (no promises are created to be passed around) and best performance.
Casync/await makes the transform very straightforward, removing the issue of recursively nested function scopes and excessive brackets. To me this would completely solve the asynchronous programming problem, allowing you to program in normal direct style all the time just like with non-asynchronous code.

Of course, until this gets syntax sugared and integrated into the javascript spec, you'll need to use the longer form.

When inquiring about getting it into the javascript spec I was told: "We make no promise", which I took as a good sign. :-)

## License

MIT