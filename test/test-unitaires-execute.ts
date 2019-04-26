import { assert } from 'chai'
import execute from '../src/execute'
import { httpclient } from '../src/index'
import sinon, { SinonFakeServer } from 'sinon'

describe('execute', function() {
	let aRequest: httpclient.Request
	before(function() {
		aRequest = new httpclient.Request('https://jsonplaceholder.typicode.com/todos/1')
	})
	it('should create a Promise', function() {
		const a = execute(aRequest)
		assert.isTrue(a instanceof Promise)
	})
	it('should return a Response when the Promise is resolved', async function() {
		const a = await execute(aRequest)
		assert.isTrue(a instanceof httpclient.Response)
	})
	describe('execute with fake server', function() {
		let server: SinonFakeServer
		before(function() {
			server = sinon.fakeServer.create()
		})
		after(function() {
			server.restore()
		})
		it('should not return the headers of the response in a string format', async function() {
			server.respondWith(
			'GET',
			'/test/headers/date',
				[
					200,
				{ 'Content-Type': 'application/json', 'Warning': 'Date may change' },
					'{ "date": "5 avril 2019" }'
				]
			)
			server.autoRespond = true
			let fakeRequest = new httpclient.Request('/test/headers/date')
			const result = execute(fakeRequest)
			server.respond()
			const a = await result
			assert.notEqual(typeof a.headers, 'string')
		})
		it('should return the right properties in the response when calling a server', async function() {
			server.respondWith(
			'GET',
			'/damso/feudebois',
				[
					200,
				{ 'Content-Type': 'application/json' },
					'{ "id": 12, "paroles": "Prison de mots, absence de compliments" }'
				]
			)
			server.autoRespond = true
			let fakeRequest = new httpclient.Request('/damso/feudebois')
			const result = execute(fakeRequest)
			server.respond()
			const a = await result
			assert.equal((a.body as any).paroles, 'Prison de mots, absence de compliments')
			assert.deepEqual((a.headers as any), { 'Content-Type': 'application/json' })
			assert.equal((a.status as any), 200)
		})
		it('should return an undefined response body if it is not json parsable', async function() {
			server.respondWith(
			'GET',
			'/akk/barillo',
				[
					200,
					{ 'Content-Type': 'application/json' },
					'Pas un format JSON'
				]
			)
			server.autoRespond = true
			let fakeRequest = new httpclient.Request('/akk/barillo')
			const result = execute(fakeRequest)
			server.respond()
			const a = await result
			assert.equal(a.body, undefined)
		})
	})
})
