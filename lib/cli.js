var cli = require('cli'),
    Agent = require('./agent');

cli.parse({
  host:    ['h', 'Redis sentinel hostname', 'string', '127.0.0.1'],
  port:    ['p', 'Redis sentinel port number', 'number', 26379],
  config:  ['f', 'Path to twemproxy config', 'path', '/etc/nutcracker.conf'],
  command: ['c', 'Command to restart twemproxy', 'string', 'restart nutcracker']
});

cli.main(function (args, options) {
  var config = { nutcracker_config_file: options.config,
                 redis_sentinel_ip: options.host,
                 redis_sentinel_port: options.port };

  Agent.bootstrap(config);
});
