var fs = require('fs'),
    child_process = require('child_process'),
    redis = require('redis');

function runLogged(name, command, args) {
  try { fs.mkdirSync('./spec/logs'); } catch (e) { }

  out = fs.openSync('./spec/logs/' + name + '.log', 'a');
  err = fs.openSync('./spec/logs/' + name + '.log', 'a');

  return child_process.spawn(command, args, { stdio: [ 'ignore', out, err ] });
}

describe("Twemproxy integration", function () {
  var sentinel, master, slave, agent;

  beforeEach(function () {
    try { fs.unlinkSync('./spec/support/status.txt'); } catch (e) { }

    master   = runLogged('master',   'redis-server', [ './spec/support/master.conf' ]);
    slave    = runLogged('slave',    'redis-server', [ './spec/support/slave.conf' ]);
    sentinel = runLogged('sentinel', 'redis-server', [ './spec/support/sentinel.conf',
                                                        '--sentinel' ]);

    agent = runLogged('agent', 'node', [ 'bin/redis_twemproxy_agent',
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
    var monitor = redis.createClient(46379, '127.0.0.1'),
        replicationStarted = false;

    monitor.on('error', function () { });

    waitsFor(function () {
      monitor.send_command('sentinel', ['slaves', 'master0'], function (err, data) {
        replicationStarted = data && data.length > 0;
      });
      return replicationStarted;
    });

    runs(function () {
      monitor.quit();
      master.kill();
    });

    waitsFor(function () {
      try {
        return fs.readFileSync('./spec/support/status.txt', 'ascii') == 'restarted';
      } catch (e) { }
    }, "twemproxy restart to be noted in status.txt", 30000);
  });
});
