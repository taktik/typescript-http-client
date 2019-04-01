import { assert } from 'chai'
import { spy } from 'sinon'
import { httpclient } from '../../src/index'

describe('httpclient', () => {
  // Declaring all variables that we will need
	let httpClient: httpclient.HttpClient
	let aResponse: httpclient.Response<Object>
	let anotherResponse: httpclient.Response<Object>
	let aRequest: httpclient.Request
	let anotherRequest: httpclient.Request
	let aFilter: httpclient.Filter
	let anotherFilter: httpclient.Filter
  // Executed before each test
	beforeEach(function() {
	// httpClient instantiation
		httpClient = httpclient.newHttpClient()
	// Request instantiation
		aRequest = new httpclient.Request('https://jsonplaceholder.typicode.com/todos/1')
		anotherRequest = new httpclient.Request('https://jsonplaceholder.typicode.com/tdos/1')
	// Responses instantiation
		aResponse = new httpclient.Response(aRequest, 200, 'OK', { 'content-type': 'Application/Json' }, { 'userId': 1, 'id': 1,'title': 'delectus aut autem', 'completed': false })
		anotherResponse = new httpclient.Response(anotherRequest, 404, 'NotFound', { 'content-type': 'Application/Json' }, '')
	// Creating filters
		aFilter = {
			doFilter: (call: httpclient.Request, filterChain: httpclient.FilterChain) => Promise.resolve(aResponse)
		}
		anotherFilter = {
			doFilter: (call: httpclient.Request, filterChain: httpclient.FilterChain) => Promise.resolve(anotherResponse)
		}
	// Creating a new implementation of FilterConfig
		class JsonPlaceHolder implements httpclient.FilterConfig {
			enabled(call: httpclient.Request): boolean {
				if (call.url.includes('jsonplaceholder.typicode.com')) {
					return true
				}
				return false
			}
		}
	})
	describe('newHttpClient', function() {
		it('should return an object', function() {
			const httpClient = httpclient.newHttpClient()
			assert.equal(typeof httpClient, 'object')
		})
	})
	describe('Request', function() {
		it('should return a function', function() {
			const request = httpclient.Request
			assert.equal(typeof request, 'function')
		})
	})
	describe('addFilter', function() {
		it('should start without filters', function() {
			const nbOfFilters = (httpClient as any)._filters.length
			assert.equal(nbOfFilters, 0)
		})
		it('should increase size of filter array when a filter is added', function() {
			httpClient.addFilter(aFilter, 'the first filter')
			const nbOfFilters = (httpClient as any)._filters.length
			assert.equal(nbOfFilters, 1)
		})
		it('should change the size of the filter array when removing a filter', function() {
			let ctrlZ = httpClient.addFilter(aFilter, 'the first filter')
			const nbOfFiltersBeforeDelete = (httpClient as any)._filters.length
			ctrlZ.remove()
			const nbOfFiltersAfterDelete = (httpClient as any)._filters.length
			assert.equal(nbOfFiltersAfterDelete, nbOfFiltersBeforeDelete - 1)
		})
		it('should not remove a filter when adding one', function() {
			let ctrlZ = httpClient.addFilter(aFilter, 'the first filter')
			let ctrlZZ = httpClient.addFilter(anotherFilter, 'the second filter')
			function firstFilterStillThere(element: httpclient.InstalledFilter) {
				return element.name === 'the first filter'
			}
			assert.notEqual((httpClient as any)._filters.findIndex(firstFilterStillThere), -1)
		})
		it('should not remove the first filter when removing the second filter ', function() {
			httpClient.addFilter(aFilter, 'the first filter')
			let ctrlZZ = httpClient.addFilter(anotherFilter, 'the second filter')
			ctrlZZ.remove()
			assert.equal((httpClient as any)._filters[0].name, 'the first filter')
		})
		it('should take into account the added filter', async function() {
			spy(aFilter, 'doFilter')
			httpClient.addFilter(aFilter, 'the first filter')
			await httpClient.call<Object>(aRequest)
			assert.isTrue((aFilter.doFilter as any).called)
		})
	})
	describe('call', function() {
		it('should return the body of the called request', async function() {
			const body = await httpClient.call<Object>(aRequest)
			assert.deepEqual(body, aResponse.body)
		})
	})
	describe('callForResponse' , function() {
		it('should return a Response object', async function() {
			const theResponse: httpclient.Response<Object> = await httpClient.callForResponse<Object>(aRequest)
			assert.instanceOf(theResponse, httpclient.Response)
		})
	})
	describe('set', function() {
		it('should change all the properties of a Request', function() {
			let partialRequest: {
				contentType?: string, method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | string,
				responseType?: XMLHttpRequestResponseType,
				withCredentials?: boolean,
				body?: object | Document | BodyInit | null,
				headers?: httpclient.Headers,
				timeout?: number
			} = {}
			partialRequest.contentType = 'application/json;'
			partialRequest.method = 'DELETE'
			partialRequest.responseType = 'text'
			partialRequest.withCredentials = true
			partialRequest.body = {}
			partialRequest.headers = { 'aKey': 'aValue' }
			partialRequest.timeout = 20000
			aRequest.set(partialRequest)
		// Test successful only if each property has changed
			assert.notEqual(aRequest.contentType, 'application/json; charset=UTF-8')
			assert.notEqual(aRequest.method, 'GET')
			assert.notEqual(aRequest.responseType, 'json')
			assert.notEqual(aRequest.withCredentials, false)
			assert.notEqual(aRequest.body, null)
			assert.notEqual(aRequest.headers, {})
			assert.notEqual(aRequest.timeout, 30000)
		})
	})
  // describe('what to describe', function() {
  //   it('should do something', function() {

  //     assert.equal(1,1)
  //   })
  // })
  //
})
