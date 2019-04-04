import { assert } from 'chai'
import execute from '../src/execute'
import { httpclient } from '../src/index'

describe('execute', function() {
	it('should return a Promise', function() {
		let aRequest: httpclient.Request
		aRequest = new httpclient.Request('https://jsonplaceholder.typicode.com/todos/1')
		const a = execute(aRequest)
		assert.isTrue(a instanceof Promise)
	})
	it('should return a Response when the Promise is resolved', async function() {
		let aRequest: httpclient.Request
		aRequest = new httpclient.Request('https://jsonplaceholder.typicode.com/todos/1')
		const a = await execute(aRequest)
		assert.isTrue(a instanceof httpclient.Response)
	})
	// it('should return Headers', function() {
	// 	let aRequest: httpclient.Request
	// 	aRequest = new httpclient.Request('https://jsonplaceholder.typicode.com/todos/1')
	// 	assert.equal(1,1)
	// })
})
