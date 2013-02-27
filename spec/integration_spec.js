var fs = require('fs'),
    child_process = require('child_process');

describe("Twemproxy integration", function () {
  var sentinel, master, slave, agent;

  beforeEach(function () {
    try { fs.unlinkSync('./spec/support/status.txt'); } catch (e) { }
    master   = child_process.execFile('redis-server', [ './spec/support/master.conf' ]);
    slave    = child_process.execFile('redis-server', [ './spec/support/slave.conf' ]);
    sentinel = child_process.execFile('redis-server', [ './spec/support/sentinel.conf',
                                                        '--sentinel' ]);
    agent    = child_process.execFile('node', [ 'bin/redis_twemproxy_agent',
                                                 '-c', './spec/support/restart',
                                                 '-f', './spec/support/nutcracker.conf',
                                                 '-p', 46379 ]);
  });

  afterEach(function () {
    agent.kill();
    sentinel.kill();
    slave.kill();
    master.kill();
  });

  it("runs the restart command when switch-master occurs", function () {
    master.kill();
    waitsFor(function () {
      try {
        return fs.readFileSync('./spec/support/status.txt', 'ascii') == 'restarted';
      } catch (e) { }
    }, "twemproxy restart to be noted in status.txt", 5000);
  });
});
