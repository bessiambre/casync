![casync](https://github.com/bessiambre/casync/blob/master/casync.png?raw=true)
# Callback async/await
Promise free, fast, simplified async/await using [plain old callbacks](https://caolan.github.io/async/v3/global.html#AsyncFunction) ([continuation passing style](https://medium.com/@b.essiambre/continuation-passing-style-patterns-for-javascript-5528449d3070?source=friends_link&sk=976fb25ca6c15eba3a4badcf55ba698e)).

Note: Breaking change from version 1 to 2. Version 2 doesn't expose the done callback seen in version 1 which was almost never userful and a potential source of errors.

```js
const {casync} = require('casync');

let addTitleToReadme=casync(function*(prepend,next){
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

You can turn things like:

```js
function addTitleToReadme(prepend,done){
	fs.readFile('README.md', function (err,data) {
	   if(err){done(err);return;}
	   let newContent= prepend+"\n"+data;
	   fs.writeFile('TITLEDREADME.md', newContent, function (err) {
		   if(err){done(err);return;}
		   done(null,"Done adding title");
	   });
   });
}
```

into
```js
let addTitleToReadme=casync(function*(prepend,next){
	let data = yield fs.readFile('README.md',next);
	let newContent= prepend+"\n"+data;
	yield fs.writeFile('TITLEDREADME.md', newContent, next);
	return "done adding title";
});
```


## Installatio

```bash
$ npm install casync
```

## Features

  * Small and simple implementation (only 52 lines of code, no dependency).
  * Proper exception handling.
  * More than 2x as fast as native async/await.
  * Returned value or thrown errors passed to done callback
  * Promise free!

This module currently contains a single function: `casync` which is a simple generator function wrapper that allows you to pause execution when calling [asynchronous functions](https://caolan.github.io/async/v3/global.html#AsyncFunction).

To use it, just replace your normal callback function
```js
let anAsyncFn=function(x,done){...};
```
with:
```js
let anAsyncFn=casync(function*(x,next){...});
```
And then you can use `yield` inside the function in order to basically `await` asynchronous operations. When the yield is encountered, the execution stops. When the provided `next` callback is called, the execution resumes (til the next yield or the end of the function).

Within a casync function, a `return` statement's return value will be automatically be passed to the function's `done` callback (the last callback passed to the function before `next` in the list of arguments), effectively transforming `return res;` statements into what would have been `done(null,res);return;`.

The `next` callback which is normally passed to an asynchronous functions from a yield line, follows the normal convention of taking an error as the first parameter and taking returned results in the parameters that follow. 

If the asynchronous call finishes with no errors or exceptions, the results are returned by the `yield` statement and can be assigned to a variabe. If there are multiple arguments after the `err` parameter, they are passed as an array.

## Error Handling

If `next` is passed an `err` instead, this `err` is thrown from the `yield` line. Thrown errors inside a casync function are also automatically caught and passed to its done callback (`next` if called from another casync function) and potentially re-thrown at the caller yield line.

```js
let addTitleToReadme=casync(function*(t,next){
	let data = yield fs.readFile('LICENSE',next);
	throw new Error("poo");//This is automatically passed to the calback and thrown from yield line
	return t+"\n"+data;//never gets here
});

let anotherAsyncawaitFn=casync(function* (t,next) {
	let fileWithTitle;
	try{
		fileWithTitle = yield addTitleToReadme(t,next);
	}catch(err){
		console.log("there was an error");//As expected this will be printed when addTitleToReadme throws first parameter.
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
	console.log(`${endT-startT}ms (async)`);//43ms
}
asyncCall();
```



```js
function callBackAfterSetTimeout(done){
	process.nextTick(
		  ()=>{done(null,'result');}
	);
}
let casyncCall=casync(function*(next){
	startT=new Date().getTime();
	for(let i=0;i<100000;i++){
		const result= yield callBackAfterSetTimeout(next);
	}
	endT=new Date().getTime();
	console.log(`${endT-startT}ms (casync)`);//28ms
});
casyncCall(()=>{});
```
1.5x faster than native on my laptop (node v10.19.0) despite no language level optimizations.

## Why?

I got questions as to why you would do this. Some people allude to a state of 'callback hell' that they may have experienced in the past.

A reason for these bad memories may be that there is little good information out there on how to structure asynchronous code with callbacks. A secondary reason might have been the dislike of too many scopes and brackets. This later problem is completely solved with casync/await.

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

I'm sure just the fact that promises use the 'then' function name helps understand the intended flow. I think maybe the /* then */ comment should be included in any callback based asynchronous tutorial to help understand the pattern. With casync you pass `next` and the "anonymous function" is just the next line.

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

One aggravating factor that results in 'callback hell' is that javascript makes it really easy to stray off of the well structured single inline callback last pattern. You can easily pass named functions, or create functions that take multiple callbacks. Some of Javascript's powerful syntax is a bit if a footgun.

There may be a bit too much flexibility in what gets passed to asynchronous functions but at least with CPS, the callback is required right there where you call the function.

Promises are a caching layer for function results and errors along with a state machine to manage this caching layer. Part of the promise pattern might promote better code structure. However, on top of the excess flexibility brought by callbacks on the calling side, promises add further flexibility and extra ways to shoot at your feet on the returning side.  It allows passing around the next point of execution to be added later and elsewhere. Passing promises around can lead to a convoluted execution flow. Current `await` syntax forces the execution flow to the next line, restoring better encapsulation, but this makes the caching layer and state machine of the promise, unnecessary deadweight computation.

For the rare cases when you really need to pass execution flow arround, by all means use promises but there is no reason to add the extra caching layer and state machine by default to something as common as a function call. Just pass the inline function and be done with it. The function syntax ends up very straightforward especially using casync/await. The resulting program has less unecessary state.

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
getTheNews = casync(function*(x, next)){
    let news=yield fetchWebPage('https://news.ycombinator.com',next);
    return news;
});
```

You could syntax sugar away the `next` callback. This would provide very straightforward asynchronous code without extra state machines or caching layers, with better encapsulation (no promises are created to be passed around) and with best performance.
Casync/await makes the transform very straightforward, removing the issue of recursively nested function scopes and excessive brackets. To me this would completely solve the asynchronous programming problem, allowing you to program in normal direct style all the time just like with non-asynchronous code.

Of course, until this gets syntax sugared and integrated into the javascript spec, you'll need to use the longer form.

When inquiring about getting it into the javascript spec I was told: "We make no promise", which I took as a good sign. :-)

## License

MIT