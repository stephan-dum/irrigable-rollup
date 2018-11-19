const rollup = require("rollup");
const { Transform } = require("stream");
const applySourceMap = require("vinyl-sourcemaps-apply")

function mergeConfig(defaultConfig, fileConfig = {}) {
  let config = {};

  defaultConfig.forEach(function(value, key) {
    switch(toString.call(value)) {
      case "[object Object]":
        config[key] = Object.create(value);
        break;
      case "[object Array]":
        config[key] = value.slice();
        break;
      default:
        config[key] = value;
    }
  });

  for(var key in fileConfig) {
    let value = fileConfig[key];
    let curr = config[key];

    switch (toString.call(curr)) {
      case "[object Object]":
        Object.assign(curr, value);
        break;
      case "[object Array]":
        curr.push(...value);
        break;
      default:
        curr[key] = value;
    }
  }

  return config;
}

module.exports = function({ entry = {}, output = {} }) {

  /*entry options*/
  if(!entry.plugins) {
    entry.plugins = [];
  }

  if(!Array.isArray(entry.plugins)) {
    throw new TypeError(`entry.plugins must be of type array!`);
  }

  if(!entry.external) {
    entry.external = [];
  }

  if(!Array.isArray(entry.external)) {
    throw new TypeError(`entry.external must be of type array!`);
  }

  if(!entry.acorn) {
    entry.acorn = {};
  }

  if(typeof entry.acorn != "object") {
    throw new TypeError(`entry.acon must be of type object!`);
  }

  if(!entry.acornInjectPlugins) {
    entry.acornInjectPlugins = [];
  }

  if(!Array.isArray(entry.acornInjectPlugins)) {
    throw new TypeError(`entry.acornInjectPlugins must be of type array!`);
  }

  /*output options*/
  if(!output.globals) {
    output.globals = {}
  }

  if(typeof output.globals != "object") {
    throw new TypeError(`output.globals must be of type object!`)
  }

  if(!output.paths) {
    output.paths = {}
  };

  if(typeof output.paths != "object") {
    throw new TypeError(`output.paths must be of type object!`);
  }

  let entryConfig = new Map(Object.entries(entry));
  let outputConfig = new Map(Object.entries(output));

  return function() {
    return new Transform({
      objectMode : true,
      transform(file, encoding, callback) {

        let entry = mergeConfig(entryConfig, file.config);

        entry.input = file.path;

        return rollup.rollup(entry).then(function(bundle) {
          let output = mergeConfig(outputConfig, file.output);

          bundle.generate(output).then(function({ code, map }) {
            if(map) {
              applySourceMap(file, map);
            }

            Object.assign(file, {
              contents : new Buffer(code),
              dependencies : [].concat(
                ...bundle.modules.map(module => module.dependencies)
              )
            });


            callback(null, file);
          })
        }, callback)
      }
    })
  }
}
