angular.module('code-tutorial', ['ngMaterial', 'ui.ace', 'ngAnimate', 'angular-intro'])
  .config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
      .primaryPalette('teal')
      .accentPalette('deep-purple')
      .warnPalette('purple');
    $mdThemingProvider.theme('warn')
      .backgroundPalette('purple', {
        default: '100'
      }).primaryPalette('teal')
      .accentPalette('purple', {
        default: '800'
      }).warnPalette('deep-purple')
  })
  .controller('robot-ctrl', function($scope,
                                     $interval,
                                     $mdSidenav,
                                     $timeout,
                                     $mdDialog) {
    function CellInfo(status) {
      var object = {
        robot: false,
        apple: false,
        empty: false
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
            case CellInfo.statusEnum.EMPTY:
              this.empty = CellInfo.stubPngPath;
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
    CellInfo.stubPngPath = './app/images/stub.png';
    function RobotTutorial(tilesArray, size, robot, apples, commandsArray) {
      var currentCoords;
      var pristine = false;
      function initBoard() {
        if (pristine)
        {
          return;
        }
        for (var i = 0; i < size * size; i++) {
          tilesArray[i] = new CellInfo();
        }
        getTileAt(robot[0], robot[1]).switch(CellInfo.statusEnum.ROBOT);
        for (i = 0; i < apples.length; i++) {
          getTileAt(apples[i][0], apples[i][1]).switch(CellInfo.statusEnum.APPLE);
        }
        currentCoords = robot.slice();
        orientation = RobotTutorial.orientation.UP;
        if (orientationChangedListener) {
          orientationChangedListener(orientation, 0);
        }
      }
      initBoard();
      function getTileAt(row, column) {
        return tilesArray[row * size + column];
      }
      function setTileAt(row, column, value) {
        return tilesArray[row * size + column] = value;
      }
      
      var orientationEnum = RobotTutorial.orientation;
      RobotTutorial.orientation = orientationEnum;
      var orientation = orientationEnum.UP;
      var orientationChangedListener = false;
      var robotMovedListener = false;
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
          orientationChangedListener(orientation, direction);
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
          var coords = getAccessibleTile();
          if (!coords) {
            return "Cannot go out of the board";
          }
          var newCell = getTileAt(coords[0], coords[1]);
          if (newCell.apple) {
            return 'Can\'t step on the apple';
          }
          var oldCell = getTileAt(currentCoords[0], currentCoords[1]);
          if (robotMovedListener) {
            robotMovedListener(orientation, function(callback) {
              execute.finishAction = function() {
                oldCell.switch(CellInfo.statusEnum.EMPTY);
                callback();
                newCell.switch(CellInfo.statusEnum.ROBOT);
              }
            });
            if (!execute.finishAction) {
              oldCell.switch(CellInfo.statusEnum.EMPTY);
              newCell.switch(CellInfo.statusEnum.ROBOT);
            }
          } else {
            newCell.switch(CellInfo.statusEnum.ROBOT);
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
          var coords = getAccessibleTile();
          if (!coords) {
            return "Cannot take apple from out of the board";
          }
          var tile = getTileAt(coords[0], coords[1]);
          if (!tile.apple) {
            return "There is nothing to take in the cell";
          }
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
      var executed = false;
      function reloadCommands() {
        commandsArray.length = 0;
        for (var i = 0; i < instructions.length; i++) {
          commandsArray[i] = {command: instructions[i], executed: false};
        }
      }
      function execute() {
        var result = false;
        initBoard();
        executed = true;
        if (instructions.length) {
          reloadCommands();
          i = 0;
          var interval = $interval(function() {
            commandsArray[i].executed = true;
            if (execute.finishAction) {
              execute.finishAction();
            }
            delete execute.finishAction;
            var result = actions[instructions[i]]();
            if (result !== true) {
              $interval.cancel(interval);
              return finishExecution(false, result);
            }
            i++;
            if (i === instructions.length) {
              if (execute.finishAction) {
                $timeout(function() {
                  execute.finishAction();
                  delete execute.finishAction;
                  finishExecution(true, "Congratulations! You have coped with the task!");
                }, RobotTutorial.stepMilisecs);
              } else {
                finishExecution(true, "Congratulations! You have coped with the task!");
              }
            }
          }, RobotTutorial.stepMilisecs, instructions.length);
          pristine = false;
        }
      }
      function finishExecution(result, msg) {
        if (!result)
        {
          if (executedListener) {
            executedListener(result, msg);
          }
          return;
        }
        if (executedListener) {
          if (checkForCompletion()) {
            executedListener(result, msg);
          } else {
            executedListener(false, 'You didn\'t collect all the apples');
          }
        }
      }
      function checkForCompletion() {
        for (var i = 0; i < tilesArray.length; i++) {
          if (tilesArray[i].apple) {
            return false;
          }
        }
        return true;
      }
      function buildClientPart(code) {
        return "var robot = {};\n" +
          "        for (var prop in application.remote) {\n" +
          "          if (prop[0] !== '_' && prop[1] !== '_') {\n" +
          "            robot[prop] = application.remote[prop];\n" +
          "          }\n" +
          "        }\n" +
          "        application.remote.__start();" +
          code +
          "application.remote.__finish();";
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
          finishInterpretation(false, "Ooops, too many instructions," +
            " Robot cannot do them all");
          return;
        }
        instructions.push(action);
      }
      function finishInterpretation(ok, message) {
        plugin.disconnect();
        plugin = undefined;
        executed = false;
        if (interpretListener) {
          if (ok) {
            if (!instructions.length) {
              interpretListener(false, "Robot can't see any commands");
              return;
            }
            reloadCommands();
            interpretListener(ok, execute);
          } else {
            interpretListener(ok, message);
          }
        } else {
          if (ok) {
            execute();
          }
        }
      }
      function extractLineAndColumn(stack) {
        //\sat\s(<?[a-zA-Z$_][$a-zA-Z0-9_]*>?)\s\(.+:([0-9]+:[0-9]+)\)\s
        // TODO: get readable stack
        return stack;
      }
      var elapsedTime;
      var api = {
        __start: function () {
          elapsedTime = performance.now();
          instructions.length = 0;
        },
        __handleError: function (obj) {
          finishInterpretation(false, "You made an error :( ", obj.name + ': ' +
            obj.message);
          if (executedListener) {
            executedListener(false);
          }
        },
        __finish: function () {
          elapsedTime = performance.now() - elapsedTime;
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
          return robotMovedListener;
        },
        set onRobotMove(listener) {
          if (!listener || typeof listener === 'function') {
            robotMovedListener = listener;
          }
        },
        get onRobotOrientationChange() {
          return orientationChangedListener;
        },
        get api() {
          return angular.copy(api);
        },
        init: function(code) {
          try {
            plugin = new jailed.DynamicPlugin(prepareCode(code), api);
            plugin.whenConnected(function () {
              finishInterpretation(true);
            });
          } catch (e) {
            finishInterpretation(false, 'Ensure your code correctness');
          }
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
        },
        reset: function() {
          initBoard();
          commandsArray.length = 0;
          pristine = true;
        },
        get commandsNumber() {
          return commandsArray.length;
        },
        get elapsedTime() {
          return elapsedTime;
        }
      };
    }
    RobotTutorial.instructionLength = 500;
    RobotTutorial.animationLength = 500;
    RobotTutorial.stepMilisecs = 700;
    RobotTutorial.orientation = {
      UP: 0,
      RIGHT: 1,
      BOTTOM: 2,
      LEFT: 3
    };
    RobotTutorial.genaralRobotClass = 'robot';
    RobotTutorial.turnDirection = {
      RIGHT: 1,
      NONE: 0,
      LEFT: -1
    };
    $scope.isRunning = false;
    $scope.run = function() {
      if ($scope.hasRun) {
        engine.reset();
        closeCommands();
        $scope.hasRun = false;
      } else {
        $scope.isRunning = true;
        engine.init(code);
      }
    };
    $scope.board = [];
    $scope.commands = [];
    var engine = new RobotTutorial($scope.board, 5, [3, 3], [[0, 1], [3, 4], [4, 2], [3, 4]], $scope.commands);
    engine.onRobotOrientationChange = function(newClass, direction) {
      var robots = $('.robot-cell .robot');
      if (direction === 0) {
        var rotate;
        switch (newClass) {
          case RobotTutorial.orientation.UP:
            rotate = 0;
            break;
          case RobotTutorial.orientation.RIGHT:
            rotate = 90;
            break;
          case RobotTutorial.orientation.BOTTOM:
            rotate = 180;
            break;
          case RobotTutorial.orientation.LEFT:
            rotate = 270;
            break;
        }
        robots.css({ rotate: rotate });
      } else {
        robots.css({rotate: (direction < 0 ? '-' : '+') + '=90'});
      }
      // $scope.robotClass = newClass;
      // var cells = $('.robot-cell .robot');
      // if (!direction) {
      //   return;
      // }
      // var oldDegree = cells.css("-webkit-transform") ||
      //   cells.css("-moz-transform")    ||
      //   cells.css("-ms-transform")     ||
      //   cells.css("-o-transform")      ||
      //   cells.css("transform");
      // oldDegree = parseInt(oldDegree.match(/-?[0-9]+deg/) ||
      //   cells[0].style.transform.match(/-?[0-9]+deg/)) || 0;
      // if (direction > 0) {
      //   var newDegree = oldDegree + 90;
      // } else {
      //   newDegree = oldDegree - 90;
      // }
      // cells.css({
      //   transform: 'rotate(' + newDegree + 'deg)'
      // });
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
      var cells = $('.robot-cell');
      var robots = cells.find('.robot');
      var cellsContainer = cells.parent();
      var width = parseFloat(cells.css('width')) +
        convertToPx(cellsContainer.attr('md-gutter'), cellsContainer.css('width'), cells);
      var height = parseFloat(cells.css('height')) +
        convertToPx(cellsContainer.attr('md-gutter'), cellsContainer.css('height'), cells);
      // var options = {
      //   easing: 'in-out',
      //   duration: RobotTutorial.animationLength,
      //   y: -height
      // };
      // switch (orientation) {
      //   case RobotTutorial.orientation.UP:
      //     options.y = -height;
      //     break;
      //   case RobotTutorial.orientation.RIGHT:
      //     options.x = width;
      //     break;
      //   case RobotTutorial.orientation.BOTTOM:
      //     options.y = height;
      //     break;
      //   case RobotTutorial.orientation.LEFT:
      //     options.x = -width;
      //     break;
      // }
      // robots.transition(options);
      robots.css({
        translate: '0,' + -height
      });
      finishAnimation(function() {
        robots.css({
          translate: '0,0'
        });
      });
      // debugger;
      //
      // var transform = robots.css('transform');
      // if (transform === 'none') {
      //   transform = translate;
      // } else {
      //   transform += ', ' + translate;
      // }
      // finishAnimation(function() {
      //   // var transform = robots.css('transform').replace(/translate\(-?[0-9]px[,\s*-?[0-9]px]\)/, '');
      //   // robots.css({
      //   //   transform: transform
      //   // });
      // });
    };
    ///!!!! basis must be a number
    function convertToPx(value, basis, element) {
      basis = parseFloat(basis);
      var units = value.match(/[%a-zA-Z]+$/)[0];
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
    $scope.hasRun = false;
    var commandsTab = null;
    function closeCommands() {
      $scope.commandsPinned = false;
      commandsTab.onClose(function() {
        $scope.commandsPinned = false;
      });
      commandsTab.close();
    }
    $scope.isRunning = true;
    $mdSidenav($scope.commandsId, true).then(function(instance) {
      $scope.isRunning = false;
      commandsTab = instance;
    });
    $scope.closeCommands = closeCommands;
    engine.onInterpretEnd = function(ok, parameter) {
      if (ok) {
        var execute = parameter;
        $mdSidenav($scope.commandsId).open().then(function() {
            $timeout(execute, RobotTutorial.stepMilisecs);
          });
        $scope.commandsPinned = true;
      } else {
        var message = parameter;
        var alert = $mdDialog.alert({
          title: "Your code has errors :(",
          textContent: message,
          ok: 'Not good',
          theme: 'warn'
        });
        
        $mdDialog.show(alert);
        $scope.hasRun = true;
        $scope.isRunning = false;
      }
    };
    engine.onExecuteEnd = function(result, message) {
      var alert;
      if (result) {
        $mdDialog.show({
          templateUrl: './templates/successDialog.html',
          controller: function($scope, $mdDialog) {
            $scope.message = message;
            $scope.count = engine.commandsNumber;
            $scope.time = engine.elapsedTime;
            $scope.closeDialog = function() {
              $mdDialog.hide();
            };
          },
          clickOutsideToClose: false,
          parent: $('body')
        });
      } else {
        $mdDialog.show($mdDialog.alert({
          title: "Something went wrong",
          textContent: message,
          ok: 'Oh no',
          theme: 'warn'
        }));
      }
      $scope.hasRun = true;
      $scope.isRunning = false;
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
    
    
    ////////////////////////////help and tutorial
    var hintsOptions = {
      hints: [
        {
          element: '#helpTipsBtn',
          hint: 'Toggle helping tips'
        },
        {
          element: '#tutorialBtn',
          hint: 'Start tutorial'
        },
        {
          element: '#board',
          hint: 'It is your robot board!'
        },
        {
          element: '#editor',
          hint: '<p>Type your code here. Use commands</p>' +
          '<ul class="code">' +
          '<li><code>robot.makeStep()</code></li>' +
          '<li><code>robot.turnRight()</code></li>' +
          '<li><code>robot.turnLeft()</code></li>' +
          '<li><code>robot.takeApple()</code></li>' +
          '</ul>'
        },
        {
          element: '#runBtn',
          hint: 'Press this button to run code',
          hintPosition: 'top-left'
        }
      ]
    };
    $scope.tooltipsActive = false;
    var intro = introJs();
    intro.setOptions(hintsOptions);
    var openedHints = 0;
    intro.onhintclose(function() {
      openedHints--;
      if (!openedHints) {
        $scope.tooltipsActive = !$scope.tooltipsActive;
        $scope.$apply();
      }
    });
    var firstTime = true;
    $scope.showHelpTips = function(event) {
      if (!$scope.tooltipsActive) {
        if (firstTime) {
          firstTime = false;
          intro.addHints();
        } else {
          intro.showHints();
        }
        openedHints = hintsOptions.hints.length;
      } else {
        intro.hideHints();
      }
      $scope.tooltipsActive = !$scope.tooltipsActive;
    };
    $scope.introOptions = {
      steps: [
        {
          intro: "Hello, friend! Here you will help robot to collect apples!"
        },
        {
          element: '#editor',
          intro: "You will write code here"
        },
        {
          element: '#board',
          intro: "And see result here"
        },
        {
          element: '#editor',
          intro: "To make robot step write <code class=\"code\">robot.makeStep()</code>"
        },
        {
          element: '#editor',
          intro: "To turn robot right write <code class=\"code\">robot.turnRight()</code>"
        },
        {
          element: '#editor',
          intro: "To turn robot left write <code class=\"code\">robot.turnLeft()</code>"
        },
        {
          element: '#editor',
          intro: "To take apple write <code class=\"code\">robot.takeApple()</code>"
        },
        {
          element: '#runBtn',
          intro: "When you want to run your code press this button"
        },
        {
          element: '#board',
          intro: "Enjoy your result here!"
        },
        {
          element: '#tutorialBtn',
          intro: "If you want to repeat tutorial press this button"
        },
        {
          element: '#helpTipsBtn',
          intro: "Or you can turn on help tips"
        },
        {
          intro: "Now, try it! Use commands <code class=\"code\">robot.makeStep(), " +
          "robot.takeApple(), robot.turnRight(), robot.turnLeft()</code>"
        }
      ],
      hidePrev: true,
      hideNext: true,
      showStepNumbers: false,
      disableInteraction: true,
      exitOnOverlayClick: false
    };
  }).controller('landing-ctrl', function($scope) {
    $scope.currentView = 'index';
    $scope.goto = function(page) {
      switch (page) {
        case 'index':
          $scope.currentView = 'index';
          break;
        case 'about':
          $scope.currentView = 'about';
          break;
        case 'videos':
          $scope.currentView = 'videos';
          break;
      }
    }
    
  });

/*
robot.turnRight();
robot.takeApple();
robot.turnRight();
robot.makeStep();
robot.turnRight();
robot.takeApple();
robot.makeStep();
robot.turnRight();
for (var i = 0; i < 4; i++) {
  robot.makeStep();
}
robot.turnLeft();
robot.takeApple();
*/