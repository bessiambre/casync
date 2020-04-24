# Callback async/await
Promise free async/await using [plain old callbacks](https://caolan.github.io/async/v3/global.html#AsyncFunction) ([continuation passing style](https://medium.com/@b.essiambre/continuation-passing-style-patterns-for-javascript-5528449d3070?source=friends_link&sk=976fb25ca6c15eba3a4badcf55ba698e)).

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
## Future

Until this gets syntax sugared and integrated into the javascript spec, you'll need to use:
```js
functionname=casync(function*(t,done,next) {
```
instead of something like
```js
functionname=casync function(t,done) {
```
and
```js
let data = yield fs.readFile('LICENSE',next);
```
instead of
```js
let data = cawait fs.readFile('LICENSE');
```

It might be possible to further syntax sugar away the `done` functions too.

When inquiring about getting this into the javascript spec I was told: "We make no promise", which I took as a good sign. :-)

## License

MIT