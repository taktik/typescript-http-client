# typescript-http-client
[![js-standard-style](https://cdn.rawgit.com/standard/standard/master/badge.svg)](http://standardjs.com)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)

### Basic usage

###### Simple GET request with string response:

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

###### Typed response:

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

### Filters

Filters can be used to:
* Enrich/alter any request property (headers, url, body, etc...)
* Enrich/alter any response property (headers, body, etc...)

###### Transform the response body:

```typescript
import expect from 'ceylon';
import { httpclient } from 'typescript-http-client'
import Response = httpclient.Response
import Request = httpclient.Request
import Filter = httpclient.Filter

class Todo {
  completed: boolean
  id: number
  title: string
  userId: number
}

// Transform Todos : Alter title
class TodoTransformer implements Filter<Todo, Todo> {
  async doFilter (call: httpclient.Request, filterChain: httpclient.FilterChain<Todo>): Promise<httpclient.Response<Todo>> {
    const response = await filterChain.doFilter(call)
    const todo = response.body
    todo.title = 'Modified title'
    return response
  }
}

(async () => {
  // Get a new client
  const client = httpclient.newHttpClient()
  // Add our Todo tranformer filter
  client.addFilter(new TodoTransformer(), 'Todo transformer', {
    // Only apply to GET request with URL starting with 
    // 'https://jsonplaceholder.typicode.com/todos/'
    enabled(call: Request): boolean {
      return call.method === 'GET' && 
        call.url.startsWith('https://jsonplaceholder.typicode.com/todos/')
    }
  })
  // Build the request
  const request = new Request('https://jsonplaceholder.typicode.com/todos/1')
  // Execute the request and get the response body as an object
  const todo = await client.execute<Todo>(request)
  expect(todo)
    .toExist()
    .toBeA('object')
  expect(todo.userId)
    .toBe(1)
  expect(todo.title)
    .toBe('Modified title')
})()
```
