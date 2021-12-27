import { assert } from 'chai'
import {
	Request,
	HttpClient,
	Filter,
	FilterChain,
	Response,
	FilterConfig,
	newHttpClient,
} from '../src/index'
import filterChainImpl from '../src/filterChainImpl'

describe('execute', function() {
	class Post {
		'userId': string
		'Id': number
		'title': string
		'body': string
	}
	let aRequest: Request
	let mainFilterChain: filterChainImpl
	let mainClient: HttpClient

	class TitleChanges implements Filter<Post, Post> {
		async doFilter(call: Request, filterChain: FilterChain<Post>): Promise<Response<Post>> {
			(call.body as Post).title = 'Where are you noww'
			const response = await filterChain.doFilter(call)
			return response
		}
	}
	class RemoveLastLetterOfTitle implements Filter<Post, Post> {
		async doFilter(call: Request, filterChain: FilterChain<Post>): Promise<Response<Post>> {
			(call.body as Post).title = (call.body as Post).title.slice(0, -1)
			const response = await filterChain.doFilter(call)
			return response
		}
	}
	class OnlyWhenCreating implements FilterConfig {
		enabled(call: Request): boolean {
			return call.method === 'POST'
		}
	}
	before(function() {
		mainClient = newHttpClient()
	})
	it('should correctly apply two filters in the right order and execute the request', async function() {
		mainClient.addFilter(new TitleChanges(), 'nameBecomesIvann')
		mainClient.addFilter(new RemoveLastLetterOfTitle(), 'removeLastLetterOfName')
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
		mainFilterChain = new filterChainImpl((mainClient as any)._filters)
		aRequest = new Request('https://jsonplaceholder.typicode.com/posts')
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
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		(mainClient as any)._filters = []
		mainClient.addFilter(new TitleChanges(), 'changeTitle', new OnlyWhenCreating())
		mainClient.addFilter(new RemoveLastLetterOfTitle(), 'removeLastLetterOfTitle', new OnlyWhenCreating())
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
		mainFilterChain = new filterChainImpl((mainClient as any)._filters)
		aRequest = new Request('https://jsonplaceholder.typicode.com/posts/6')
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
