const vm = require('vm');
const rollup = require('rollup');
const nodePolyfills = require('..');
const os = require('os');
const constants = require('constants');
const files = [
  'events.js',
  'url-parse.js',
  'url-file-url-to-path.js',
  'url-format.js',
  'stream.js',
  'assert.js',
  'constants.js',
  'os.js',
  'path.js',
  'string-decoder.js',
  'zlib.js',
  'domain.js'
];

describe('rollup-plugin-node-polyfills', function() {
  
  this.timeout(5000);

  files.forEach((file) => {
    it('works with ' + file, function (done) {
      rollup.rollup({
        input: 'test/examples/' + file,
        plugins: [
          nodePolyfills({
            include: null
          })
        ]
      })
      .then(bundle => bundle.generate({format: 'cjs'}))
      .then(generated => {
        const code = generated.output[0].code;
        const script = new vm.Script(code);
        const context = vm.createContext({
          done: done,
          setTimeout: setTimeout,
          clearTimeout: clearTimeout,
          console: console,
          _constants: constants,
          _osEndianness: os.endianness()
        });
        context.self = context;
        script.runInContext(context);
      })
      .catch(done)
    });
  })

  it('crypto option works (though is broken)', function(done) {
    rollup.rollup({
      input: 'test/examples/crypto-broken.js',
      plugins: [
        nodePolyfills({
          include: null,
          crypto: true
        })
      ]
    }).then(function() {
      done(new Error ('should not get here'))
    }, function (err) {
      if (err.code === 'MISSING_EXPORT' && err.binding === 'diffieHellman') {
        done();
        return;
      }
      done(err)
    });
  });
})
