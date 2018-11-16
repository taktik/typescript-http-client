import { assert } from 'chai'
import { httpclient } from '../src/index'

describe('httpclient', () => {
  describe('newHttpClient', function () {
    it('should return an object', function () {
      const httpClient = httpclient.newHttpClient()
      assert.equal(typeof httpClient, 'object')
    })
  })
})
