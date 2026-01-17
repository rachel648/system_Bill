const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
    })
  );
  
  // Handle favicon separately
  app.use('/favicon.ico', (req, res, next) => {
    res.status(204).end();
  });
};