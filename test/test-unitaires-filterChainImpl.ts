import { assert } from 'chai'
import { httpclient } from '../src/index'
import filterChainImpl from '../src/filterChainImpl'

describe('execute', function() {
	class Employee {
		'name': string
		'salary': number
		'age': number
	}
	let aRequest: httpclient.Request
	let mainFilterChain: filterChainImpl
	before(function() {
		let mainClient = httpclient.newHttpClient()
		class NameBecomesIvann implements httpclient.Filter<Employee, Employee> {
			async doFilter(call: httpclient.Request, filterChain: httpclient.FilterChain<any>): Promise<httpclient.Response<any>> {
				(call.body as Employee).name = 'ivann'
				const response = await filterChain.doFilter(call)
				return response
			}
		}
		class RemoveLastLetterOfName implements httpclient.Filter<Employee, Employee> {
			async doFilter(call: httpclient.Request, filterChain: httpclient.FilterChain<any>): Promise<httpclient.Response<any>> {
				(call.body as Employee).name = (call.body as Employee).name.slice(0, -1)
				const response = await filterChain.doFilter(call)
				return response
			}
		}
		mainClient.addFilter(new NameBecomesIvann(), 'nameBecomesIvann')
		mainClient.addFilter(new RemoveLastLetterOfName(), 'removeLastLetterOfName')
		mainFilterChain = new filterChainImpl((mainClient as any)._filters)
	})
	it('should correctly apply two filters in the right order and execute the request', async function() {
		aRequest = new httpclient.Request('http://dummy.restapiexample.com/api/v1/create')
		aRequest.method = 'POST'
		aRequest.body = {
			'name': 'notIvan',
			'salary': '910',
			'age': '21'
		}
		const theResponse = await mainFilterChain.doFilter(aRequest)
		assert.equal((theResponse.request.body as Employee).name, 'ivan')
	})
	// TODO: Test if filters only apply to the right requests
	//
	// it('',  function() {

	// })
})
