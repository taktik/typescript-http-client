import { assert } from 'chai'
import { httpclient } from '../../src/index'

describe('httpclient', () => {
  describe('newHttpClient', function () {
    it('should return an object', function () {
      const httpClient = httpclient.newHttpClient()
      assert.equal(typeof httpClient, 'object')
    })
  })
  describe('Request', function () {
    it('should return a function', function () {
      const request = httpclient.Request
      assert.equal(typeof request, 'function')
    })
  })
})
