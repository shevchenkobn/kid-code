angular.module('code-tutorial', ['ngMaterial', 'ui.ace'])
  .controller('robot-ctrl', function($scope) {
    function CellInfo(status) {
      var object = {
        robot: false,
        apple: false
      };
      Object.defineProperty(object, 'switch', {
        value: function(status) {
          for (var prop in this) {
            if (this.hasOwnProperty(prop)) {
              this[prop] = false;
            }
          }
          switch (status) {
            case CellInfo.statusEnum.ROBOT:
              this.robot = CellInfo.robotPath;
              break;
            case CellInfo.statusEnum.APPLE:
              this.apple = CellInfo.applePath;
              break;
          }
        }
      });
      object.switch(status);
      return object;
    }
    CellInfo.statusEnum = {
      EMPTY: 0,
      ROBOT: 1,
      APPLE: 2
    };
    CellInfo.robotPath = './app/images/robot.png';
    CellInfo.applePath = './app/images/apple.svg';
    function RobotTutorial(tilesArray, size, robot, apples) {
      function initBoard() {
        for (var i = 0; i < size * size; i++) {
          tilesArray[i] = new CellInfo();
        }
        getTileAt(robot[0], robot[1]).switch(CellInfo.statusEnum.ROBOT);
        for (i = 0; i < apples.length; i++) {
          getTileAt(apples[i][0], apples[i][1]).switch(CellInfo.statusEnum.APPLE);
        }
      }
      initBoard();
      function getTileAt(row, column) {
        return tilesArray[row * size + column];
      }
      function setTileAt(row, column, value) {
        return tilesArray[row * size + column] = value;
      }
      
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
        debugger;
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
        return "debugger;" +
          "var robot = {};\n" +
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
        get robotOrientation() {
          return orientation;
        },
        get robotClass() {
          return RobotTutorial.cssRobotRotate[orientation];
        },
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
    RobotTutorial.instructionLength = 500;
    RobotTutorial.cssRobotRotate = {
      UP: 'robot-up',
      RIGHT: 'robot-right',
      BOTTOM: 'robot-bottom',
      LEFT: 'robot-left'
    };
    $scope.run = function() {
      engine.init(code);
    };
    $scope.board = [];
    var engine = new RobotTutorial($scope.board, 5, [3, 3], [[0, 1], [3, 4], [4, 2], [3, 4]]);
    $scope.robotClass = engine.robotClass;
    var code = "";
    function codeChanged(e) {
      code = e[1].getValue();
    }
    $scope.aceOptions = {
      onChange: codeChanged,
      mode: 'javascript',
      theme: 'katzenmilch'
    };
  });