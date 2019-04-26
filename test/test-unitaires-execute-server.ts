import { assert } from 'chai'
import execute from '../src/execute'
import { httpclient } from '../src/index'
import sinon, { SinonFakeServer } from 'sinon'

describe('execute', function() {
	let aRequest
	describe('execute with a real API external', function() {
		let postResponse: Object
		let idOfCreatedObject: number
		before(async function() {
			this.timeout(5000)
			aRequest = new httpclient.Request('http://dummy.restapiexample.com/api/v1/create')
			aRequest.method = 'POST'
			aRequest.body = {
				'name': 'auDD',
				'salary': '333000',
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
			assert.equal((theEmployee as any).employee_salary,333000)
			assert.equal((theEmployee as any).employee_age,22)
		})
		it('should be able to modify the entry we added', async function() {
			this.timeout(5000)
			aRequest = new httpclient.Request('http://dummy.restapiexample.com/api/v1/update/' + idOfCreatedObject)
			aRequest.method = 'PUT'
			aRequest.body = {
				'name': 'pnl',
				'salary': '1000000',
				'age': '22'
			}
			let putResponse = await execute(aRequest)
			aRequest = new httpclient.Request('http://dummy.restapiexample.com/api/v1/employees')
			const getResponse = await execute(aRequest)
			let allEmployees = getResponse.body
			let theEmployee = (allEmployees as Array<Object>).find((k) => (k as any).employee_name === 'pnl')
			assert.equal(idOfCreatedObject,(theEmployee as any).id)
			assert.equal((theEmployee as any).employee_salary,1000000)
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
		it('should throw an error if http request sent to bad url', async function() {
			this.timeout(5000)
			try {
				aRequest = new httpclient.Request('i@#ccidently_mizspeld976theurl/')
				await execute(aRequest)
				assert.isTrue(false, 'previous line should throw an error')
			} catch (error) {
				const response: httpclient.Response<Object> = error
				assert.equal(response.status, 404)
			}
		})
		it('should also throw an error if the routing does not support the verb', async function() {
			this.timeout(5000)
			try {
				aRequest = new httpclient.Request('http://dummy.restapiexample.com/api/v1/employees')
				aRequest.method = 'PUT'
				aRequest.body = {
					'name': 'pnl',
					'salary': '1000000',
					'age': '22'
				}
				await execute(aRequest)
				assert.isTrue(false, 'previous line should throw an error')
			} catch (error) {
				const response: httpclient.Response<Object> = error
				assert.equal(response.status,405)
			}
		})
	})
})
