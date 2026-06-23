const makeCrudRouter = require('./crudFactory');
const Maintenance = require('../models/Maintenance');

module.exports = makeCrudRouter(Maintenance);
