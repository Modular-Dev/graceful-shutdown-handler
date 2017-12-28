'use strict';

const Bluebird = require('bluebird');
let cleanup;

module.exports = (() => {

  class GracefulShutdownHandler {
    constructor(_logger, _server){
      if(!_logger){
        throw new Error('You must supply a valid logger instance!');
      }
      if(!_server){
        throw new Error('Valid express server instance needs to be passed');
      }
      this.logger = _logger;
      this.server = _server;
      this.onExit = this.onExit.bind(this);
      this.initHandlers();
    }

    initHandlers() {
      this.server.on('error', err => {
        let port = this.server.address().port;
        if (err.syscall !== 'listen') {
          throw err;
        }
        switch (err.errno) {
          case 'EACCES':
            this.logger.error(`${port} requires elevated privileges `);
            process.exit(1);
            break;
          case 'EADDRINUSE':
            this.logger.error(`${port} is already in use`);
            process.exit(1);
            break;
          default:
            throw err;
        }
      });

      process.on('beforeExit', this.gracefulShutdown.bind(this, 'beforeExit'));
      process.once('SIGABRT', this.gracefulShutdown.bind(this, 'SIGABRT'));
      process.once('SIGQUIT', this.gracefulShutdown.bind(this, 'SIGQUIT'));
      process.once('SIGINT', this.gracefulShutdown.bind(this, 'SIGINT'));
      process.once('SIGTERM', this.gracefulShutdown.bind(this, 'SIGTERM'));
      process.once('uncaughtException', this.gracefulShutdown.bind(this, 'uncaughtException', 1));
      process.once('unhandledRejection', this.gracefulShutdown.bind(this, 'unhandledRejection', 1));
    }

    gracefulShutdown(_type, _code, _err) {
      this.logger.info('%s. Exiting...', _type);

      if (_err) {
        this.logger.error(_err);
      }

      let cleanupFunctions;
      // cleanup any resources
      if(cleanup) {
        cleanupFunctions = cleanup(_type);
      }else{
        cleanupFunctions = Bluebird.resolve();
      }

      if (!Array.isArray(cleanupFunctions)) {
        cleanupFunctions = [cleanupFunctions];
      }

      return Bluebird.all(cleanupFunctions)
        .tap(() => {
          this.logger.info('Graceful shutdown complete.');
        })
        .finally(() => {
          process.exit(_code);
        });

    }

    onExit(_callBack) {
      if (!_callBack) {
        throw new Error('No callback function supplied!');
      }
      if(!require('util').isFunction(_callBack)){
        throw new Error('Callback supplied is not a function');
      }
      cleanup = Bluebird.method(_callBack);
    }
  }

  return GracefulShutdownHandler;

})();