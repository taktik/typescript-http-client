import * as log4javascript from 'log4javascript'

export namespace httpclient {
	const log = log4javascript.getLogger('http.client')
	const filterLog = log4javascript.getLogger('http.client.filter')

	/**
	 * In order to be an HttpClient, the class should:
	 * Make a call to the server and returning a response
	 * Make a simpler call to the server that only returns a part of the response
	 * Add a filter to its filter list
	 */
	export interface HttpClient {
		executeForResponse<T> (request: Request): Promise<Response<T>>

		callForResponse<T> (request: Request): Promise<Response<T>>

		execute<T> (request: Request): Promise<T>

		call<T> (request: Request): Promise<T>

		addFilter (filter: Filter<any, any>, name: string, config?: FilterConfig): FilterRegistration
	}

	// Main class to make calls to the API
	// method call will call method doFilter and it will call method execute
	class HttpClientImpl implements HttpClient {
		private readonly _filters: InstalledFilter[]

		constructor() {
			this._filters = []
		}

		// Takes parameters and creates an InstalledFilter with them
		// Add the InstalledFilter to the filter array
		// The InstalledFilter is made of two parts: The Filter and the FilterConfig
		addFilter(filter: Filter<any, any>, name: string, config?: FilterConfig): FilterRegistration {
			const installedFilter = new InstalledFilter(filter, name, config)
			const filters = this._filters
			// Returns an object with a method to remove the added filter
			filters.push(installedFilter)
			return {
				remove(): void {
					remove(installedFilter, filters)
				}
			}
		}

    // Takes a Request and returns the body of the promise returned by the method callForResponse
		async execute<T>(call: Request): Promise<T> {
			return (await this.callForResponse<T>(call)).body
		}

		// Takes a Request, creates the main chain of filters with the current filters of httpclient
		// and then calls the method doFilter with the received Request
		async executeForResponse<T> (call: Request): Promise<Response<T>> {
			return new FilterChainImpl(this._filters).doFilter(call)
		}

    // Same as execute
		async call<T> (call: Request): Promise<T> {
			return this.execute<T>(call)
		}

    // Same as executeForResponse
		async callForResponse<T> (call: Request): Promise<Response<T>> {
			return this.executeForResponse<T>(call)
		}
	}

	// Interfaces can hold properties
	// This interface only contains a map of string-string
	export interface Headers {
		[name: string]: string
	}
	// Contains every parameter needed for a request as properties
	export class Request {
		url: string
		contentType: string = 'application/json; charset=UTF-8'
		// A way to declare an enumeration (can be anything because of the string but the IDE will suggest the 4 first verbs)
		method: 'GET' | 'POST' | 'PUT' | 'DELETE' | string = 'GET'
		responseType: XMLHttpRequestResponseType = 'json'
		withCredentials: boolean = false
		body?: object | Document | BodyInit | null
		headers: Headers = {}
		timeout: number = 30000
		readyState: number = 0
		properties: {[key: string]: any} = {}

		// constructor that can take a lot of parameters but only the URL is mandatory
		constructor(url: string, {
			contentType, method, responseType,
			withCredentials, body, headers, timeout
		}: {
			contentType?: string, method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | string, responseType?: XMLHttpRequestResponseType,
			withCredentials?: boolean, body?: object | Document | BodyInit | null, headers?: Headers, timeout?: number
		} = {}) {
			this.url = url
			if (contentType) {
				this.contentType = contentType
			}
			if (method) {
				this.method = method
			}
			if (responseType) {
				this.responseType = responseType
			}
			if (withCredentials) {
				this.withCredentials = withCredentials
			}
			if (body) {
				this.body = body
			}
			if (headers) {
				this.headers = headers
			}
			if (timeout) {
				this.timeout = timeout
			}
		}

		// sets the properties (like a constructor for changes)
		set({
				contentType, method, responseType,
				withCredentials, body, headers, timeout
			}: {
				contentType?: string, method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | string, responseType?: XMLHttpRequestResponseType,
				withCredentials?: boolean, body?: object | Document | BodyInit | null, headers?: Headers, timeout?: number
			}): Request {
			if (contentType) {
				this.contentType = contentType
			}
			if (method) {
				this.method = method
			}
			if (responseType) {
				this.responseType = responseType
			}
			if (withCredentials) {
				this.withCredentials = withCredentials
			}
			if (body) {
				this.body = body
			}
			if (headers) {
				this.headers = headers
			}
			if (timeout) {
				this.timeout = timeout
			}
			return this
		}

		setContentType(contentType: string): Request {
			this.contentType = contentType
			return this
		}

		setMethod(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | string = 'GET'): Request {
			this.method = method
			return this
		}

		setResponseType(responseType: XMLHttpRequestResponseType) {
			this.responseType = responseType
			return this
		}

		setWithCredentials(withCredentials: boolean) {
			this.withCredentials = withCredentials
			return this
		}

		setBody(body?: object | Document | BodyInit | null) {
			this.body = body
			return this
		}

		setHeaders(headers: Headers) {
			this.headers = headers
			return this
		}

		addHeader(headerName: string, value: string) {
			this.headers[headerName] = value
		}

		setTimeout(timeout: number) {
			this.timeout = timeout
			return this
		}

		setProperty (key: string, value: any) {
			this.properties[key] = value
			return this
		}

		getProperty (key: string): any {
			return this.properties[key]
		}

	}

	// The class that our calls return
	export class Response<T> {
		readonly properties: {[key: string]: any} = {}
		constructor(readonly request: Request,
					 readonly status: number,
					 readonly statusText: string,
					 readonly headers: Headers,
					 readonly body: T
					 ) {
		}

		setProperty(key: string, value: any) {
			this.properties[key] = value
			return this
		}

		getProperty(key: string): any {
			return this.properties[key]
		}
	}

	// Global function that takes a request (after being filtered), send it to the API and gives us its response
	function execute<T>(request: Request): Promise<Response<T>> {
		// Returns a new Promise
		return new Promise<Response<T>>((resolve, reject) => {
			let traceMessage: String | undefined
			if (log.isTraceEnabled()) {
				// Takes care of the logs
				traceMessage = `${request.method} ${request.url}`
				if (request.body) {
					if (typeof request.body === 'string') {
						traceMessage += ` --> ${request.body}`
					} else if (!(request.body instanceof Blob ||
						request.body instanceof ArrayBuffer
						|| request.body instanceof ReadableStream
						|| request.body instanceof Document)) {
						traceMessage += ` --> ${JSON.stringify(request.body)}`
					}
				}
			}

			// Creating a new XMLHttpRequest and giving it two properties from the request this method received
			// This will be the request we will send to the server
			const xhr = new XMLHttpRequest()
			xhr.withCredentials = request.withCredentials
			xhr.timeout = request.timeout

			// This internal method takes the xml request and retrieve headers from it
			const parseResponseHeaders = function(request: XMLHttpRequest): Headers {
				// Create a map of header names to values
				const headerMap: Headers = {}
				// Get the raw header string
				const headers = request.getAllResponseHeaders()
				if (headers) {
					// Convert the header string into an array
					// of individual headers
					const arr = headers.trim().split(/[\r\n]+/)

					// Splits every header in multiple key-value pairs
					arr.forEach(function(line) {
						line = line.trim()
						if (line.length > 0) {
							const parts = line.split(': ')
							if (parts.length >= 2) {
								const header = parts.shift()!
								headerMap[header] = parts.join(': ')
							}
						}
					})
				}
				return headerMap
			}

			// This inernal method takes an XMLHttpRequest and will return a Response
			// The request of the returned Response will stay as it was, only its readystate will be updated
			// The rest of the returned Repsponse will be update accordinly to the XMLHttpRequest this method receives
			const buildResponseAndUpdateRequest = function <T>(req: XMLHttpRequest): Response<T> {
				// Puting the newly received ready state in the request the global method received
				// because we will return it contained in the Response
				request.readyState = req.readyState
				// Getting the response of the XMLHttpRequest we receive
				let responseBody = req.response
				// Some implementations of XMLHttpRequest ignore the "json" responseType
				// Checking if the form of the request the parent method received is correct
				if (request.responseType === 'json'
					&& typeof responseBody === 'string'
					&& (req.responseType === '' || req.responseType === 'text')
					&& responseBody.length === req.responseText.length
					&& req.responseText.length > 0) {
					// TODO: if error here around, it isn't bubble up ! Please AB fix it
					log.trace(`Parsing JSON`)
					try {
						responseBody = JSON.parse(responseBody)
					} catch (e) {
						responseBody = undefined
					}
				}
				// We return a response with the request of the parent method (only the readystate has changed)
				// We add to it a couple of properties from the request this method received
				// And wrap it up into our Response class
				return new Response<T>(request,
					req.status,
					req.statusText,
					parseResponseHeaders(req),
					responseBody as T
				)
			}

			// When the promise is returned, we call the buildResponseAndUpdateRequestMethod
			// And this is what will give us our final Response
			const rejectRequest = function <T>(req: XMLHttpRequest) {
				reject(buildResponseAndUpdateRequest(req))
			}

			const resolveRequest = function <T>(req: XMLHttpRequest) {
				resolve(buildResponseAndUpdateRequest(req))
			}

			// Defining the main xmlHttpRequest properties (methods)
			xhr.onerror = () => {
				if (log.isTraceEnabled()) {
					log.trace(xhr.status + ' ' + traceMessage)
				}
				rejectRequest(xhr)
			}
			xhr.onabort = xhr.onerror
			xhr.ontimeout = xhr.onerror
			xhr.onload = () => {
				if (log.isTraceEnabled()) {
					log.trace(xhr.status + ' ' + traceMessage)
				}
				if (xhr.status >= 200 && xhr.status < 400) {
					// Success!
					resolveRequest(xhr)
				} else {
					rejectRequest(xhr)
				}
			}
			// Initializes the request
			xhr.open(request.method, request.url)
			// Copying the response type from the Request we received
			xhr.responseType = request.responseType

			// Adapting the main XMLHttpRequest in function of the passed Request
			if (request.responseType === 'json') {
				xhr.setRequestHeader('Accept', 'application/json')
			}
			for (const headerName in request.headers) {
				xhr.setRequestHeader(headerName, request.headers[headerName])
			}
			xhr.setRequestHeader('Content-Type', request.contentType)

			let body = request.body
			// Auto-stringify json objects
			if (typeof body === 'object' && request.contentType.toLowerCase().includes('application/json')) {
				body = JSON.stringify(body)
			}

			// Sending request to the server
			xhr.send(body as (Document | BodyInit | null))
		})
	}

	/**
	 * Interface useful to remove a Filter after it has been added to the httpClient array
	 */
	export interface FilterRegistration {
		// Remove the filter
		remove(): void
	}

	/**
	 * A FilterChain should have a method to apply all its filters
	 * on a Request and send it to the server
	 */
	export interface FilterChain<T> {
		doFilter(call: Request): Promise<Response<T>>
	}

  /**
	 * Third parameter is a function that will call the execute method with a given request
	 * Only the first parameter of the constructor is obligatory
	 * Has all the filters that could be applied to a request
	 * Goes throught them and applies them to the request if the config is matching
	 */
	class FilterChainImpl implements FilterChain<any> {
		constructor(readonly filters: InstalledFilter[], readonly fromIndex: number = 0, readonly callBack: (request: Request) => Promise<Response<any>> = execute) {
		}

		async doFilter(request: Request): Promise<Response<any>> {
			// References the parameter of the class that is zero by default
			let index = this.fromIndex
			// Find next filter to apply
			// Looping throught all its filters
			while (index < this.filters.length) {
				// We take each filter and we verify if the filters config is not defined or if
				// its enabled method returns true when passed the request that doFilter received as parameter
				const filter = this.filters[index]
				// If an InstalledFilter has no config, it should be applied to all requests
				if (!filter.config || filter.config.enabled(request)) {
					// We have found a filter to apply
					break
				} else {
					// Go to next filter
					index++
				}
			}
			if (index < this.filters.length) {
				const installedFilter = this.filters[index]
				// We found a filter to apply
				filterLog.trace('Applying filter ' + installedFilter.name)
				// We return the filter of the installedFilter we found and applied to it its own .doFilter method which is not the same method
				// passing to it the same request and a new FilterChainImpl with the list of filters, a counter incremented by 1, and the callback method
				return installedFilter.filter.doFilter(request, new FilterChainImpl(this.filters, index + 1, this.callBack))
			} else {
				// We are at the end of the filter chain,
				// we can execute the call
				return this.callBack(request)
			}
		}
	}

	export class FilterCollection implements Filter<any, any> {
		constructor(readonly filters: InstalledFilter[]) {
		}

		/**
		 * @param call Is the request we want to modify
		 * @param filterChain is an Interface that is a Filter, but its goal is to simulate
		 * nested filters. So it contains an array of filter and its doFilter loops trhough all its filters
		 * before continuing with the main chain of filters
		 */
		doFilter (call: httpclient.Request, filterChain: httpclient.FilterChain<any>): Promise<httpclient.Response<any>> {
			return new FilterChainImpl(this.filters, 0, request => filterChain.doFilter(request)).doFilter(call)
		}
	}

	/**
	 * Is composed of a FilterConfig that checks the request to know if the Filter should be applied
	 * and of a Filter that does something to the request/response
	 */
	export class InstalledFilter {
		constructor(readonly filter: Filter<any, any>, readonly name: string, readonly config?: FilterConfig) {
		}
	}

	/*
		A filter configuration
	*/
	export interface FilterConfig {
		/*
			Return "true" if this filter should be applied to the given call
		*/
		enabled(call: Request): boolean
	}

	export interface Filter<T, U> {
		doFilter(call: Request, filterChain: FilterChain<T>): Promise<Response<U>>
	}

	/*
		Factory method
	*/
	export function newHttpClient(): HttpClient {
		return new HttpClientImpl()
	}

	// Utility methods
	function remove(item: any, array: any[]) {
		const index = array.indexOf(item, 0)
		if (index > -1) {
			array.splice(index, 1)
		}
	}

}
