// Express 4 não encaminha rejeições de promises de handlers async para o
// middleware de erro sozinho — sem isto, um erro na BD deixa o pedido pendurado.
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
