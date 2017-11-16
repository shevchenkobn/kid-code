angular.module('code-tutorial', ['ngMaterial', 'ui.ace'])
  .controller('robot-ctrl', function($scope, $interval, $mdMenu) {
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
    function RobotTutorial(tilesArray, size, robot, apples, commandsArray) {
      var currentCoords;
      function initBoard() {
        for (var i = 0; i < size * size; i++) {
          tilesArray[i] = new CellInfo();
        }
        getTileAt(robot[0], robot[1]).switch(CellInfo.statusEnum.ROBOT);
        for (i = 0; i < apples.length; i++) {
          getTileAt(apples[i][0], apples[i][1]).switch(CellInfo.statusEnum.APPLE);
        }
        currentCoords = robot.slice();
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
          var coords = getAccessibleTile("Cannot go out of the board");
          if (!coords) {
            return coords;
          }
          //TODO: animate
          getTileAt(currentCoords[0], currentCoords[1]).switch(CellInfo.statusEnum.EMPTY);
          getTileAt(coords[0], coords[1]).switch(CellInfo.statusEnum.ROBOT);
          currentCoords = coords;
          return true;
        },
        turnRight: function() {
          orientation = (orientation + 1) % 4;
          //TODO: animate
          return true;
        },
        turnLeft: function() {
          orientation = (orientation - 1) % 4;
          //TODO: animate
          return true;
        },
        takeApple: function() {
          var coords = getAccessibleTile("Cannot take apple from out of the board");
          if (!coords) {
            return coords;
          }
          var tile = getTileAt(coords[0], coords[1]);
          if (!tile.apple) {
            alert("There is nothing to take the cell");
            return false;
          }
          //TODO: animate
          tile.switch(CellInfo.statusEnum.EMPTY);
          return true;
        }
      };
      function getAccessibleTile(message) {
        var coords = currentCoords.slice();
        switch (orientation) {
          case orientationEnum.UP:
            coords[0]--;
            break;
          case orientationEnum.RIGHT:
            coords[1]++;
            break;
          case orientationEnum.BOTTOM:
            coords[0]++;
            break;
          case orientationEnum.LEFT:
            coords[1]--;
            break;
        }
        if (coords[0] < 0 || coords[0] >= size ||
          coords[1] < 0 || coords[1] >= size)
        {
          alert(message);
          return false;
        }
        return coords;
      }
      var rollbackActions = {
        makeStep: function() {

        },
        turnRight: actions.turnLeft,
        turnLeft: actions.turnRight,
        takeApple: function() {

        }
      };
      var interpretListener;
      var executedListener;
      var plugin = undefined;
      function execute() {
        commandsArray.length = true;
        for (var i = 0; i < instructions.length; i++) {
          commandsArray[i] = {command: instructions[i], executed: false};
        }
        i = 0;
        var interval = $interval(function() {
          commandsArray[i].executed = true;
          if (!actions[instructions[i++]]()) {
            $interval.cancel(interval);
          }
        }, RobotTutorial.stepMilisecs, instructions.length);
        var result = i === instructions.length;
        if (result) {
          alert("Congratulations! You have coped with the task!");
        } else {
          // for(i--; i >= 0; i--)
          // {
          //   rollbackActions[instructions[i]]();
          // }
        }
        if (executedListener) {
          executedListener(result);
        }
      }
      function alert(message) {
        //TODO: output dialog
      }
      function buildClientPart(code) {
        return "var robot = {};\n" +
          "        for (var prop in application.remote) {\n" +
          "          if (prop[0] !== '_' && prop[1] !== '_') {\n" +
          "            robot[prop] = application.remote[prop];\n" +
          "          }\n" +
          "        }\n" +
          "        application.remote.__start(application.remote.__getTime());" +
          code +
          "application.remote.__finish(application.remote.__getTime());";
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
      RobotTutorial.stepMilisecs = 200;
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
        __getTime: window.performance.now.bind(performance),
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
        takeApple: function() {
          addInstruction('takeApple');
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
        },
        get onInterpretEnd() {
          return interpretListener;
        }
      };
    }
    $scope.run = function() {
      engine.init(code);
    };
    $scope.board = [];
    $scope.commands = [];
    var engine = new RobotTutorial($scope.board, 5, [3, 3], [[0, 1], [3, 4], [4, 2], [3, 4]], $scope.commands);
    engine.onInterpretEnd = function() {
      $scope.openCommands = true;
    };
    $scope.input = "";//application.remote.robot.up(); application.remote.robot.down(); for (var i = 0; i < 5; i++) application.remote.robot.left();";
    var code = "";
    function codeChanged(e) {
      code = e[1].getValue();
    }
    $scope.aceOptions = {
      onChange: codeChanged,
      onLoad: function(editor) {
        editor.setOptions({
          fontSize: '1.75rem'
        });
      },
      mode: 'javascript',
      theme: 'katzenmilch'
    };
  });