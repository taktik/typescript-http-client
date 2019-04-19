import { assert } from 'chai'
import { httpclient } from '../src/index'
import filterChainImpl from '../src/filterChainImpl'

describe('execute', function() {
	class Post {
		'userId': string
		'Id': number
		'title': string
		'body': string
	}
	let aRequest: httpclient.Request
	let mainFilterChain: filterChainImpl
	let mainClient: httpclient.HttpClient
	let idOfEntry: number
	class TitleChanges implements httpclient.Filter<Post, Post> {
		async doFilter(call: httpclient.Request, filterChain: httpclient.FilterChain<any>): Promise<httpclient.Response<any>> {
			(call.body as Post).title = 'Where are you noww'
			const response = await filterChain.doFilter(call)
			return response
		}
	}
	class RemoveLastLetterOfTitle implements httpclient.Filter<Post, Post> {
		async doFilter(call: httpclient.Request, filterChain: httpclient.FilterChain<any>): Promise<httpclient.Response<any>> {
			(call.body as Post).title = (call.body as Post).title.slice(0, -1)
			const response = await filterChain.doFilter(call)
			return response
		}
	}
	class OnlyWhenCreating implements httpclient.FilterConfig {
		enabled(call: httpclient.Request): boolean {
			return call.method === 'POST'
		}
	}
	before(function() {
		mainClient = httpclient.newHttpClient()
	})
	it('should correctly apply two filters in the right order and execute the request', async function() {
		mainClient.addFilter(new TitleChanges(), 'nameBecomesIvann')
		mainClient.addFilter(new RemoveLastLetterOfTitle(), 'removeLastLetterOfName')
		mainFilterChain = new filterChainImpl((mainClient as any)._filters)
		aRequest = new httpclient.Request('https://jsonplaceholder.typicode.com/posts')
		aRequest.method = 'POST'
		aRequest.body = {
			'userId': 1,
			'id': 101,
			'title': 'Where should I go',
			'body': 'Left where nothings right or righ where nothings left'
		}
		const theResponse = await mainFilterChain.doFilter(aRequest)
		assert.equal((theResponse.request.body as Post).title, 'Where are you now')
	})
	it('should only apply filters to the requests that matches the config', async function() {
		(mainClient as any)._filters = []
		mainClient.addFilter(new TitleChanges(), 'changeTitle', new OnlyWhenCreating())
		mainClient.addFilter(new RemoveLastLetterOfTitle(), 'removeLastLetterOfTitle', new OnlyWhenCreating())
		mainFilterChain = new filterChainImpl((mainClient as any)._filters)
		aRequest = new httpclient.Request('https://jsonplaceholder.typicode.com/posts/6')
		aRequest.method = 'PUT'
		aRequest.body = {
			'userId': 1,
			'id': 6,
			'title': 'The only thing we keep with us',
			'body': 'Is what we give'
		}
		const theResponse = await mainFilterChain.doFilter(aRequest)
		assert.equal((theResponse.request.body as Post).title, 'The only thing we keep with us')
	})
})
