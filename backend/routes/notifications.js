const makeCrudRouter = require('./crudFactory');
const Notification = require('../models/Notification');

module.exports = makeCrudRouter(Notification);
