# typescript-http-client
[![js-standard-style](https://cdn.rawgit.com/standard/standard/master/badge.svg)](http://standardjs.com)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)

Basic usage:

```typescript
import expect from 'ceylon';
import { httpclient } from 'typescript-http-client'
import Response = httpclient.Response
import Request = httpclient.Request

(async () => {
  // Get a new client
  const client = httpclient.newHttpClient()
  // Build the request
  const request = new Request('https://jsonplaceholder.typicode.com/todos/1', { responseType: 'text' })
  // Execute the request and get the response body as a string
  const responseBody = await client.execute<string>(request)
  expect(responseBody)
    .toExist()
    .toBeA('string')
    .toBe(`{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}`)
})()
```

Typed response:

```typescript
import expect from 'ceylon';
import { httpclient } from 'typescript-http-client'
import Response = httpclient.Response
import Request = httpclient.Request

class Todo {
  completed: boolean
  id: number
  title: string
  userId: number
}

(async () => {
  // Get a new client
  const client = httpclient.newHttpClient()
  // Build the request
  const request = new Request('https://jsonplaceholder.typicode.com/todos/1')
  // Execute the request and get the response body as a "Todo" object
  const todo = await client.execute<Todo>(request)
  expect(todo)
    .toExist()
    .toBeA('object')
  expect(todo.userId)
    .toBe(1)
})()
```