import { LogLevel } from 'generic-logger-typings'
import { Request, Response, getLogger, Headers } from './index'

// Global function that takes a request (after being filtered), send it to the API and gives us its response
export default function execute<T>(request: Request): Promise<Response<T>> {
	const log = getLogger()
	// Returns a new Promise
	return new Promise<Response<T>>((resolve, reject) => {
		let traceMessage = ''

		if (log?.isLevelEnabled(LogLevel.TRACE)) {
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
		if (request.isAborted) {
			request.readyState = 4
			reject(new Response<T>(request,
				0,
				'OK',
				{},
				null
			))
		} else {
			const xhr = new XMLHttpRequest()
			request.xhr = xhr
			xhr.withCredentials = request.withCredentials
			xhr.timeout = request.timeout
			try {
				xhr.upload.onloadstart = request.upload.onloadstart
				xhr.upload.onprogress = request.upload.onprogress
			} catch (e) {/* ignore error NodeJs only */}

			// This internal method takes the xml request and retrieves headers from it
			const parseResponseHeaders = function(request: XMLHttpRequest): Headers {
				// Creates a map of header names to values
				const headerMap: Headers = {}
				// Gets the raw header string
				const headers = request.getAllResponseHeaders()
				if (headers) {
					// Converts the header string into an array
					// of individual headers
					const arr = headers.trim().split(/[\r\n]+/)

					// Splits every header in multiple key-value pairs
					arr.forEach(function(line) {
						line = line.trim()
						if (line.length > 0) {
							const parts = line.split(': ')
							if (parts.length >= 2) {
								const header = parts.shift() as string
								headerMap[header] = parts.join(': ')
							}
						}
					})
				}
				return headerMap
			}

			// This internal method takes an XMLHttpRequest and will return a Response
			// The request of the returned Response will stay as it was, only its readystate will be updated
			// The rest of the returned Repsponse will be update accordingly to the XMLHttpRequest this method receives
			const buildResponseAndUpdateRequest = function <T>(req: XMLHttpRequest): Response<T> {
				// Puting the newly received ready state in the request the global method received
				// because we will return it contained in the Response
				request.readyState = req.readyState
				// Getting the response of the XMLHttpRequest we receive
				let responseBody: unknown = req.response
				// Some implementations of XMLHttpRequest ignore the "json" responseType
				// Checking if the form of the request the parent method received is correct
				if (request.responseType === 'json'
					&& typeof responseBody === 'string'
					&& (req.responseType === '' || req.responseType === 'text')
					&& responseBody.length === req.responseText.length
					&& req.responseText.length > 0) {
					// TODO: if error here around, it isn't bubble up ! Please AB fix it
					log?.trace(`Parsing JSON`)
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
			const rejectRequest = function (req: XMLHttpRequest) {
				reject(buildResponseAndUpdateRequest(req))
			}

			const resolveRequest = function (req: XMLHttpRequest) {
				resolve(buildResponseAndUpdateRequest(req))
			}

			// Defining the main xmlHttpRequest properties (methods)
			xhr.onerror = () => {
				if (log?.isLevelEnabled(LogLevel.TRACE)) {
					log.trace(`${xhr.status} ${traceMessage}`)
				}
				rejectRequest(xhr)
			}
			xhr.onabort = xhr.onerror
			xhr.ontimeout = xhr.onerror
			xhr.onload = () => {
				if (log?.isLevelEnabled(LogLevel.TRACE)) {
					log.trace(`${xhr.status} ${traceMessage}`)
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

			// Adapting the main XMLHttpRequest according to the passed Request
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
			xhr.send(body as (Document | XMLHttpRequestBodyInit | null))
		}
	})
}
