angular.module('code-tutorial', ['ngMaterial', 'ui.ace'])
  .controller('robot-ctrl', function($scope, $interval, $mdSidenav, $timeout) {
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
      RobotTutorial.orientation = orientationEnum;
      var orientation = orientationEnum.UP;
      var orientationChangedListener = false;
      var positionChangedListener = false;
      function changeOrientation(newOrientation) {
        var direction = 0;
        if (newOrientation === 0 && orientation === 3) {
          direction = 1;
        } else if (newOrientation === 3 && orientation === 0) {
          direction = -1;
        } else if (newOrientation > orientation) {
          direction = 1;
        } else if (newOrientation < orientation) {
          direction = -1;
        }
        orientation = newOrientation;
        if (orientationChangedListener) {
          orient = RobotTutorial.cssRobotRotate[getOrientationString()];
          orientationChangedListener(RobotTutorial.genaralRobotClass +
            ' ' + orient,
            direction,
            size * currentCoords[0] + currentCoords[1]);
        }
      }
      function getOrientationString() {
        var orient;
        for (var prop in orientationEnum) {
          if (orientationEnum.hasOwnProperty(prop) &&
            orientation === orientationEnum[prop]) {
            orient = prop;
            break;
          }
        }
        return orient;
      }
      var actions = {
        makeStep: function() {
          var coords = getAccessibleTile("Cannot go out of the board");
          if (!coords) {
            return false;
          }
          var newCell = getTileAt(coords[0], coords[1]);
          if (newCell.apple) {
            alert('Can\'t go to apple');
            return false;
          }
          var finishAnimation;
          getTileAt(currentCoords[0], currentCoords[1]).switch(CellInfo.statusEnum.EMPTY);
          if (positionChangedListener) {
            positionChangedListener(orientation, function(callback) {
              finishAnimation = callback;
            });
          }
          newCell.switch(CellInfo.statusEnum.ROBOT);
          if (finishAnimation) {
            finishAnimation();
          }
          currentCoords = coords;
          return true;
        },
        turnRight: function() {
          changeOrientation((orientation + 1) % 4);
          return true;
        },
        turnLeft: function() {
          changeOrientation((orientation - 1 + 4) % 4);
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
      // var rollbackActions = {
      //   makeStep: function() {
      //
      //   },
      //   turnRight: actions.turnLeft,
      //   turnLeft: actions.turnRight,
      //   takeApple: function() {
      //
      //   }
      // };
      var interpretListener;
      var executedListener;
      var plugin = undefined;
      function execute() {
        var result = false;
        if (instructions.length) {
          commandsArray.length = 0;
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
          result = i === instructions.length;
          if (result) {
            alert("Congratulations! You have coped with the task!");
          } else {
            // for(i--; i >= 0; i--)
            // {
            //   rollbackActions[instructions[i]]();
            // }
          }
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

      function addInstruction(action) {
        if (instructions.length >= RobotTutorial.instructionLength) {
          endInterpretationStartExecution(false);
          alert("Ooops, too many instructions," +
            " Robot cannot do them all");
          return;
        }
        instructions.push(action);
      }
      function endInterpretationStartExecution(ok) {
        plugin.disconnect();
        plugin = undefined;
        if (interpretListener) {
          if (ok) {
            interpretListener(ok, execute);
          } else {
            interpretListener(ok);
          }
        } else if (ok) {
          execute();
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
          endInterpretationStartExecution(false);
          if (executedListener) {
            executedListener(false);
          }
        },
        __finish: function (nowTime) {
          elapsedTime = nowTime - elapsedTime;
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
        set onRobotOrientationChange(listener) {
          if (!listener || typeof listener === 'function') {
            orientationChangedListener = listener;
          }
        },
        get onRobotMove() {
          return positionChangedListener;
        },
        set onRobotMove(listener) {
          if (!listener || typeof listener === 'function') {
            positionChangedListener = listener;
          }
        },
        get onRobotOrientationChange() {
          return orientationChangedListener;
        },
        get api() {
          return api;
        },
        init: function(code) {
          plugin = new jailed.DynamicPlugin(prepareCode(code), api);
          plugin.whenConnected(function() {
            endInterpretationStartExecution(true);
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
    RobotTutorial.instructionLength = 500;
    RobotTutorial.stepMilisecs = 500;
    RobotTutorial.cssRobotRotate = {
      UP: 'up',
      RIGHT: 'right',
      BOTTOM: 'bottom',
      LEFT: 'left'
    };
    RobotTutorial.genaralRobotClass = 'robot';
    RobotTutorial.turnDirection = {
      RIGHT: 1,
      NONE: 0,
      LEFT: -1
    };
    $scope.run = function() {
      engine.init(code);
    };
    $scope.board = [];
    $scope.commands = [];
    var engine = new RobotTutorial($scope.board, 5, [3, 3], [[0, 1], [3, 4], [4, 2], [3, 4]], $scope.commands);
    engine.onRobotOrientationChange = function(newClass, direction, childnumber) {
      $scope.robotClass = newClass;
      var cells = $('.robot-cell .robot');
      if (!direction) {
        return;
      }
      var oldDegree = cells.css("-webkit-transform") ||
        cells.css("-moz-transform")    ||
        cells.css("-ms-transform")     ||
        cells.css("-o-transform")      ||
        cells.css("transform");
      oldDegree = parseInt(oldDegree.match(/-?[0-9]+deg/) ||
        cells[0].style.transform.match(/-?[0-9]+deg/)) || 0;
      if (direction > 0) {
        var newDegree = oldDegree + 90;
      } else {
        newDegree = oldDegree - 90;
      }
      cells.css({
        transform: 'rotate(' + newDegree + 'deg)'
      });
      // if artifact appears use solution below instead of cells.css + transition
  
      // $({deg: oldDegree}).animate({deg: newDegree}, {
      //   duration: RobotTutorial.stepMilisecs,
      //   step: function(now) {
      //     cells.css({
      //       transform: 'rotate(' + now + 'deg)'
      //     });
      //   }
      // });
    };
    engine.onRobotMove = function(orientation, finishAnimation) {
      debugger;
      var cells = $('.robot-cell .robot');
      var cellsContainer = $('.robot-cell').parent();
      var width = parseFloat(cells.css('width')) +
        convertToPx(cellsContainer.attr('md-gutter'), cellsContainer.css('width'), cells) + 'px';
      var height = parseFloat(cells.css('height')) +
        convertToPx(cellsContainer.attr('md-gutter'), cellsContainer.css('height'), cells) + 'px';
      var translate;
      switch (orientation) {
        case RobotTutorial.orientation.UP:
          translate = '0, ' + height;
          break;
        case RobotTutorial.orientation.RIGHT:
          translate = '-' + width + ', 0';
          break;
        case RobotTutorial.orientation.BOTTOM:
          translate = '0, -' + height;
          break;
        case RobotTutorial.orientation.LEFT:
          translate = width + ', 0';
          break;
      }
      cells.css({
        transform: '+=,translate(' + translate + ')',
        transition: 'all ' + RobotTutorial.stepMilisecs + ' ease-in'
      });
      finishAnimation(function() {
        var transform = cells.css('transform').replace(/translate\(-?[0-9]px[,\s*-?[0-9]px]\)/);
        cells.css({
          transform: transform
        });
      });
    };
    ///!!!! basis must be a number
    function convertToPx(value, basis, element) {
      basis = parseFloat(basis);
      var units = value.match(/[%a-zA-Z]+$/);
      value = parseFloat(value);
      switch (units) {
        case '%':
          value *= 0.01 * basis;
          break;
        case 'rem':
          value = convertRemToPixels(value);
          break;
        case 'em':
          value = convertEmToPixels(value, element);
          break;
      }
      return value;
      function convertRemToPixels(rem) {
        return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
      }
      function convertEmToPixels(em, element) {
        if (jQuery && element instanceof jQuery) {
          element = element[0];
        }
        return em * parseFloat(getComputedStyle(element.parentNode).fontSize);
      }
    }
    $scope.commandsId = 'commands';
    engine.onInterpretEnd = function(ok, execute) {
      if (ok) {
        $mdSidenav($scope.commandsId).open().then(function() {
            $timeout(execute, RobotTutorial.stepMilisecs);
          });
        $scope.openCommands = true;
      }
    };
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
// robot.turnRight();
// robot.takeApple();
// robot.turnRight();
// robot.makeStep();
// robot.turnRight();
// robot.takeApple();
// robot.makeStep();
// robot.turnRight();
// for (var i = 0; i < 4; i++) {
//   robot.makeStep();
// }
// robot.turnLeft();
// robot.takeApple();