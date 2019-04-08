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
		it('should return the right properties in the response when calling a get', async function() {
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
	})
	describe('execute with a real API external', function() {
		let postResponse: Object
		let idOfCreatedObject: number
		before(async function() {
			aRequest = new httpclient.Request('http://dummy.restapiexample.com/api/v1/create')
			aRequest.method = 'POST'
			aRequest.body = {
				'name': 'auDD',
				'salary': '333',
				'age': '22'
			}
			postResponse = await execute(aRequest)
		})
		it('should be able to create an entry', function() {
			assert.isAbove((postResponse as any).status, 199)
			assert.isBelow((postResponse as any).status, 300)
		})
		it('should be able to find the entry we posted before', async function() {
			this.timeout(5000)
			aRequest = new httpclient.Request('http://dummy.restapiexample.com/api/v1/employees')
			const getResponse = await execute(aRequest)
			let allEmployees = getResponse.body
			let theEmployee = (allEmployees as Array<Object>).find((k) => (k as any).employee_name === 'auDD')
			idOfCreatedObject = (theEmployee as any).id
			assert.equal((theEmployee as any).employee_salary,333)
			assert.equal((theEmployee as any).employee_age,22)
		})
		it('should be able to modify the entry we added', async function() {
			this.timeout(5000)
			aRequest = new httpclient.Request('http://dummy.restapiexample.com/api/v1/update/' + idOfCreatedObject)
			aRequest.method = 'PUT'
			aRequest.body = {
				'name': 'pnl',
				'salary': '1',
				'age': '22'
			}
			let putResponse = await execute(aRequest)
			aRequest = new httpclient.Request('http://dummy.restapiexample.com/api/v1/employees')
			const getResponse = await execute(aRequest)
			let allEmployees = getResponse.body
			let theEmployee = (allEmployees as Array<Object>).find((k) => (k as any).employee_name === 'pnl')
			assert.equal(idOfCreatedObject,(theEmployee as any).id)
			assert.equal((theEmployee as any).employee_salary,1)
			assert.equal((theEmployee as any).employee_age,22)
		})
		it('should be able to delete the entry we modified before', async function() {
			this.timeout(5000)
			aRequest = new httpclient.Request('http://dummy.restapiexample.com/api/v1/delete/' + idOfCreatedObject)
			aRequest.method = 'DELETE'
			await execute(aRequest)
			//
			aRequest = new httpclient.Request('http://dummy.restapiexample.com/api/v1/employees')
			const getResponse = await execute(aRequest)
			let allEmployees = getResponse.body
			let theEmployee = (allEmployees as Array<Object>).find((k) => (k as any).id === idOfCreatedObject)
			assert.notExists(theEmployee)
		})
	})
})
