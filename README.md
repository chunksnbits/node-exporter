# node-exporter v.0.1.0

A simple node exporter to export json to json, csv or xml file.

## Getting Started
You may install this plugin with this command:

```shell
npm install node-exporter --save-dev
```
## Usage

The minimal setup for [node-exporter]() is as follows:

```
var exporter = require('node-exporter');

var data = [{
  a: 1,
  b: 2
}, {
  a: 11,
  b: 22
}];

exporter.export('target/dir/dest.json', data);
```

## Arguments

### Destination (dest {string})

The destination to write the exported file to. By default the path is assumed relative to the current process' current working directory.

Must specify an ending, detailing the format to export to. Formats currently supported are:

- JSON
- XML
- CSV (* data must be repeatable, e.g., hold the same keys for all objects of an array=

### Data (data {object})

The json data to export.

### Options

Allows to specify further options

`cwd`

Overwrites the default working directory from which to interprete the dest setting.

## License

node-scrape is licensed under the MIT License.