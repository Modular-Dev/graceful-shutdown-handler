'use strict';

var sinon = require('sinon'),
  chai = require('chai'),
  logger = require('mod-dev-logger')({logId: 'graceful-shutdown-handler-test'}),
  ShutdownHandler = require('../lib');

var assert = chai.assert;
chai.should();


describe('Graceful Shutdown Handler', function () {
  describe('constructor', function () {
    it('should throw an error if no logger is provided', function () {
      var logger;
      assert.throws(()=> new ShutdownHandler(logger), Error,  'You must supply a valid logger instance!');
    });
    it('should throw an error if no server instance is provided', function () {
      var server;
      assert.throws(()=> new ShutdownHandler(logger), Error,  'Valid express server instance needs to be passed');
    });
  });

  describe('onExit', function () {
    before(function () {
      var app = require('express')()
      var server = app.listen(9191);
      this.shutdownHandler = new ShutdownHandler(logger, server);
    });

    after(function () {
      delete this.shutdownHandler;
    });

    it('should throw an error if no cleanup function is provided', function () {
      this.shutdownHandler.onExit.bind(this, null)
        .should.throw(Error, 'No callback function supplied!');
    });

    it('should not throw an error if a cleanup function is provided', function () {
      this.shutdownHandler.onExit.bind(this, sinon.spy())
        .should.not.throw(Error);
    });
  });
});
