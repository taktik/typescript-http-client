import * as log4javascript from 'log4javascript'
import FilterChainImpl from './filterChainImpl'

export namespace httpclient {
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

	 	// Third parameter is a function that will call the execute method with a given request
		// Only the first parameter of the constructor is obligatory
	 	// Has all the filters that could be applied to a request
	 	// Goes throught them and applies them to the request if the config is matching

	export class FilterCollection implements Filter<any, any> {
		constructor(readonly filters: InstalledFilter[]) {
		}

		/**
		 * @param call Is the request we want to modify
		 * @param filterChain is an Interface that is a Filter, but its goal is to simulate
		 * nested filters. So it contains an array of filter and its doFilter loops through all its filters
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
