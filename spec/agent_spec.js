var Agent = require("../lib/agent.js");

describe("Redis Twemproxy Agent", function() {
  var agent;

  beforeEach(function () {
    agent = new Agent({nutcracker_config_file: './spec/support/nutcracker.config',
                       redis_sentinel_ip: '127.0.0.1',
                       redis_sentinel_port: 46379,
                       restart_command: './spec/support/restart'});
  });

  it("subscribes to master switch notifications");
  it("swaps old master information with new master information");
  it("restarts twemproxy");
});
