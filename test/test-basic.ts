import { assert } from 'chai'
import { spy, fakeServer, SinonFakeServer } from 'sinon'
import {
	HttpClient,
	Headers,
	Request,
	Response,
	Filter,
	FilterChain,
	FilterConfig,
	newHttpClient,
	InstalledFilter,
	FilterCollection} from '../src/index'
import FilterChainImpl from '../src/filterChainImpl'

describe('httpclient', () => {
  // Declaring all variables that we will need
	let httpClient: HttpClient
	let aResponse: Response<unknown>
	let anotherResponse: Response<unknown>
	let aRequest: Request
	let anotherRequest: Request
	let aFilter: Filter<unknown,unknown>
	let anotherFilter: Filter<unknown,unknown>
  // Executed before each test
	beforeEach(function() {
	// httpClient instantiation
		httpClient = newHttpClient()
	// Request instantiation
		aRequest = new Request('https://jsonplaceholder.typicode.com/todos/1')
		anotherRequest = new Request('https://jsonplaceholder.typicode.com/tdos/1')
	// Responses instantiation
		aResponse = new Response(aRequest, 200, 'OK', { 'content-type': 'Application/Json' }, { 'userId': 1, 'id': 1,'title': 'delectus aut autem', 'completed': false })
		anotherResponse = new Response(anotherRequest, 404, 'NotFound', { 'content-type': 'Application/Json' }, '')
	// Creating filters
		aFilter = {
			doFilter: () => Promise.resolve(aResponse)
		}
		anotherFilter = {
			doFilter: () => Promise.resolve(anotherResponse)
		}
	// Creating a new implementation of FilterConfig
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		class JsonPlaceHolder implements FilterConfig {
			enabled(call: Request): boolean {
				if (call.url.includes('jsonplaceholder.typicode.com')) {
					return true
				}
				return false
			}
		}
	})
	describe('newHttpClient', function() {
		it('should return an object', function() {
			const httpClient = newHttpClient()
			assert.equal(typeof httpClient, 'object')
		})
	})
	describe('Request', function() {
		it('should return a function', function() {
			const request = Request
			assert.equal(typeof request, 'function')
		})
	})
	describe('addFilter', function() {
		it('should start without filters', function() {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
			const nbOfFilters = (httpClient as any)._filters.length
			assert.equal(nbOfFilters, 0)
		})
		it('should increase size of filter array when a filter is added', function() {
			httpClient.addFilter(aFilter, 'the first filter')
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
			const nbOfFilters = (httpClient as any)._filters.length
			assert.equal(nbOfFilters, 1)
		})
		it('should change the size of the filter array when removing a filter', function() {
			const ctrlZ = httpClient.addFilter(aFilter, 'the first filter')
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
			const nbOfFiltersBeforeDelete = (httpClient as any)._filters.length
			ctrlZ.remove()
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
			const nbOfFiltersAfterDelete = (httpClient as any)._filters.length
			assert.equal(nbOfFiltersAfterDelete, nbOfFiltersBeforeDelete - 1)
		})
		it('should not remove a filter when adding one', function() {
			httpClient.addFilter(aFilter, 'the first filter')
			httpClient.addFilter(anotherFilter, 'the second filter')
			function firstFilterStillThere(element: InstalledFilter) {
				return element.name === 'the first filter'
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
			assert.notEqual((httpClient as any)._filters.findIndex(firstFilterStillThere), -1)
		})
		it('should not remove the first filter when removing the second filter ', function() {
			httpClient.addFilter(aFilter, 'the first filter')
			const ctrlZZ = httpClient.addFilter(anotherFilter, 'the second filter')
			ctrlZZ.remove()
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
			assert.equal((httpClient as any)._filters[0].name, 'the first filter')
		})
		it('should take into account the added filter', async function() {
			spy(aFilter, 'doFilter')
			httpClient.addFilter(aFilter, 'the first filter')
			await httpClient.call<unknown>(aRequest)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
			assert.isTrue((aFilter.doFilter as any).called)
		})
	})
	describe('call', function() {
		it('should return the body of the called request', async function() {
			const body = await httpClient.call<unknown>(aRequest)
			assert.deepEqual(body, aResponse.body)
		})
	})
	describe('callForResponse' , function() {
		it('should return a Response object', async function() {
			const theResponse: Response<unknown | null> = await httpClient.callForResponse<unknown>(aRequest)
			assert.instanceOf(theResponse, Response)
		})
	})
	describe('set', function() {
		it('should change all the properties of a Request', function() {
			const partialRequest: {
				contentType?: string, method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | string,
				responseType?: XMLHttpRequestResponseType,
				withCredentials?: boolean,
				body?: object | Document | BodyInit | null,
				headers?: Headers,
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
			assert.equal(aRequest.contentType, 'application/json;')
			assert.equal(aRequest.method, 'DELETE')
			assert.equal(aRequest.responseType, 'text')
			assert.equal(aRequest.withCredentials, true)
			assert.deepEqual(aRequest.body, {})
			assert.deepEqual(aRequest.headers, { 'aKey': 'aValue' })
			assert.equal(aRequest.timeout, 20000)
		})
	})
	describe('filter collection' , function() {
		class Post {
			'userId': string
			'Id': number
			'title': string
			'body': string
		}
		class FirstStep implements Filter<Post, Post> {
			async doFilter(call: Request, filterChain: FilterChain<Post>): Promise<Response<Post>> {
				(call.body as Post).body = '(╯'
				const response = await filterChain.doFilter(call)
				return response
			}
		}
		class SecondStep implements Filter<Post, Post> {
			async doFilter(call: Request, filterChain: FilterChain<Post>): Promise<Response<Post>> {
				(call.body as Post).body += '°□'
				const response = await filterChain.doFilter(call)
				return response
			}
		}
		class ThirdStep implements Filter<Post, Post> {
			async doFilter(call: Request, filterChain: FilterChain<Post>): Promise<Response<Post>> {
				(call.body as Post).body += '°）'
				const response = await filterChain.doFilter(call)
				return response
			}
		}
		class FourthStep implements Filter<Post, Post> {
			async doFilter(call: Request, filterChain: FilterChain<Post>): Promise<Response<Post>> {
				(call.body as Post).body += '╯︵ '
				const response = await filterChain.doFilter(call)
				return response
			}
		}
		class FifthStep implements Filter<Post, Post> {
			async doFilter(call: Request, filterChain: FilterChain<Post>): Promise<Response<Post>> {
				(call.body as Post).body += '┻━'
				const response = await filterChain.doFilter(call)
				return response
			}
		}
		class LastStep implements Filter<Post, Post> {
			async doFilter(call: Request, filterChain: FilterChain<Post>): Promise<Response<Post>> {
				(call.body as Post).body += '┻'
				const response = await filterChain.doFilter(call)
				return response
			}
		}
		const httpClient = newHttpClient()
		let mainFilterChain: FilterChain<unknown>
		it('should apply all its filters before moving to the main chain', async function() {
			this.timeout(5000)
			aRequest = new Request('https://jsonplaceholder.typicode.com/posts')
			aRequest.method = 'POST'
			aRequest.body = {
				'userId': 1,
				'id': 101,
				'title': 'My code does not work! AAAArgh!',
				'body': ''
			}
			const packOfFilters = []
			packOfFilters[0] = new InstalledFilter(new ThirdStep() , '3')
			packOfFilters[1] = new InstalledFilter(new FourthStep() , '4')
			packOfFilters[2] = new InstalledFilter(new FifthStep() , '5')
			const filterCollection = new FilterCollection(packOfFilters)
			httpClient.addFilter(new FirstStep(), '1')
			httpClient.addFilter(new SecondStep(), '2')
			httpClient.addFilter(filterCollection, '3,4,5')
			httpClient.addFilter(new LastStep(), '6')
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			mainFilterChain = new FilterChainImpl((httpClient as any)._filters)
			const theResponse = await mainFilterChain.doFilter(aRequest)
			assert.equal((theResponse.request.body as Post).body, '(╯°□°）╯︵ ┻━┻')
		})
	})
	describe('cancel request', () => {
		let server: SinonFakeServer
		function wait(ms: number) {
			return new Promise(resolve => setTimeout(resolve, ms))
		}
		class WaitFilter implements Filter<unknown, unknown> {
			async doFilter(call: Request, filterChain: FilterChain<unknown>): Promise<Response<unknown>> {
				await wait(10)
				return filterChain.doFilter(call)
			}
		}
		before(function() {
			server = fakeServer.create()
		})
		after(function() {
			server.restore()
		})
		it('should reject with request after filters operations', async () => {
			aRequest = new Request('an.api.dummy/resource')
			const client = newHttpClient()
			const waitFilter = new WaitFilter()
			spy(waitFilter, 'doFilter')
			client.addFilter(waitFilter, 'filter')
			try {
				const exec = client.execute<unknown>(aRequest)
				aRequest.abort()
				await exec
				assert.isTrue(false, 'previous line should throw an error')
			} catch (err) {
				const response = err as Response<unknown>
				assert.equal(response.request.readyState, 4, 'request done')
				assert.equal(response.status, 0, 'UNSENT')
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
				assert((waitFilter.doFilter as any).calledOnce)
			}
		})
		it('should reject with response', async () => {
			aRequest = new Request('an.api.dummy/resource')
			const client = newHttpClient()
			try {
				const exec = client.execute<unknown>(aRequest)
				aRequest.abort()
				await exec
				assert.isTrue(false, 'previous line should throw an error')
			} catch (err) {
				const response = err as Response<unknown>
				assert.equal(response.request.readyState, 4, 'request done')
				assert.equal(response.status, 0, 'UNSENT')
				assert.isNull(response.body)
			}
		})
	})
})
