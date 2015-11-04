'use strict';

var EditablePartition = require('./editable-partition');

// CSS
require('normalize.css');
require('../styles/main.scss');


var affinity = new EditablePartition({
  el : "#content",
});

affinity.render();

module.exports = affinity;
