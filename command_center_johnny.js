// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

// Azure IoT packages
var Protocol = require('azure-iot-device-amqp').Amqp;
// Uncomment one of these transports and then change it in fromConnectionString to test other transports
// var Protocol = require('azure-iot-device-amqp-ws').AmqpWs;
// var Protocol = require('azure-iot-device-http').Http;
// var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
var ConnectionString = require('azure-iot-device').ConnectionString;

// cylon
var cylon = require('cylon');
var deg;

// Edison packages
var five = require("johnny-five");
var Edison = require("edison-io");
var board = new five.Board({
  io: new Edison()
});

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
var connectionString = 'HostName=nasa2016-iot-wyk.azure-devices.net;DeviceId=edison-nasa2016;SharedAccessKey=7wR6aVyF+lDuttBMMyaSQseWVBZj3+b3NiTBIovpmkM=';

// Retrieve the deviceId from the connectionString
var deviceId = ConnectionString.parse(connectionString)["DeviceId"];


// fromConnectionString must specify a transport constructor, coming from any transport package.
var client = Client.fromConnectionString(connectionString, Protocol);

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}

board.on("ready", function() {
  var temp = new five.Temperature({
    pin: "A0",
    controller: "GROVE"
  });

  var led = new five.Led(8);

  var turnFanOn = function () {
    led.on();
  };

  var turnFanOff = function() {
    led.off();
  };

  var setAirResistance = function(position) {
    console.log("Setting Air Resistance Position to " + position);
  };

  var connectCallback = function (err) {
    if (err) {
      console.error('Could not connect: ' + err.message);
    } else {
      console.log('Client connected');
      client.on('message', function (msg) {
        console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
        try {
          var command = msg.data;
          switch(command.Name) {
            case 'TurnFanOn':
              turnFanOn();
              break;
            case 'TurnFanOff':
              turnFanOff();
              break;
            case 'SetAirResistance':
              setAirResistance(command.Parameters.Position);
              break;
            default:
              console.error('Unknown command received');
              break;
          }

          client.complete(msg, printResultFor('complete'));
        }
        catch (err) {
          printResultFor('parse received message')(err);
          client.reject(msg, printResultFor('reject'));
        }
      });

      // Create a message and send it to the IoT Hub every second
      var sendInterval = setInterval(function () {
        var data = JSON.stringify({
          DeviceId: deviceId,
          EventTime: new Date().toISOString(),
          Mtemperature: temp.celsius
        });

        var message = new Message(data);
        console.log('Sending message: ' + message.getData());
        client.sendEvent(message, printResultFor('send'));
      }, 5000);

      client.on('error', function (err) {
        console.error(err.message);
      });

      client.on('disconnect', function () {
        clearInterval(sendInterval);
        client.removeAllListeners();
        client.connect(connectCallback);
      });
    }
  };

  client.open(connectCallback);
});



cylon.robot({
  name: 'doorbot',
  connections: {
    edison: { adaptor: 'intel-iot' }
  },
  devices: {
    // digital sensors
    button: { driver: 'button',        pin: 2, connection: 'edison' },
    led:    { driver: 'led',           pin: 3, connection: 'edison' },
    servo:  { driver: 'servo',         pin: 5, connection: 'edison' },
    buzzer: { driver: 'direct-pin',    pin: 7, connection: 'edison' },
    touch:  { driver: 'button',        pin: 8, connection: 'edison' },
    // analog sensors
    dial:   { driver: 'analogSensor',  pin: 0, connection: 'edison' },
    temp:   { driver: 'upm-grovetemp', pin: 1, connection: 'edison' },
    sound:  { driver: 'analogSensor',  pin: 2, connection: 'edison' },
    light:  { driver: 'analogSensor',  pin: 3, connection: 'edison' },
    // i2c devices
    screen: { driver: 'upm-jhd1313m1', connection: 'edison' }
  },
  detectTemp: function () {
    var that = this;
    deg = that.temp.value();
    // console.log('temp', deg)
    if (deg >= 12) {
      that.writeMessage('Too hot!', 'red');
      that.buzzer.digitalWrite(1);
      setTimeout(function () {
        that.reset(0);
      }, 200);
    }
  },
  detectSound: function (val) {
    var that = this;
    // console.log('Sound detected:', val)

    if (val && val >= 500) {
      console.log('Sound detected:', val)
      that.writeMessage('Sound detected', 'blue');
      that.buzzer.digitalWrite(1);
      setTimeout(function () {
        that.reset();
      }, 200);
    }
  },

  writeMessage: function (message, color) {
    var that = this;
    var str = message.toString();
    while (str.length < 16) {
      str = str + ' ';
    }
    console.log(message);
    that.screen.setCursor(0, 0);
    that.screen.write(str);
    switch (color) {
      case 'red':
        that.screen.setColor(255, 0, 0);
        break;
      case 'green':
        that.screen.setColor(0, 255, 0);
        break;
      case 'blue':
        that.screen.setColor(0, 0, 255);
        break;
      default:
        that.screen.setColor(255, 255, 255);
        break;
    }
  },
  reset: function () {
   this.writeMessage('Doorbot ready');
    this.led.turnOff();
    this.buzzer.digitalWrite(0);
  },
  work: function () {
    var that = this;
    that.reset();

//    that.button.on('push', function() {
//      that.led.turnOn();
//      that.writeMessage('Lights On', 'blue');
//    });
//
//    that.button.on('release', function() {
//      that.reset();
//    });
//
//    that.dial.on('analogRead', function(val) {
//      that.turnLock(val);
//    });

    that.sound.on('analogRead', function (val) {
      that.detectSound(val);
    });

    // that.light.on('analogRead', function(val) {
    //   that.detectLight(val);
    // });

//    that.touch.on('push', function() {
//      that.doorbell();
//    });
//
    setInterval(function () {
      that.detectTemp();
    }, 1000);
  }
}).start();
