var fs   = require('fs'),
    exec = require('child_process').exec,
    path = require('path'),
    os   = require('os'),
    util = require('util');

var redis = require("redis"),
    _     = require("underscore"),
    async = require("async");

function Agent(config){
  if(!_.isObject(config)){
    return console.error("Bad config");
  }

  this.nutcracker_config_file = config.nutcracker_config_file;
  this.redis_sentinel_ip      = config.redis_sentinel_ip;
  this.redis_sentinel_port    = config.redis_sentinel_port;
  this.restart_command        = config.restart_command;
}

Agent.prototype.log = function (message) {
  util.puts(message);
};

Agent.prototype.restart_nutcracker = function(callback){
  var self = this;
  var child = exec(
    this.restart_command,
    function(error, stdout, stderr) {
      self.log("Nutcracker restarted with output: " + stdout);

      if (error !== null) {
        self.log("Nutcracker failed restarting with error: " + error);
      }

      return callback();
    }
  );
};

Agent.prototype.update_nutcracker_config = function(data, callback){
  var old_content = fs.readFileSync(this.nutcracker_config_file, 'utf8');

  var new_content = old_content.replace(
    data.details["old-ip"]+":"+data.details["old-port"],
    data.details["new-ip"]+":"+data.details["new-port"]
  );

  fs.writeFileSync(this.nutcracker_config_file, new_content, 'utf8');

  this.log("Nutcracker config updated with new content: ");
  this.log(new_content);

  return callback();
};

Agent.prototype.switch_master_handler = function(){
  var self = this;

  return function(data) {

    self.log("Received switch-master: " + util.inspect(data));

    async.series([
      function(callback) { self.update_nutcracker_config(data, callback); },
      function(callback) { self.restart_nutcracker(callback); }
    ]);
  };
};

Agent.prototype.start_sentinel = function(){
  var handler = this.switch_master_handler();

  this.client = redis.createClient(
      this.redis_sentinel_port,
      this.redis_sentinel_ip
    );

  this.log("Subscribing to sentinel.");

  this.client.on("pmessage", function (p, ch, msg) {
    var aux = msg.split(' '),
    ret =  {
      'master-name': aux[0],
      'old-ip': aux[1],
      'old-port': aux[2],
      'new-ip': aux[3],
      'new-port': aux[4]
    };

    handler({details: ret});
  });
  this.client.psubscribe('+switch-master');
};

Agent.prototype.check_nutcracker_config = function(cb){
  fs.appendFile(this.nutcracker_config_file, "", cb);
};

Agent.prototype.bootstrap = function(){
  var self = this;

  this.check_nutcracker_config(
    function(error){
    if(error) {
      return console.error("Nutcracker config file: "+error);
    }

    return self.start_sentinel();
  }
  );
};

Agent.bootstrap = function (config) {
  (new Agent(config)).bootstrap();
};

module.exports = Agent;
