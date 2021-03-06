'use strict';

const Promise = require('bluebird') // Promise library
const expect = require('chai').expect // Assertion library

// Init API instance
const api = require('../index')({ version: 'v1.0' })

// NOTE: Set test to true
api._test = true;

let event = {
  httpMethod: 'get',
  path: '/test',
  body: {},
  headers: {
    'Content-Type': 'application/json'
  }
}

/******************************************************************************/
/***  DEFINE TEST MIDDLEWARE & ERRORS                                       ***/
/******************************************************************************/

api.use(function(req,res,next) {
  req.testMiddleware = '123'
  next()
});

api.use(function(err,req,res,next) {
  req.testError1 = '123'
  next()
});

api.use(function(err,req,res,next) {
  req.testError2 = '456'
  if (req.path === '/testErrorMiddleware') {
    res.header('Content-Type','text/plain')
    res.send('This is a test error message: ' + req.testError1 + '/' + req.testError2)
  } else {
    next()
  }
});

// Add error with promise/delay
api.use(function(err,req,res,next) {
  if (req.route === '/testErrorPromise') {
    let start = Date.now()
    Promise.try(() => {
      for(let i = 0; i<40000000; i++) {}
      return true
    }).then((x) => {
      res.header('Content-Type','text/plain')
      res.send('This is a test error message: ' + req.testError1 + '/' + req.testError2)
    })
  } else {
    next()
  }
});

/******************************************************************************/
/***  DEFINE TEST ROUTES                                                    ***/
/******************************************************************************/

api.get('/testError', function(req,res) {
  res.status(500)
  res.error('This is a test error message')
})

api.get('/testErrorThrow', function(req,res) {
  throw new Error('This is a test thrown error')
})

api.get('/testErrorSimulated', function(req,res) {
  res.status(405)
  res.json({ error: 'This is a simulated error' })
})

api.get('/testErrorMiddleware', function(req,res) {
  res.status(500)
  res.error('This test error message should be overridden')
})

api.get('/testErrorPromise', function(req,res) {
  res.status(500)
  res.error('This is a test error message')
})

/******************************************************************************/
/***  BEGIN TESTS                                                           ***/
/******************************************************************************/

describe('Error Handling Tests:', function() {

  this.slow(300);

  it('Called Error', async function() {
    let _event = Object.assign({},event,{ path: '/testError'})
    let result = await new Promise(r => api.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 500, body: '{"error":"This is a test error message"}', isBase64Encoded: false })
  }) // end it

  it('Thrown Error', async function() {
    let _event = Object.assign({},event,{ path: '/testErrorThrow'})
    let result = await new Promise(r => api.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 500, body: '{"error":"This is a test thrown error"}', isBase64Encoded: false })
  }) // end it

  it('Simulated Error', async function() {
    let _event = Object.assign({},event,{ path: '/testErrorSimulated'})
    let result = await new Promise(r => api.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 405, body: '{"error":"This is a simulated error"}', isBase64Encoded: false })
  }) // end it

  it('Error Middleware', async function() {
    let _event = Object.assign({},event,{ path: '/testErrorMiddleware'})
    let result = await new Promise(r => api.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'text/plain' }, statusCode: 500, body: 'This is a test error message: 123/456', isBase64Encoded: false })
  }) // end it

  it('Error Middleware w/ Promise', async function() {
    let _event = Object.assign({},event,{ path: '/testErrorPromise'})
    let result = await new Promise(r => api.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'text/plain' }, statusCode: 500, body: 'This is a test error message: 123/456', isBase64Encoded: false })
  }) // end it

}) // end ERROR HANDLING tests
