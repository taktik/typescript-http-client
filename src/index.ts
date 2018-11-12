import * as log4javascript from 'log4javascript'

export namespace httpclient {
  const log = log4javascript.getLogger('http.client')

  export interface HttpClient {
    callForResponse<T> (request: Request): Promise<Response<T>>

    call<T> (request: Request): Promise<T>

    addFilter (filter: Filter, config?: FilterConfig): FilterRegistration
  }

  class HttpClientImpl implements HttpClient {
    private readonly _filters: InstalledFilter[]

    constructor () {
      this._filters = []
    }

    addFilter (filter: Filter, config?: FilterConfig): FilterRegistration {
      const installedFilter = new InstalledFilter(filter, config)
      const filters = this._filters
      filters.push(installedFilter)
      return {
        remove (): void {
          remove(installedFilter, filters)
        }
      }
    }

    async call<T> (call: Request): Promise<T> {
      return (await this.callForResponse<T>(call)).body
    }

    async callForResponse<T> (call: Request): Promise<Response<T>> {
      return new FilterChainImpl(this._filters).doFilter(call)
    }
  }

  export interface Headers {
    [name: string]: string
  }

  export class Request {
    url: string
    contentType: string = 'application/json; charset=UTF-8'
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | string = 'GET'
    responseType: XMLHttpRequestResponseType = 'json'
    withCredentials: boolean = false
    body?: object | Document | BodyInit | null
    headers: Headers = {}
    timeout: number = 30000
    readyState: number = 0

    constructor (url: string, {
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

    set ({
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

    setContentType (contentType: string): Request {
      this.contentType = contentType
      return this
    }

    setMethod (method: 'GET' | 'POST' | 'PUT' | 'DELETE' | string = 'GET'): Request {
      this.method = method
      return this
    }

    setResponseType (responseType: XMLHttpRequestResponseType) {
      this.responseType = responseType
      return this
    }

    setWithCredentials (withCredentials: boolean) {
      this.withCredentials = withCredentials
      return this
    }

    setBody (body?: object | Document | BodyInit | null) {
      this.body = body
      return this
    }

    setHeaders (headers: Headers) {
      this.headers = headers
      return this
    }

    addHeader (headerName: string, value: string) {
      this.headers[headerName] = value
    }

    setTimeout (timeout: number) {
      this.timeout = timeout
      return this
    }

  }

  export interface Response<T> {
    request: Request
    status: number
    statusText: string
    headers: Headers
    body: T
  }

  function execute<T> (request: Request): Promise<Response<T>> {
    return new Promise<Response<T>>((resolve, reject) => {
      log.trace(`Executing request with type=${request.responseType}`)

      const req = new XMLHttpRequest()
      req.responseType = request.responseType
      req.withCredentials = request.withCredentials
      req.timeout = request.timeout

      const parseResponseHeaders = function (request: XMLHttpRequest): Headers {
        // Get the raw header string
        const headers = request.getAllResponseHeaders()

        // Convert the header string into an array
        // of individual headers
        const arr = headers.trim().split(/[\r\n]+/)

        // Create a map of header names to values
        const headerMap: Headers = {}
        arr.forEach(function (line) {
          line = line.trim()
          if (line.length > 0) {
            const parts = line.split(': ')
            if (parts.length >= 2) {
              const header = parts.shift()!
              headerMap[header] = parts.join(': ')
            }
          }
        })
        return headerMap
      }

      const buildResponseAndUpdateRequest = function <T> (req: XMLHttpRequest): Response<T> {
        request.readyState = req.readyState
        let responseBody = req.response
        if (typeof responseBody === 'string' && (req.responseType === '' || req.responseType === 'text') && responseBody.length === req.responseText.length) {
          log.trace(`Parsing JSON`)
          responseBody = JSON.parse(responseBody)
        }
        return {
          request: request,
          headers: parseResponseHeaders(req),
          body: responseBody as T,
          status: req.status,
          statusText: req.statusText
        } as Response<T>
      }

      const rejectRequest = function <T> (req: XMLHttpRequest) {
        reject(buildResponseAndUpdateRequest(req))
      }

      const resolveRequest = function <T> (req: XMLHttpRequest) {
        resolve(buildResponseAndUpdateRequest(req))
      }

      req.onerror = () => rejectRequest(req)
      req.onabort = req.onerror
      req.ontimeout = req.onerror
      req.onload = () => {
        if (req.status >= 200 && req.status < 400) {
          // Success!
          resolveRequest(req)
        } else {
          rejectRequest(req)
        }
      }
      req.open(request.method, request.url)

      for (const headerName in request.headers) {
        req.setRequestHeader(headerName, request.headers[headerName])
      }
      req.setRequestHeader('Content-Type', request.contentType)

      let body = request.body
      // Auto-stringify json objects
      if (typeof body === 'object' && request.contentType.toLowerCase().includes('application/json')) {
        body = JSON.stringify(body)
      }

      req.send(body as (Document | BodyInit | null))
    })
  }

  export interface FilterRegistration {
    // Remove the filter
    remove (): void
  }

  export interface FilterChain {
    doFilter (call: Request): Promise<Response<any>>
  }

  class FilterChainImpl implements FilterChain {
    constructor (readonly filters: InstalledFilter[], readonly fromIndex: number = 0) {
    }

    async doFilter (request: Request): Promise<Response<any>> {
      let index = this.fromIndex
      // Find next filter to apply
      while (index < this.filters.length) {
        const filter = this.filters[index]
        if (filter.config && !filter.config.enabled(request)) {
          index++
        } else {
          break
        }
      }
      if (index < this.filters.length) {
        // We found a filter to apply
        return this.filters[index].filter.doFilter(request, new FilterChainImpl(this.filters, index + 1))
      } else {
        // We are at the end of the filter chain,
        // we can execute the call
        return execute(request)
      }
    }
  }

  class InstalledFilter {
    constructor (readonly filter: Filter, readonly config?: FilterConfig) {
    }
  }

  /*
    A filter configuration
  */
  export interface FilterConfig {
    /*
      Return "true" if this filter should be applied to the given call
    */
    enabled (call: Request): boolean
  }

  export interface Filter {
    doFilter (call: Request, filterChain: FilterChain): Promise<Response<any>>
  }

  /*
    Factory method
  */
  export function newHttpClient () {
    return new HttpClientImpl()
  }

  // Utility methods
  function remove (item: any, array: any[]) {
    const index = array.indexOf(item, 0)
    if (index > -1) {
      array.splice(index, 1)
    }
  }

}
