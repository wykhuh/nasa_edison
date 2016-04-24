var cylon = require("cylon");

// cylon.api({
//   host: "0.0.0.0",
//   port: "3000",
//   ssl: false
// });
//
cylon.robot({
  name: "doorbot",
  connections: {
    edison: { adaptor: "intel-iot" }
  },
  devices: {
    // digital sensors
    button: { driver: "button",        pin: 2, connection: "edison" },
    led:    { driver: "led",           pin: 3, connection: "edison" },
    servo:  { driver: "servo",         pin: 5, connection: "edison" },
    buzzer: { driver: "direct-pin",    pin: 7, connection: "edison" },
    touch:  { driver: "button",        pin: 8, connection: "edison" },
    // analog sensors
    dial:   { driver: "analogSensor",  pin: 0, connection: "edison" },
    temp:   { driver: "upm-grovetemp", pin: 1, connection: "edison" },
    sound:  { driver: "analogSensor",  pin: 2, connection: "edison" },
    light:  { driver: "analogSensor",  pin: 3, connection: "edison" },
    // i2c devices
    screen: { driver: "upm-jhd1313m1", connection: "edison" }
  },
  detectTemp: function() {
    var that = this;
    var deg = that.temp.value();
    console.log('temp', deg)
    if (deg >= 12) {
      that.writeMessage("Too hot!", "red");
      that.buzzer.digitalWrite(1);
      setTimeout(function() {
        that.reset(0);
      }, 200);
    }
  },
  detectSound: function(val) {
    var that = this;
    // console.log("Sound detected:", val)

    if (val >= 420) {
      console.log("Sound detected:", val)
      that.writeMessage("Sound detected", "blue");
      // that.led.turnOn();
      that.buzzer.digitalWrite(1);
      setTimeout(function() {
        that.buzzer.digitalWrite(0);
      }, 200);

      setTimeout(function() {
        that.reset();
      }, 500);
    }
  },
  // detectLight: function(val) {
  //   var that = this;
  //   var date = new Date();
  //   var currentHour = date.getHours();
  //   console.log("Light detected:", val)
  //
  //   if (val >= 450) {
  //     console.log("Light detected:", val)
  //     that.writeMessage("Light detected", "blue");
  //     that.led.turnOn();
  //     setTimeout(function() {
  //       that.reset();
  //     }, 500);
  //   }
  // },
//  turnLock: function(val) {
//    var that = this;
//    var currentAngle = that.servo.currentAngle();
//    var angle = val.fromScale(0, 1023).toScale(0,180) | 0;
//    if (angle <= currentAngle - 3 || angle >= currentAngle + 3) {
//      console.log("turning lock:", angle);
//      that.servo.angle(angle);
//    }
//  },
//  doorbell: function() {
//    var that = this;
//    that.buzzer.digitalWrite(1);
//    that.writeMessage("Doorbell pressed", "green");
//    setTimeout(function() {
//      that.reset();
//    }, 1000);
//  },
  writeMessage: function(message, color) {
    var that = this;
    var str = message.toString();
    while (str.length < 16) {
      str = str + " ";
    }
    console.log(message);
    that.screen.setCursor(0,0);
    that.screen.write(str);
    switch(color)
    {
      case "red":
        that.screen.setColor(255, 0, 0);
        break;
      case "green":
        that.screen.setColor(0, 255, 0);
        break;
      case "blue":
        that.screen.setColor(0, 0, 255);
        break;
      default:
        that.screen.setColor(255, 255, 255);
        break;
    }
  },
  reset: function() {
     this.writeMessage("Doorbot ready");
    this.led.turnOff();
    this.buzzer.digitalWrite(0);
  },
  work: function() {
    var that = this;
    that.reset();

//    that.button.on('push', function() {
//      that.led.turnOn();
//      that.writeMessage("Lights On", "blue");
//    });
//
//    that.button.on('release', function() {
//      that.reset();
//    });
//
//    that.dial.on('analogRead', function(val) {
//      that.turnLock(val);
//    });

    that.sound.on('analogRead', function(val) {
      that.detectSound(val);
    });

    // that.light.on('analogRead', function(val) {
    //   that.detectLight(val);
    // });

//    that.touch.on('push', function() {
//      that.doorbell();
//    });
//
    setInterval(function() {
      that.detectTemp();
    }, 1000);
  }
}).start();
