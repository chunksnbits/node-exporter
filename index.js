var q = require('q');
var fs = require('fs.extra');
var _ = require('lodash');

/*********************************************************
 * @name Exporter
 *
 * @options
 *   - cwd: The current working directory to base the
 *          filepath on
 *
 * @interface
 *  Exporter.export(filepath {string}, data {object}, config {object})
 *   - Writes a javascript (json) object to the
 *     specified filepath.
 *
 * @description
 *  Helper class for writing json data to the
 *  file system in various formats.
 *
 *  Currently supported:
 *    - JSON
 *    - CSV
 *    - XML
 *
 *********************************************************/
function Exporter(config) {
  this.config = _.extend({
    cwd: process.cwd()
  }, config);

  this.export = function(filepath, data) {
    var exchange = {
      filepath: filepath,
      cwd: this.config.cwd,
      data: data
    };

    return checkFiletype(exchange)
      .then(getOrCreateWorkingFilepath)
      .then(convertData)
      .then(writeFile);
  };

  // Checks the target set for the current process
  // and creates all required directories to store
  // the file.
  var getOrCreateWorkingFilepath = function(exchange) {
    exchange.outputFile = exchange.cwd + '/' + exchange.filepath;

    var outputPath = exchange.outputFile.replace(/\/([^\/]+)$/, '');

    var deferred = q.defer();
    if (!fs.existsSync(outputPath)) {
      fs.mkdirRecursive(outputPath, function(error) {
        if (error) {
          deferred.reject(error);
        }
        deferred.resolve(exchange);
      });
    } else {
      deferred.resolve(exchange);
    }

    return deferred.promise;
  };

  // Checks the filetype based on the
  // by looking at the file's ending.
  var checkFiletype = function(exchange) {
    exchange.filetype = parseFiletype(exchange.filepath);

    if (!exchange.filetype) {
      q.reject('Could not export data. The filetype "' + exchange.filetype + '" is not supported. Please specify an ending of: "' + _.keys(Exporter.strategies).join('", "') + '"');
    }

    return q(exchange);
  };

  // Calls the strategy determined after
  // evaluating the filetype and
  // converts the value into the given file
  // format.
  var convertData = function(exchange) {
    return Exporter.strategies[exchange.filetype]
      .convert(exchange.data)
      .then(function(convertedData) {
        exchange.data = convertedData;
        return exchange;
      });
  };

  // Writes the file to disk, using fs api.
  var writeFile = function(exchange) {
    var deferred = q.defer();

    fs.writeFile(exchange.filepath, exchange.data, function(error) {
      if (error) {
        deferred.reject(error);
      }
      deferred.resolve(exchange.filepath);
    });

    return deferred.promise;
  };

  // Extracts the ending
  // Rejects the current process if no
  // filetype could be recognized.
  var parseFiletype = function(filepath) {
    var matches = filepath.match(/\.([^.]*)$/);
    if (matches.length !== 2) {
      q.reject('Could not determine export type. Please specify a filetype ending on the "dest" attribute.');
    }

    return matches[1];
  };
}

Exporter.export = function(filepath, data, config) {
  return (new Exporter(config)).export(filepath, data);
};

/*********************************************************
 * @name Exporter.strategies
 *
 * @type Class
 *
 * @interface
 *  Exporter.strategies[strategie].export(
 *                filepath {string}, data {object})
 *
 *   - Writes a javascript (json) object to the
 *     specified filepath using the specified stragety
 *
 * @description
 *  Helper class for writing json data to the
 *  file system in various formats.
 *
 *  Currently supported:
 *    - JSON
 *    - CSV
 *    - XML
 *
 *********************************************************/
Exporter.strategies = {
  csv: {
    convert: function(data) {
      var converter = require('json-2-csv');

      var key = _.keys(data)[0];

      var deferred = q.defer();

      converter.json2csv(data[key], function(error, csv) {
        if (error) {
          deferred.reject(error);
        }
        deferred.resolve(csv);
      });

      return deferred.promise;
    }
  },
  json: {
    convert: function(data) {

      // Creating a json string is sufficient here.
      return q(JSON.stringify(data));
    }
  },
  xml: {
    convert: function(data) {

      var converter = require('easyxml');

      // Set layout and header options.
      // make sure singularizeChildren
      // is still the default, if api default changes.
      // Set root element from 'response' to 'data'.
      converter.configure({
        singularizeChildren: true,
        rootElement: 'data',
        indent: 2,
        manifest: true
      });

      return q(converter.render(data));
    }
  }
};

module.exports = Exporter;