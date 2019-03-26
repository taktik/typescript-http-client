# typescript-http-client
[![js-standard-style](https://cdn.rawgit.com/standard/standard/master/badge.svg)](http://standardjs.com)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)

The library log4javascript is useful in order to configure the ouptup of the program in the form of logs. Depending on the setting, some outputs (traces for exemple) may not be visible in the console.

In the tests, you need to first in indicate which name space you are testing, and then precise which method. Both using describe. The entity tested is the first argument of describe.
The second argument of describe, is a function. In the function, you need another function called: it. This function also takes two arguments. The first is a string that is usefull only for future developpers (does nothig in the code) saying what result we expect from our test, and the second is once again a method, ending with an assert this time. This last method is the test.

The hook beforeEach executes before every test.
