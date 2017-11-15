angular.module('code-tutorial', ['ngMaterial'])
  .controller('robot-ctrl', function($scope) {
    function RobotTutorial() {
      var orientationEnum = {
        UP: 0,
        RIGHT: 1,
        BOTTOM: 2,
        LEFT: 3
      };
      var orientation = orientationEnum.UP;
      var actions = {
        makeStep: function() {
        
        },
        turnRight: function() {
        
        },
        turnLeft: function() {
        
        },
        takeObject: function() {
        
        }
      };
      var rollbackActions = {
        makeStep: function() {

        },
        turnRight: actions.turnLeft,
        turnLeft: actions.turnRight,
        takeObject: function() {

        }
      };
      var interpretListener;
      var executedListener;
      var plugin = undefined;
      function execute() {
        for (var i = 0; i < instructions.length; i++) {
          if (!actions[instructions[i]]()) {
            break;
          }
        }
        for (i--; i >= 0; i--) {
          rollbackActions[instructions[i]]();
        }
        if (executedListener) {
          executedListener(true);
        }
      }
      function alert(message) {
      
      }
      function buildClientPart(code) {
        return "var robot = {};\n" +
          "        for (var prop in application.remote) {\n" +
          "          if (prop[0] !== '_' && prop[1] !== '_') {\n" +
          "            robot[prop] = application.remote[prop];\n" +
          "          }\n" +
          "        }\n" +
          "        application.remote.__finish(application.remote.__getTime());" +
          code +
          "application.remote.__start(application.remote.__getTime());";
      }
      function prepareCode(code) {
        return "try {" + buildClientPart(code) + "} catch (ex) { application.remote.__handleError(" +
          "{" +
          "   name: ex.name, " +
          "   message: ex.message," +
          "   stack: ex.stack," +
          "   lineNumber: ex.lineNumber," +
          "   columnNumber: ex.columnNumber," +
          "   fileName: ex.fileName," +
          "   number: ex.number," +
          "   description: ex.description" +
          "}); }"
      }
      var instructions = [];
      RobotTutorial.instructionLength = 500;
      function addInstruction(action) {
        if (instructions.length >= RobotTutorial.instructionLength) {
          endInterpretation(false);
          alert("Ooops, too many instructions," +
            " Robot cannot do them all");
          return;
        }
        instructions.push(action);
      }
      function endInterpretation(ok) {
        plugin.disconnect();
        plugin = undefined;
        if (interpretListener) {
          interpretListener(ok);
        }
      }
      function extractLineAndColumn(stack) {
        //\sat\s(<?[a-zA-Z$_][$a-zA-Z0-9_]*>?)\s\(.+:([0-9]+:[0-9]+)\)\s
        // TODO: get readable stack
        return stack;
      }
      var elapsedTime;
      var api = {
        __getTime: performance.now,
        __start: function (nowTime) {
          elapsedTime = nowTime;
          instructions.length = 0;
        },
        __handleError: function (obj) {
          alert("You made an error :(", obj.name + ': ' +
            obj.message + "</br>" + obj.stack);
          endInterpretation(false);
          if (executedListener) {
            executedListener(false);
          }
        },
        __finish: function (nowTime) {
          elapsedTime = nowTime - elapsedTime;
          endInterpretation(true);
          execute();
        },
        makeStep: function() {
          addInstruction('makeStep');
        },
        turnLeft: function() {
          addInstruction('turnLeft');
        },
        turnRight: function() {
          addInstruction('turnRight');
        },
        takeObject: function() {
          addInstruction('takeObject');
        }
      };
      return {
        get api() {
          return api;
        },
        init: function(code) {
          plugin = new jailed.DynamicPlugin(prepareCode(code), api);
          plugin.whenConnected(function() {
            endInterpretation();
          });
        },
        set onExecuteEnd(listener) {
          if (!listener || typeof listener === 'function') {
            executedListener = listener;
          }
        },
        get onExecuteEnd() {
          return executedListener;
        },
        set onInterpretEnd(listener) {
          if (!listener || typeof listener === 'function' ) {
            interpretListener = listener;
          }
          execute();
        },
        get onInterpretEnd() {
          return interpretListener;
        }
      };
    }
    function Api() {
      this.up = function() {console.log('up');};
      this.down = function() {console.log('down');};
      this.left = function() {console.log('left');};
      this.right = function() {console.log('right');};
      this.error = function(errorObj) {console.error(errorObj);}
    }
    Api.prepareCode = function(code) {
      return "try {" + code + "} catch (ex) { application.remote.__handleError(" +
        "{" +
        "   name: ex.name, " +
        "   message: ex.message," +
        "   stack: ex.stack," +
        "   lineNumber: ex.lineNumber," +
        "   columnNumber: ex.columnNumber," +
        "   fileName: ex.fileName," +
        "   number: ex.number," +
        "   description: ex.description" +
        "}); }"
    };
    $scope.input = "window();";//application.remote.robot.up(); application.remote.robot.down(); for (var i = 0; i < 5; i++) application.remote.robot.left();";
    $scope.clickbtn = function(e) {
      var init = "";//"var robot = application.remote.robot; ";
      var plugin = new jailed.DynamicPlugin(Api.wrapCode($scope.input), new Api());
      plugin.whenConnected(function() {
        console.log(arguments, '+++');
        plugin.disconnect();
      });
      plugin.whenFailed(function() {
        console.log(arguments, '---');
      });
      plugin.whenDisconnected(function() {
        console.log(arguments, '\\\\\\');
      });
    };

  });