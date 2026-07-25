var http = require('http');

// Express 3 / send читают res._headers напрямую — это приватное свойство
// удалено из http.OutgoingMessage в современных версиях Node.js.
if (!Object.getOwnPropertyDescriptor(http.OutgoingMessage.prototype, '_headers')) {
  Object.defineProperty(http.OutgoingMessage.prototype, '_headers', {
    configurable: true,
    enumerable: true,
    get: function () {
      return this.getHeaders();
    }
  });
}
