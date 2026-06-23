const makeCrudRouter = require('./crudFactory');
const Contract = require('../models/Contract');

module.exports = makeCrudRouter(Contract);
