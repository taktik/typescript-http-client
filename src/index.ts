import * as log4javascript from 'log4javascript'

export namespace httpclient {
	const log = log4javascript.getLogger('http.client')

	// In order to be an HttpClient, the class should make calls both with and without a response and add filters to its list
	export interface HttpClient {
		callForResponse<T>(request: Request): Promise<Response<T>>

		call<T>(request: Request): Promise<T>

		addFilter(filter: Filter, name: string, config?: FilterConfig): FilterRegistration
	}

	// Mains class to make calls to the API
	class HttpClientImpl implements HttpClient {
		private readonly _filters: InstalledFilter[]

		constructor() {
			this._filters = []
		}

		// Takes parameteres and created an InstalledFilter with them
		addFilter(filter: Filter, name: string, config?: FilterConfig): FilterRegistration {
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

		// Takes a Request and returns the body of the method callForResponse with the same parameter
		async call<T>(call: Request): Promise<T> {
			return (await this.callForResponse<T>(call)).body
		}

		// Takes a Request, creates a FilterChainChamp with the current filters and then calls the method doFilter with the received Request
		async callForResponse<T>(call: Request): Promise<Response<T>> {
			return new FilterChainImpl(this._filters).doFilter(call)
		}
	}

	// Interfaces can hold proprities, this interface only contains a map of string-string
	export interface Headers {
		[name: string]: string
	}
	// Contains every parameter needed for a request as proprities
	export class Request {
		url: string
		contentType: string = 'application/json; charset=UTF-8'
		// A way to decalre an enumeration (can be anything because of the string but the IDE will suggest the 4 first verbs)
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

		// sets the proprities (like a constructor for changes)
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

	// Global function that takes a request, send it to the API and gives us its response
	function execute<T>(request: Request): Promise<Response<T>> {
		// Return a new Promise
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

			// Creating an xmlhttprequest and giving it two proprities
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

			// This inernal method takes an XMLHttpRequest and return a response
			const buildResponseAndUpdateRequest = function <T>(req: XMLHttpRequest): Response<T> {
				request.readyState = req.readyState
				let responseBody = req.response
				// Some implementations of XMLHttpRequest ignore the "json" responseType
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
				return new Response<T>(request,
					req.status,
					req.statusText,
					parseResponseHeaders(req),
					responseBody as T
				)
			}

			// When the promise is returned, we call the buildResponseAndUpdateRequestMethod
			const rejectRequest = function <T>(req: XMLHttpRequest) {
				reject(buildResponseAndUpdateRequest(req))
			}

			const resolveRequest = function <T>(req: XMLHttpRequest) {
				resolve(buildResponseAndUpdateRequest(req))
			}

			// Defining the xmlHttpRequest properties (methods)
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
			// Initilizes the request
			xhr.open(request.method, request.url)
			xhr.responseType = request.responseType

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

	export interface FilterRegistration {
		// Remove the filter
		remove(): void
	}

	export interface FilterChain {
		doFilter(call: Request): Promise<Response<any>>
	}

	// Third parameter is a function that will call the execute method with a given request
	// Only the first parameter of this function is obligatory
	class FilterChainImpl implements FilterChain {
		constructor(readonly filters: InstalledFilter[], readonly fromIndex: number = 0, readonly callBack: (request: Request) => Promise<Response<any>> = execute) {
		}

		async doFilter(request: Request): Promise<Response<any>> {
			let index = this.fromIndex
			// Find next filter to apply
			while (index < this.filters.length) {
				const filter = this.filters[index]
				if (!filter.config || filter.config.enabled(request)) {
					// We have found a filter to apply
					break
				} else {
					index++
				}
			}
			if (index < this.filters.length) {
				const installedFilter = this.filters[index]
				// We found a filter to apply
				log.trace('Applying filter ' + installedFilter.name)
				return installedFilter.filter.doFilter(request, new FilterChainImpl(this.filters, index + 1, this.callBack))
			} else {
				// We are at the end of the filter chain,
				// we can execute the call
				return this.callBack(request)
			}
		}
	}

	export class FilterCollection implements Filter {
		constructor(readonly filters: InstalledFilter[]) {
		}

		doFilter (call: httpclient.Request, filterChain: httpclient.FilterChain): Promise<httpclient.Response<any>> {
			return new FilterChainImpl(this.filters, 0, request => filterChain.doFilter(request)).doFilter(call)
		}
	}

	export class InstalledFilter {
		constructor(readonly filter: Filter, readonly name: string, readonly config?: FilterConfig) {
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

	export interface Filter {
		doFilter(call: Request, filterChain: FilterChain): Promise<Response<any>>
	}

	/*
		Factory method
	*/
	export function newHttpClient() {
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
