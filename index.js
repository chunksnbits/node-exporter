var q = require('q');
var fs = require('fs');
var _ = require('lodash');

/*********************************************************
 * @name Exporter
 *
 * @type Class
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

    return getOrCreateWorkingFilepath(exchange)
      .then(checkFiletype)
      .then(convertData)
      .then(writeFile);
  };

  var getOrCreateWorkingFilepath = function(exchange) {
    exchange.outputFile = cwd + '/' + exchange.filepath;

    var outputPath = outputFile.replace(/\/([^\/]+)$/, '');

    if (!fs.existsSync(outputPath)) {
      var deferred = q.defer();
      fs.mkdirRecursive(outputPath, function(error) {
        if (error) {
          deferred.reject(error);
        }
        deferred.resolve(exchange);
      });

      return deferred.promise;
    }

    return q(exchange);
  };

  var checkFiletype = function(exchange) {
    var filetype = parseFiletype(exchange.filepath);

    if (!filetype) {
      q.reject('Could not export data. The filetype "' + filetype + '" is not supported. Please specify an ending of: "' + _.keys(Exporter.strategies).join('", "') + '"');
    }

    return q(exchange);
  };

  var convertData = function(exchange) {
    return Exporter.strategies[filetype]
      .convert(exchange.data)
      .then(function(convertedData) {
        exchange.data = convertedData;
        return exchange;
      });
  };

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

  var parseFiletype = function(filepath) {
    var matches = filepath.match(/\.([^.]*)$/);
    if (matches.length !== 2) {
      throw new Error('Could not determine export type. Please specify a filetype ending on the "dest" attribute.');
    }

    return matches[1];
  };
}

Exporter.export = function(filepath, data, config) {
  return new Exporter(config).export(filepath, data);
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
      return q(JSON.stringify(data));
    }
  },
  xml: {
    convert: function(data) {
      var converter = require('easyxml');

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