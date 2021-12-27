import { FilterChain, InstalledFilter, Request, Response, getLogger } from './index'
import execute from './execute'
export default class FilterChainImpl implements FilterChain<unknown> {
	constructor(readonly filters: InstalledFilter[], readonly fromIndex: number = 0, readonly callBack: (request: Request) => Promise<Response<unknown>> = execute) {
	}
	async doFilter(request: Request): Promise<Response<unknown>> {
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
			getLogger()?.trace('Applying filter ' + installedFilter.name)
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
