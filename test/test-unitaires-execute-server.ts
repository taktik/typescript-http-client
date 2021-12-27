import { assert } from 'chai'
import execute from '../src/execute'
import { Request, Response } from '../src/index'
import sinon, { SinonFakeServer } from 'sinon'

describe('execute', function() {
	let server: SinonFakeServer
	describe('execute with a real API external', function() {
		before(function() {
			server = sinon.fakeServer.create()
		})
		after(function() {
			server.restore()
		})

		it('should be able to create an entry', async function() {
			const aRequest = new Request('http://dummy.restapiexample.com/api/v1/create')
			aRequest.method = 'POST'
			aRequest.body = {
				'name': 'auDD',
				'salary': '333000',
				'age': '22'
			}
			server.respondWith(
				'POST',
				'http://dummy.restapiexample.com/api/v1/create',
				[
					200,
					{ 'Content-Type': 'application/json' },
					JSON.stringify({ id: 'anID' })
				]
			)
			const postResponsePromises = execute(aRequest)
			server.respond()
			const postResponse = await postResponsePromises
			assert.equal(postResponse.status, 200)
		})
		it('should be able to find the entry we posted before', async function() {

			server.respondWith(
				'GET',
				'http://dummy.restapiexample.com/api/v1/employees',
				[
					200,
					{ 'Content-Type': 'application/json' },
					JSON.stringify([ {
						'name': 'auDD',
						'salary': '333000',
						'age': '22'
					}])
				]
			)

			const aRequest = new Request('http://dummy.restapiexample.com/api/v1/employees')
			const postResponsePromises = execute<unknown[]>(aRequest)
			server.respond()
			const getResponse = await postResponsePromises
			const employees = getResponse.body
			assert.deepEqual(employees, [ {
				'name': 'auDD',
				'salary': '333000',
				'age': '22'
			}])
		})
		it('should be able to modify the entry we added', async function() {
			const expectedResponse = [ {
				'name': 'auDD',
				'salary': '333000',
				'age': '22'
			}]
			server.respondWith(
				'PUT',
				'http://dummy.restapiexample.com/api/v1/update/anID',
				[
					200,
					{ 'Content-Type': 'application/json' },
					JSON.stringify(expectedResponse)
				]
			)
			const aRequest = new Request('http://dummy.restapiexample.com/api/v1/update/anID')
			aRequest.method = 'PUT'
			aRequest.body = {
				'name': 'pnl',
				'salary': '1000000',
				'age': '22'
			}
			const postResponsePromises = execute(aRequest)
			server.respond()
			const putResponse = await postResponsePromises
			assert.deepEqual(putResponse.body, expectedResponse)

		})
		it('should be able to delete the entry we modified before', async function() {
			server.respondWith(
				'DELETE',
				'http://dummy.restapiexample.com/api/v1/delete/idOfCreatedObject',
				[
					200,
					{ 'Content-Type': 'application/json' },
					JSON.stringify({ expectedResponse: 'any' })
				]
			)
			const aRequest = new Request('http://dummy.restapiexample.com/api/v1/delete/idOfCreatedObject')
			aRequest.method = 'DELETE'
			const postResponsePromises = execute(aRequest)
			server.respond()
			const response = await postResponsePromises
			//

			assert.deepEqual(response.body, { expectedResponse: 'any' })

		})
		it('should throw an error if http request sent to bad url', async function() {
			try {
				server.respondWith(
					'GET',
					'http://dummy.restapiexample.com/i@#ccidently_mizspeld976theurl/',
					[
						404,
						{ 'Content-Type': 'application/json' },
						'not found'
					]
				)
				const aRequest = new Request('http://dummy.restapiexample.com/i@#ccidently_mizspeld976theurl/')
				const responsePromise = execute(aRequest)
				server.respond()
				await responsePromise
				assert.isTrue(false, 'previous line should throw an error')
			} catch (error) {
				const response = error as Response<unknown>
				assert.equal(response.status, 404)
			}
		})
		it('should also throw an error on server error', async function() {
			try {
				server.respondWith(
					'PUT',
					'http://dummy.restapiexample.com/api/v1/employees',
					[
						500,
						{ 'Content-Type': 'application/json' },
						'server error'
					]
				)
				const aRequest = new Request('http://dummy.restapiexample.com/api/v1/employees')
				aRequest.method = 'PUT'
				aRequest.body = {
					'name': 'pnl',
					'salary': '1000000',
					'age': '22'
				}
				const responsePromise = execute(aRequest)
				server.respond()
				await responsePromise
				assert.isTrue(false, 'previous line should throw an error')
			} catch (error) {
				const response = error as Response<unknown>
				assert.equal(response.status,500)
			}
		})
	})
})
