
const Error = Object.freeze({ 
    CABOOSE_PRESENT: 0, 
    SINGLE_CABOOSE: 1, 
    ENGINE_NEEDED: 2, 
    TENDER_NEEDED: 3, 
    ENGINE_PRESENT: 4, 
    TENDER_PRESENT: 5, 
    TENDER_BEFORE_HELPER: 6,
    TENDER_BEFORE_CARS: 7,
    HELPER_PRESENT: 8,
    NONE: 9,
    UNCHECKED: 10
}); 

const TrainError = Object.freeze({
    SHORTAGE: 0,
    CRASH: 1
});

const HS_KEY = 'trainGame_highScores';

class HighScores {
  constructor() {
    const saved = localStorage.getItem(HS_KEY);
    const d = saved ? JSON.parse(saved) : {};
    // Train-level records (absolute values)
    this.longestTrain      = d.longestTrain      ?? 0;
    this.mostValuableTrain = d.mostValuableTrain  ?? 0;
    this.highestSingleTurn = d.highestSingleTurn  ?? 0;
    this.highestAverage    = d.highestAverage     ?? 0;
    this.biggestComeback   = d.biggestComeback    ?? 0;
    // Game-level records stored as rate per turn (so different round counts compare fairly)
    this.freightRate  = d.freightRate  ?? 0;
    this.cabooseRate  = d.cabooseRate  ?? 0;
    this.perfectRate  = d.perfectRate  ?? 0;
    this.bonusRate    = d.bonusRate    ?? 0;
    this.failureRate  = d.failureRate  ?? 0;
  }

  save() {
    localStorage.setItem(HS_KEY, JSON.stringify({
      longestTrain:      this.longestTrain,
      mostValuableTrain: this.mostValuableTrain,
      highestSingleTurn: this.highestSingleTurn,
      highestAverage:    this.highestAverage,
      biggestComeback:   this.biggestComeback,
      freightRate:       this.freightRate,
      cabooseRate:       this.cabooseRate,
      perfectRate:       this.perfectRate,
      bonusRate:         this.bonusRate,
      failureRate:       this.failureRate,
    }));
  }

  // Update with results from a completed single-player game.
  // Returns an object flagging which fields are new records.
  update(player, totalRounds) {
    const records = {};
    const avg = player.getAverageScore();
    const comeback = player.getComebackScore();
    const failures = player.equipmentShortages + player.derailments;
    const fRate  = player.freightTrains / totalRounds;
    const cRate  = player.cabooseCount  / totalRounds;
    const pRate  = player.perfectTrains / totalRounds;
    const bRate  = player.bonusTrains   / totalRounds;
    const failR  = failures             / totalRounds;

    if(player.longestTrain > this.longestTrain)           { this.longestTrain = player.longestTrain;           records.longestTrain = true; }
    if(player.mostValuableTrain > this.mostValuableTrain) { this.mostValuableTrain = player.mostValuableTrain; records.mostValuableTrain = true; }
    if(player.highestSingleTurn > this.highestSingleTurn) { this.highestSingleTurn = player.highestSingleTurn; records.highestSingleTurn = true; }
    if(avg > this.highestAverage)                         { this.highestAverage = avg;                         records.highestAverage = true; }
    if(comeback > this.biggestComeback)                   { this.biggestComeback = comeback;                   records.biggestComeback = true; }
    if(fRate  > this.freightRate)  { this.freightRate  = fRate;  records.freightRate  = true; }
    if(cRate  > this.cabooseRate)  { this.cabooseRate  = cRate;  records.cabooseRate  = true; }
    if(pRate  > this.perfectRate)  { this.perfectRate  = pRate;  records.perfectRate  = true; }
    if(bRate  > this.bonusRate)    { this.bonusRate    = bRate;  records.bonusRate    = true; }
    if(failR  > this.failureRate)  { this.failureRate  = failR;  records.failureRate  = true; }

    this.save();
    return records;
  }

  reset() {
    localStorage.removeItem(HS_KEY);
    this.longestTrain = 0; this.mostValuableTrain = 0; this.highestSingleTurn = 0;
    this.highestAverage = 0; this.biggestComeback = 0;
    this.freightRate = 0; this.cabooseRate = 0; this.perfectRate = 0;
    this.bonusRate = 0; this.failureRate = 0;
  }
}

const highScores = new HighScores();

class Player {
  constructor(name) {
    this.name = name;
    this.trainValues = [];
    this.totalScore = 0;
    this.longestTrain = 0;
    this.mostValuableTrain = 0;
    this.equipmentShortages = 0;
    this.derailments = 0;
    this.freightTrains = 0;
    this.cabooseCount = 0;
    this.perfectTrains = 0;
    this.bonusTrains = 0;
    this.successfulTrains = 0;
    this.highestSingleTurn = 0;
    this.firstTrainScore = null;
    this.lastTrainScore = null;
  }

  addTrain(value, trainLength = 0, hasHelper = false, hasCaboose = false, usedAllDice = false, isBonus = false) {
    if(value == TrainError.SHORTAGE) {
      this.equipmentShortages++;
      this.trainValues.push('Equipment Shortage');
    } else if(value == TrainError.CRASH) {
      this.derailments++;
      if(hasHelper) {
        this.trainValues.push('Train Wreck');
      } else {
        this.trainValues.push('Derailment');
      }
    } else {
      this.totalScore += value;
      this.trainValues.push(value);
      this.successfulTrains++;

      if(this.firstTrainScore === null) {
        this.firstTrainScore = value;
      }
      this.lastTrainScore = value;

      if(trainLength > this.longestTrain) {
        this.longestTrain = trainLength;
      }
      if(value > this.mostValuableTrain) {
        this.mostValuableTrain = value;
      }
      if(value > this.highestSingleTurn) {
        this.highestSingleTurn = value;
      }
      if(hasHelper) {
        this.freightTrains++;
      }
      if(hasCaboose) {
        this.cabooseCount++;
      }
      if(usedAllDice) {
        this.perfectTrains++;
      }
      if(isBonus) {
        this.bonusTrains++;
      }
    }
  }

  getAverageScore() {
    return this.successfulTrains > 0 ? Math.round(this.totalScore / this.successfulTrains) : 0;
  }

  getComebackScore() {
    if(this.firstTrainScore === null || this.lastTrainScore === null) return 0;
    return this.lastTrainScore - this.firstTrainScore;
  }
}

class TurnStatus {
  constructor() {
    this.self = this;
    this.roll_count = 0;
    this.cars_added_this_roll = false;
    this.available_cars = false;
  }
}

class Game {
  constructor() {
    this.playerIndex = 0;
    this.players = [];
    this.totalRounds = 10;
    this.currentRound = 1;
    this.skipSummary = false;
    this.turnStatus = new TurnStatus();
  }

  addPlayer(p) {
    this.players.push(p);
  }

  getCurrentPlayer() {
    return this.players[this.playerIndex];
  }

  nextPlayer() {
    this.playerIndex = (this.playerIndex + 1) % this.players.length;

    // If we've cycled back to player 0, increment the round
    if(this.playerIndex === 0) {
      this.currentRound++;
    }
  }

  isGameOver() {
    return this.currentRound > this.totalRounds;
  }

  getWinners() {
    if(this.players.length === 0) return [];

    let maxScore = Math.max(...this.players.map(p => p.totalScore));
    let winners = this.players.filter(p => p.totalScore === maxScore);
    return winners;
  }

  getSortedPlayers() {
    return [...this.players].sort((a, b) => b.totalScore - a.totalScore);
  }
}

class Train {
  constructor(train) {
    this.engine = train == null ? false : train.engine;
    this.tender = train == null ? false : train.tender;
    this.helper = train == null ? false : train.helper;
    this.caboose = train == null ? false : train.caboose;

    this.car = train == null ? [] : [...train.car];
  }

  isValidNextCar(car) {
    //return Error.NONE;

    if(car == 6) { 
      if(this.helper) {
        return Error.HELPER_PRESENT;
      } else if(this.engine && !this.tender) {
        return Error.TENDER_BEFORE_HELPER;
      } else if(this.caboose) {
        return Error.CABOOSE_PRESENT;
      }
    }
    else if(car == 5) {
      if(!this.engine) {
        return Error.ENGINE_NEEDED;
      } else if(this.tender) {
        return Error.TENDER_PRESENT;
      }
    }
    else if(car == 1) {
      if(!this.engine) {
        return Error.ENGINE_NEEDED; 
      } else if(!this.tender) {
        return Error.TENDER_NEEDED;
      } else if(this.caboose) {
        return Error.SINGLE_CABOOSE;
      }
    }
    else {
      if(this.caboose) {
         return Error.CABOOSE_PRESENT;
      } else if(!this.engine) {
        return Error.ENGINE_NEEDED;
      } else if(!this.tender) {
        return Error.TENDER_NEEDED;
      }
    }

    return Error.NONE;
  }

  addCar(car) {
    if(car == 6) {
      if(this.engine == false) {
        this.engine = true;
      } else {
        this.helper = true;
      }
    } else if(car == 5) {
      this.tender = true;
    } else if(car == 1) {
      this.caboose = true;
      this.car.push(car);
    } else {
      this.car.push(car);
    }
  }

  addCars(carList) {
    carList.sort()
    carList.reverse();

    for(let i=0; i<carList.length; i++) {
      this.addCar(carList[i]);
    }
  }
  
  getScore() {
    let score = 0;
    this.bonus = false;

    for(let i=0; i<this.car.length; i++) {
      score += this.car[i];
    }

    if(this.caboose) {
      score = score * 2;
    }

    if(this.car.length == 4 && this.car.includes(1) && this.car.includes(2) && this.car.includes(3) && this.car.includes(4)) {
      score = 25;
      this.bonus = true;
    }

    return score;
  }

}

class Die {
  constructor(val) {
    this.value = (val >=1 && val <=6) ? val : 1;
    this.selected = false;
    this.error = Error.NONE;
    this.visible = false;
  }

  roll() {
    this.value = Math.floor(Math.random() * 6) + 1;
    this.selected = false;
    this.error = Error.NONE;
    this.visible = false;
  }

  reset() {
    this.use();
  }

  use() {
    this.selected = false;
    this.error = Error.NONE;
    this.visible = false;
  }
}

class Dice {
  constructor() {
    this.total = 0;
    this.limit = 6;
    this.hasEngine = false;
    this.hasTender = false;

    this.die = [];
    for(let i=0; i<6; i++) {
      this.die.push(new Die(6-i));
    }
  }

  roll() {
    this.hasEngine = false;
    this.hasTender = false;

    if(this.total == 0) {
      this.total = this.limit;
    }

    for(let i=0; i<6; i++) {
      this.die[i].roll();
      this.die[i].visible = (i < this.total);
      
      if(this.die[i].visible && this.die[i].value == 6) {
        this.hasEngine = true;
      } else if(this.die[i].visible && this.die[i].value == 5) {
        this.hasTender = true;
      } 
    }
  }

  select(i) { 
    this.die[i].selected = !this.die[i].selected;

    return this.die[i].selected;
  }

  getError(i) {
    return this.die[i].error;
  }

  useSelected() {
    let index = [];
    for(let i=0; i<6; i++) {
      if(this.die[i].selected && this.die[i].visible && this.die[i].error == Error.NONE) {
        this.die[i].use();
        index.push(i);
        this.total--;
      }
    }

    return index;
  }

  visibleDieList() {
    let index = [];

    for(let i=0; i<6; i++) {
      if(this.die[i].visible) {
        index.push(i);
      }
    }

    return index;
  }
}


class View {
  constructor() {
    this.self = this;
    this.diceModel = new Dice();
    this.train = new Train();	
    this.game = new Game();
  }

  initialize() {
    // required to reference members from within event listeners (this is no longer the view)
    let self = this;

    // Container divs
    this.hero_div = document.getElementById('hero');
    this.settings_div = document.getElementById('settings');
    this.dice_area_div = document.getElementById('dice_area');
    this.score_card_div = document.getElementById('score_card');
    this.end_game_card_div = document.getElementById('end_game_card');
    this.table_div = document.getElementById('table');

    // Current player divs
    this.current_player_name_div = document.getElementById('current_player_name');
    this.current_player_status_div = document.getElementById('current_player_status');
    this.current_player_hint_div = document.getElementById('current_player_hint');

    // Buttons
    this.start_game_button = document.getElementById('start_game_button');
    this.start_game_button.addEventListener('click', function() { self.startGame(); });

    this.roll_button = document.getElementById('roll_button');
    this.roll_button.addEventListener('click', function() { self.roll(); });

    this.add_car_button = document.getElementById('add_car_button');
    this.add_car_button.addEventListener('click', function() { self.addCars(); });

    this.end_turn_button = document.getElementById('end_turn_button');
    this.end_turn_button.addEventListener('click', function() { self.endTurn(); });


    // Dice divs
    this.die = [];
    for(let i=0; i<6; i++) {
      let d = document.getElementById('die_' + (i+1));

      d.addEventListener('click', function() { self.selectDie(i); });

      d.addEventListener('mouseenter', function() {
        //self.current_player_hint_div.innerHTML = this.id + ' ' + self.diceModel.getError(i);
        self.setDieErrorMessage(self.diceModel.getError(i));
      });

      d.addEventListener('mouseleave', function() {
        self.current_player_hint_div.innerHTML = '';
      });

      this.die.push(d);      
    }

    // Train divs
    this.display_engine = document.getElementById('engine');
    this.display_helper = document.getElementById('helper');
    this.display_tender = document.getElementById('tender');
    this.displayed_train_div = [];
    for(let i=0; i<37; i++) {
      this.displayed_train_div.push(document.getElementById('car_' + i));
    }

    // Current divs
    this.current_train_score_span = document.getElementById('current_train_score');

    // Footer
    document.getElementById('clear_data_link').addEventListener('click', function(e) {
      e.preventDefault();
      if(confirm('Clear all saved high scores?')) {
        highScores.reset();
      }
    });
  }

  setDefaultMessage() {
    this.current_player_hint_div.innerHTML = '';
  }

  updateCurrentPlayerDisplay() {
    let player = this.game.getCurrentPlayer();
    let turnNumber = player.trainValues.length + 1;
    this.current_player_name_div.innerHTML = player.name;

    // Update status message based on game state
    if(this.game.turnStatus.roll_count === 0) {
      this.current_player_status_div.innerHTML = `Round ${this.game.currentRound} - Train ${turnNumber} (Roll 1 of 3)`;
    } else if(!this.train.engine) {
      this.current_player_status_div.innerHTML = `Add an engine and tender (Roll ${this.game.turnStatus.roll_count} of 3)`;
    } else if(!this.train.tender) {
      this.current_player_status_div.innerHTML = `Add a tender (Roll ${this.game.turnStatus.roll_count} of 3)`;
    } else {
      this.current_player_status_div.innerHTML = `Add cargo to build your train...`;
    }
  }

  getDieErrorMessage(errorId) {
    if(errorId == Error.CABOOSE_PRESENT) {
      return 'Cannot add additional cargo after a caboose';
    } else if(errorId == Error.SINGLE_CABOOSE) {
      return 'Only one caboose allowed per train';
    } else if(errorId == Error.ENGINE_NEEDED) {
      return 'Trains must begin with an engine';
    } else if(errorId == Error.TENDER_NEEDED) {
      return 'An engine must be followed by a tender';
    } else if(errorId == Error.ENGINE_PRESENT) {
      return 'ENGINE_PRESENT';
    } else if(errorId == Error.TENDER_PRESENT) {
      return 'Only one tender allowed per train';
    } else if(errorId == Error.TENDER_BEFORE_HELPER) {
      return 'A tender must be added before a helper engine';
    } else if(errorId == Error.TENDER_BEFORE_CARS) {
      return 'A tender must be added before cargo';
    } else if(errorId == Error.HELPER_PRESENT) {
      return 'Freight trains cannot have more than two engines';
    } else if(errorId == Error.NONE) {
      return 'No error here!  You should not see this message...';
    } else if(errorId == Error.UNCHECKED) {
      return 'This die has not been evaluated.  Something went wrong...';
    }
    
    return 'Error: Unknown error!';
  }

  setDieErrorMessage(errorId) {
    if(errorId != Error.NONE) {
      this.current_player_hint_div.innerHTML = this.getDieErrorMessage(errorId);
    }
  }



  setDiceImages() {
    for(let i=0; i<6; i++) {
      this.die[i].classList.remove('d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'selected');
      this.die[i].classList.add('d' + this.diceModel.die[i].value);
    }
  }

  hideDisplayTrain() {
    this.display_engine.classList.add('hidden');
    this.display_helper.classList.add('hidden');
    this.display_tender.classList.add('hidden');

    for(let i=0; i<this.displayed_train_div.length; i++) {
      this.displayed_train_div[i].classList.add('hidden');
    }

    // Hide overflow sections
    this.updateOverflowSections();
  }

  updateDisplayTrain() {
    if(this.train.engine == true) {
        this.display_engine.classList.remove('hidden');
    }

    if(this.train.tender == true) {
        this.display_tender.classList.remove('hidden');
    }

    if(this.train.helper == true) {
        this.display_helper.classList.remove('hidden');
    }

    for(let i=0; i<this.train.car.length; i++) {
        this.displayed_train_div[i].classList.remove('c1', 'c2', 'c3', 'c4');
        this.displayed_train_div[i].classList.add('c' + this.train.car[i]);
        this.displayed_train_div[i].classList.remove('hidden');
    }

    // Show overflow sections if they have cars
    this.updateOverflowSections();
  }

  updateOverflowSections() {
    // Get all overflow container divs
    let overflowContainers = document.querySelectorAll('.train_container_overflow');

    overflowContainers.forEach((container) => {
      // Check if any car in this container is visible
      let visibleCars = container.querySelectorAll('.car:not(.hidden)');

      if(visibleCars.length > 0) {
        container.classList.add('has-cars');
      } else {
        container.classList.remove('has-cars');
      }
    });
  }

  updateRunningScore() {
    let newScore = this.train.getScore();
    this.current_train_score_span.innerHTML = newScore;

    // Trigger score animation
    this.current_train_score_span.classList.remove('score-changed');
    void this.current_train_score_span.offsetWidth; // Force reflow
    this.current_train_score_span.classList.add('score-changed');
  }

  startGame() {
    // Collect player names
    let playerNames = [];
    for(let i = 1; i <= 8; i++) {
      let input = document.getElementById('player_' + i);
      if(input && input.value.trim() !== '') {
        playerNames.push(input.value.trim());
      }
    }

    // Ensure at least 1 player
    if(playerNames.length === 0) {
      alert('Please enter at least one player name!');
      return;
    }

    // Get number of rounds
    let roundsInput = document.getElementById('rounds_input');
    this.game.totalRounds = parseInt(roundsInput.value) || 10;
    this.game.skipSummary = document.getElementById('skip_summary').checked;

    // Initialize players
    this.game.players = [];
    for(let i = 0; i < playerNames.length; i++) {
      this.game.addPlayer(new Player(playerNames[i]));
    }

    this.game.playerIndex = 0;
    this.game.currentRound = 1;

    // Start the first turn
    this.startTurn();

    this.settings_div.classList.add('collapsed');
    this.hero_div.classList.add('collapsed');
    this.dice_area_div.classList.remove('collapsed');
    this.table_div.classList.remove('collapsed');
  }

  startTurn() {
    // Reset turn status
    this.game.turnStatus = new TurnStatus();
    this.diceModel = new Dice();
    this.train = new Train();

    this.hideDisplayTrain();
    this.updateCurrentPlayerDisplay();
    this.updateRunningScore();
    this.setButtonStatus();

    // Reset dice display
    for(let i = 0; i < 6; i++) {
      this.die[i].classList.add('in_cup');
      this.die[i].classList.remove('selected', 'error');
    }
  }

  setButtonStatus() {

    if(this.game.turnStatus.roll_count == 0) {
      this.roll_button.disabled = false;
      this.add_car_button.disabled = true;
      this.end_turn_button.disabled = true;
    } else {
      if(this.train.engine && this.train.tender) {
        if(this.game.turnStatus.cars_added_this_roll) {
          // Turn MUST end if caboose added or no remaining dice for a regular train
          this.roll_button.disabled = this.train.caboose || (this.diceModel.total == 0 && !this.train.helper); 
          this.add_car_button.disabled = !this.game.turnStatus.available_cars;
          this.end_turn_button.disabled = false;
        } else {
          this.roll_button.disabled = true;
          this.add_car_button.disabled = !this.game.turnStatus.available_cars;
          this.end_turn_button.disabled = this.game.turnStatus.available_cars;
        }
      } 
      else {
        if(this.game.turnStatus.available_cars) {
          this.roll_button.disabled = true;
          this.add_car_button.disabled = false;
          this.end_turn_button.disabled = true;
        } else if(this.game.turnStatus.roll_count < 3) {
          this.roll_button.disabled = false;
          this.add_car_button.disabled = true;
          this.end_turn_button.disabled = true;
        } else {
          this.roll_button.disabled = true;
          this.add_car_button.disabled = true;
          this.end_turn_button.disabled = false;         
        }
      }
    }
  }

  roll() {
    console.log('roll button pressed');
    this.roll_button.disabled = true;

    let remainingDieIndex = this.diceModel.visibleDieList();
    this.diceModel.roll();
    let availableMove = this.evalDice();
    this.game.turnStatus.roll_count = this.game.turnStatus.roll_count+1;
    this.game.turnStatus.cars_added_this_roll = false;
    this.game.turnStatus.available_cars = availableMove;
    this.updateCurrentPlayerDisplay();
    this.setButtonStatus();

    for(let i = 0; i < remainingDieIndex.length; i++) {
      setTimeout(()=>{
        this.die[remainingDieIndex[remainingDieIndex.length - 1 - i]].classList.add('in_cup');
      },i * 100);
    }

    let timeOffset = 100 * remainingDieIndex.length;

    for(let i = 0; i < this.diceModel.total; i++) {
      setTimeout(()=>{
        if(i == 0) {
          this.setDiceImages();
        }

        this.die[i].classList.remove('in_cup');
      }, timeOffset + i * 200 + 200);
    }
  }

  addCars() {
    let index = this.diceModel.useSelected();
    if(index.length == 0) {
      let remainingDieIndex = this.diceModel.visibleDieList();
      for(let i=0; i<remainingDieIndex.length; i++) {
         this.diceModel.die[remainingDieIndex[i]].selected = true;
         this.die[remainingDieIndex[i]].classList.add('selected');
      }  

      this.evalDice();
      return;
    }

    this.game.turnStatus.cars_added_this_roll = true;

    let addCaboose = false;
    for(let i=0; i<index.length; i++) {
      this.die[index[i]].classList.add('in_cup');
      if(this.diceModel.die[index[i]].value == 1) {
        addCaboose = true;
      } else {
        this.train.addCar(this.diceModel.die[index[i]].value);
      }
      //alert(this.diceModel.die[index[i]].value);
    }

    if(addCaboose) {
      this.train.addCar(1);
    }

    if(this.train.helper) {
      this.diceModel.limit = 3;
      console.log('Limit: ' + this.diceModel.limit);
    }

    this.updateDisplayTrain();
    let availableMove = this.evalDice();
    //alert(availableMove);
    this.updateRunningScore();
    //alert(this.train.getScore());
    //console.log('Score: ' + this.train.getScore());
  }


  evalDice() {
    let tempTrain = new Train(this.train);
    let remainingDieIndex = this.diceModel.visibleDieList();
    let availableMove = false;

    for(let i = 0; i < remainingDieIndex.length; i++) {
      this.diceModel.die[remainingDieIndex[i]].error = Error.UNCHECKED;
    }

    if(!tempTrain.engine) {
      for(let i = 0; i < remainingDieIndex.length; i++) {
        let d = this.diceModel.die[remainingDieIndex[i]];
        if(d.value == 6 && d.selected && d.error == Error.UNCHECKED) {
          d.error = Error.NONE;
          tempTrain.addCar(6);
          availableMove = true;
          break;
        }
      }
    }

    if(tempTrain.engine && !tempTrain.tender) {
      for(let i = 0; i < remainingDieIndex.length; i++) {
        let d = this.diceModel.die[remainingDieIndex[i]];
        if(d.value == 5 && d.selected && d.error == Error.UNCHECKED) {
          d.error = Error.NONE;
          tempTrain.addCar(5);
          availableMove = true;
          break;
        }
      }
    }

    if(tempTrain.engine && tempTrain.tender && !tempTrain.helper && !tempTrain.caboose) {
      for(let i = 0; i < remainingDieIndex.length; i++) {
        let d = this.diceModel.die[remainingDieIndex[i]];
        if(d.value == 6 && d.selected && d.error == Error.UNCHECKED) {
          d.error = Error.NONE;
          tempTrain.addCar(6);
          availableMove = true;
          break;
        }
      }
    }

    if(tempTrain.tender && !tempTrain.caboose) {
      for(let i = 0; i < remainingDieIndex.length; i++) {
        let d = this.diceModel.die[remainingDieIndex[i]];
        if((d.value == 2 || d.value == 3 || d.value == 4) && d.error == Error.UNCHECKED) {
          d.error = Error.NONE;
          tempTrain.addCar(d.value);
          availableMove = true;
        }
      }
    }

    if(tempTrain.tender && !tempTrain.caboose) {
      for(let i = 0; i < remainingDieIndex.length; i++) {
        let d = this.diceModel.die[remainingDieIndex[i]];
        if(d.value == 1 && d.selected && d.error == Error.UNCHECKED) {
          d.error = Error.NONE;
          tempTrain.addCar(d.value);
          availableMove = true;
          break;
        }
      }
    }

    for(let i = 0; i < remainingDieIndex.length; i++) {
      let d = this.diceModel.die[remainingDieIndex[i]];
      if(d.error == Error.UNCHECKED) {
        d.error = tempTrain.isValidNextCar(d.value);
        if(d.error == Error.NONE) {
          availableMove = true;
        }
      }
    }

    console.log('**********');
    for(let i = 0; i < remainingDieIndex.length; i++) {
      let d = this.diceModel.die[remainingDieIndex[i]];
      console.log(d.value + (d.selected ? '*' : ' ') +' ' + d.error);

      if(d.error == Error.NONE) {
        this.die[remainingDieIndex[i]].classList.remove('error');
      } else {
        this.die[remainingDieIndex[i]].classList.add('error');
      }
      
    }

    this.game.turnStatus.available_cars = availableMove;
    this.setButtonStatus();

    return availableMove;
  }


  endTurn() {
    let player = this.game.getCurrentPlayer();
    let trainValue;
    let trainLength = this.train.car.length;

    // Determine result
    if(!this.train.engine || !this.train.tender) {
      trainValue = TrainError.SHORTAGE;
    } else if(!this.game.turnStatus.cars_added_this_roll && this.game.turnStatus.roll_count >= 3) {
      trainValue = TrainError.CRASH;
    } else {
      trainValue = this.train.getScore();
    }

    // Check if all 6 dice were used (perfect train)
    let usedAllDice = (this.diceModel.total === 0);

    // Record the train value
    player.addTrain(trainValue, trainLength, this.train.helper, this.train.caboose, usedAllDice, this.train.bonus);

    // Check if this was the last turn before advancing
    const isLastTurn = (this.game.playerIndex === this.game.players.length - 1) &&
                       (this.game.currentRound === this.game.totalRounds);

    if(this.game.skipSummary) {
      if(isLastTurn) {
        this.dice_area_div.classList.add('collapsed');
        this.table_div.classList.add('collapsed');
        this.showFinalResults();
      } else {
        this.game.nextPlayer();
        this.dice_area_div.classList.remove('collapsed');
        this.table_div.classList.remove('collapsed');
        this.startTurn();
      }
      return;
    }

    // Update displays
    this.dice_area_div.classList.add('collapsed');
    this.table_div.classList.add('collapsed');
    this.score_card_div.classList.remove('collapsed');

    this.displayTurnResults(player, trainValue);
  }

  displayTurnResults(player, trainValue) {
    let resultDiv = document.getElementById('turn_results');
    let resultMessage = '';

    if(trainValue === TrainError.SHORTAGE) {
      resultMessage = `<h2>${player.name} - Equipment Shortage!</h2><p>Could not find an engine and tender in 3 rolls.</p>`;
    } else if(trainValue === TrainError.CRASH) {
      if(this.train.helper) {
        resultMessage = `<h2>${player.name} - Train Wreck!</h2><p>No cargo available for the freight train.</p>`;
      } else {
        resultMessage = `<h2>${player.name} - Derailment!</h2><p>No cargo available to add to the train.</p>`;
      }
    } else {
      let bonusMsg = this.train.bonus ? ' <strong>(Bonus Freight Train!)</strong>' : '';
      let cabooseMsg = this.train.caboose ? ' <strong>(Double points with caboose!)</strong>' : '';
      let freightMsg = this.train.helper ? ' <strong>(Freight Train!)</strong>' : '';
      resultMessage = `<h2>${player.name} scored ${trainValue} points!</h2><p>${bonusMsg}${cabooseMsg}${freightMsg}</p>`;
    }

    // Build turn history table (scrollable)
    let turnRows = '';
    for(let i = 0; i < player.trainValues.length; i++) {
      turnRows += `<tr><td>${i + 1}</td><td>${player.trainValues[i]}</td></tr>`;
    }
    const turnTable = `
      <h3>Turn History</h3>
      <div class="scroll-table-wrap">
        <table><thead><tr><th>Turn</th><th>Score</th></tr></thead><tbody>${turnRows}</tbody></table>
      </div>`;

    const isSinglePlayer = this.game.players.length === 1;

    // Build player standings table (multi-player only)
    let standingsTable = '';
    if(!isSinglePlayer) {
      let standingsRows = '';
      let sortedPlayers = this.game.getSortedPlayers();
      for(let i = 0; i < sortedPlayers.length; i++) {
        let p = sortedPlayers[i];
        let highlight = (p === player) ? ' style="font-weight:bold; background-color:#ffffcc;"' : '';
        standingsRows += `<tr${highlight}><td>${p.name}</td><td>${p.totalScore}</td></tr>`;
      }
      standingsTable = `<h3>Current Standings</h3><div class="scroll-table-wrap"><table><thead><tr><th>Player</th><th>Score</th></tr></thead><tbody>${standingsRows}</tbody></table></div>`;
    }

    // Determine next action - check if this was the last turn
    // Last turn is when we're on the last player and have completed totalRounds
    let isLastTurn = (this.game.playerIndex === this.game.players.length - 1) &&
                     (this.game.currentRound === this.game.totalRounds);

    let nextButton = '';
    if(isLastTurn) {
      nextButton = '<button id="show_final_results">Show Final Results</button>';
    } else {
      this.game.nextPlayer();
      let nextPlayer = this.game.getCurrentPlayer();
      if(isSinglePlayer) {
        nextButton = `<button id="next_player_button">Next Turn</button>`;
      } else {
        nextButton = `<div style="display: flex; align-items: center; gap: 20px; margin: 20px 0;"><button id="next_player_button">Start Turn</button><p style="font-size: 1.3em; font-weight: bold; margin: 0; color: #2c1810;">Up next: ${nextPlayer.name}</p></div>`;
      }
    }

    const tablesHTML = isSinglePlayer
      ? `<div class="results-col">${turnTable}</div>`
      : `<div class="results-columns"><div class="results-col">${turnTable}</div><div class="results-col">${standingsTable}</div></div>`;

    resultDiv.innerHTML = `
      ${resultMessage}
      ${nextButton}
      ${tablesHTML}
    `;

    // Add event listener to next button
    let self = this;
    if(isLastTurn) {
      document.getElementById('show_final_results').addEventListener('click', function() {
        self.showFinalResults();
      });
    } else {
      document.getElementById('next_player_button').addEventListener('click', function() {
        self.nextTurn();
      });
    }
  }

  nextTurn() {
    this.score_card_div.classList.add('collapsed');
    this.dice_area_div.classList.remove('collapsed');
    this.table_div.classList.remove('collapsed');

    this.startTurn();
  }

  showFinalResults() {
    this.score_card_div.classList.add('collapsed');
    this.end_game_card_div.classList.remove('collapsed');
    this.createConfetti();

    const isSinglePlayer = this.game.players.length === 1;
    let endGameCard = document.getElementById('end_game_card');

    if(isSinglePlayer) {
      this._showSinglePlayerResults(endGameCard);
    } else {
      this._showMultiPlayerResults(endGameCard);
    }

    let self = this;
    document.getElementById('new_game_button').addEventListener('click', function() {
      self.resetGame();
    });
  }

  _showSinglePlayerResults(endGameCard) {
    const player = this.game.players[0];
    const rounds = this.game.totalRounds;
    const avg = player.getAverageScore();
    const comeback = player.getComebackScore();
    const failures = player.equipmentShortages + player.derailments;
    const hs = highScores;

    // Update high scores and get which ones are new records
    const newRecords = highScores.update(player, rounds);

    const rec = (flag, text) => flag ? ` <span class="new-record">&#9733; New Record!</span>` : ` <span class="prev-record">(best: ${text})</span>`;

    // Build turn history (scrollable)
    let turnRows = '';
    for(let i = 0; i < player.trainValues.length; i++) {
      turnRows += `<tr><td>${i + 1}</td><td>${player.trainValues[i]}</td></tr>`;
    }
    const turnTable = `
      <h3>Turn History</h3>
      <div class="scroll-table-wrap">
        <table><thead><tr><th>Turn</th><th>Score</th></tr></thead><tbody>${turnRows}</tbody></table>
      </div>`;

    // Build personal bests panel — always show core 4; show game-rate stats only if they occurred
    let statsHTML = '<h3>Personal Bests</h3>';

    const prev = newRecords.longestTrain ? null : hs.longestTrain;
    statsHTML += `<div class="stat-item"><strong>Longest Train:</strong> ${player.longestTrain} cars${rec(newRecords.longestTrain, `${prev} cars`)}</div>`;

    const prevMV = newRecords.mostValuableTrain ? null : hs.mostValuableTrain;
    statsHTML += `<div class="stat-item"><strong>Most Valuable:</strong> ${player.mostValuableTrain} pts${rec(newRecords.mostValuableTrain, `${prevMV} pts`)}</div>`;

    const prevAvg = newRecords.highestAverage ? null : hs.highestAverage;
    statsHTML += `<div class="stat-item"><strong>Average:</strong> ${avg} pts${rec(newRecords.highestAverage, `${prevAvg} pts`)}</div>`;

    // Game-rate stats — only when they occurred this game
    const rateLine = (label, count, flag, rateKey) => {
      if(count === 0) return '';
      const pct = Math.round((count / rounds) * 100);
      const prevPct = Math.round(hs[rateKey] * 100);
      return `<div class="stat-item"><strong>${label}:</strong> ${count}/${rounds} (${pct}%)${rec(flag, `${Math.round(hs[rateKey] * rounds)}/${rounds} (${prevPct}%)`)}</div>`;
    };

    statsHTML += rateLine('Freight Trains', player.freightTrains, newRecords.freightRate, 'freightRate');
    statsHTML += rateLine('Perfect Trains', player.perfectTrains, newRecords.perfectRate, 'perfectRate');
    statsHTML += rateLine('Bonus Trains',   player.bonusTrains,   newRecords.bonusRate,   'bonusRate');
    statsHTML += rateLine('Cabooses',       player.cabooseCount,  newRecords.cabooseRate, 'cabooseRate');
    if(failures > 0) {
      const pct = Math.round((failures / rounds) * 100);
      const prevPct = Math.round(hs.failureRate * 100);
      statsHTML += `<div class="stat-item"><strong>Failures:</strong> ${failures}/${rounds} (${pct}%)${rec(newRecords.failureRate, `${Math.round(hs.failureRate * rounds)}/${rounds} (${prevPct}%)`)}</div>`;
    }

    endGameCard.innerHTML = `
      <h2 class="result-heading">${player.name} scored ${player.totalScore} points!</h2>
      <div class="results-columns">
        <div class="results-col">${turnTable}</div>
        <div class="results-col">${statsHTML}</div>
      </div>
      <button id="new_game_button">Play Again</button>
    `;
  }

  _showMultiPlayerResults(endGameCard) {
    const winners = this.game.getWinners();
    const sortedPlayers = this.game.getSortedPlayers();

    // Find statistics - get the best value for each category
    let stats = {
      longestTrain: { players: [], value: 0 },
      mostValuableTrain: { players: [], value: 0 },
      mostFreightTrains: { players: [], value: 0 },
      mostCabooses: { players: [], value: 0 },
      mostFailures: { players: [], value: 0 },
      mostPerfectTrains: { players: [], value: 0 },
      mostBonusTrains: { players: [], value: 0 },
      highestAverage: { players: [], value: 0 },
      highestSingleTurn: { players: [], value: 0 },
      biggestComeback: { players: [], value: -9999 }
    };

    for(let p of sortedPlayers) {
      if(p.longestTrain > stats.longestTrain.value)           stats.longestTrain.value = p.longestTrain;
      if(p.mostValuableTrain > stats.mostValuableTrain.value) stats.mostValuableTrain.value = p.mostValuableTrain;
      if(p.freightTrains > stats.mostFreightTrains.value)     stats.mostFreightTrains.value = p.freightTrains;
      if(p.cabooseCount > stats.mostCabooses.value)           stats.mostCabooses.value = p.cabooseCount;
      let failures = p.equipmentShortages + p.derailments;
      if(failures > stats.mostFailures.value)                 stats.mostFailures.value = failures;
      if(p.perfectTrains > stats.mostPerfectTrains.value)     stats.mostPerfectTrains.value = p.perfectTrains;
      if(p.bonusTrains > stats.mostBonusTrains.value)         stats.mostBonusTrains.value = p.bonusTrains;
      let avg = p.getAverageScore();
      if(avg > stats.highestAverage.value)                    stats.highestAverage.value = avg;
      if(p.highestSingleTurn > stats.highestSingleTurn.value) stats.highestSingleTurn.value = p.highestSingleTurn;
      let comeback = p.getComebackScore();
      if(comeback > stats.biggestComeback.value)              stats.biggestComeback.value = comeback;
    }

    for(let p of sortedPlayers) {
      if(p.longestTrain === stats.longestTrain.value && stats.longestTrain.value > 0)                stats.longestTrain.players.push(p.name);
      if(p.mostValuableTrain === stats.mostValuableTrain.value && stats.mostValuableTrain.value > 0) stats.mostValuableTrain.players.push(p.name);
      if(p.freightTrains === stats.mostFreightTrains.value && stats.mostFreightTrains.value > 0)     stats.mostFreightTrains.players.push(p.name);
      if(p.cabooseCount === stats.mostCabooses.value && stats.mostCabooses.value > 0)               stats.mostCabooses.players.push(p.name);
      let failures = p.equipmentShortages + p.derailments;
      if(failures === stats.mostFailures.value && stats.mostFailures.value > 0)                      stats.mostFailures.players.push(p.name);
      if(p.perfectTrains === stats.mostPerfectTrains.value && stats.mostPerfectTrains.value > 0)     stats.mostPerfectTrains.players.push(p.name);
      if(p.bonusTrains === stats.mostBonusTrains.value && stats.mostBonusTrains.value > 0)           stats.mostBonusTrains.players.push(p.name);
      let avg = p.getAverageScore();
      if(avg === stats.highestAverage.value && stats.highestAverage.value > 0)                       stats.highestAverage.players.push(p.name);
      if(p.highestSingleTurn === stats.highestSingleTurn.value && stats.highestSingleTurn.value > 0) stats.highestSingleTurn.players.push(p.name);
      let comeback = p.getComebackScore();
      if(comeback === stats.biggestComeback.value && stats.biggestComeback.value > 0)                stats.biggestComeback.players.push(p.name);
    }

    let winnerHTML = '';
    if(winners.length === 1) {
      winnerHTML = `<h1>${winners[0].name} is the Winner!</h1>`;
    } else {
      let winnerNames = winners.map(w => w.name).join(' and ');
      winnerHTML = `<h1>It's a Tie! ${winnerNames} are the Winners!</h1>`;
    }

    let standingsRows = '';
    let currentRank = 1;
    let lastScore = -1;
    for(let i = 0; i < sortedPlayers.length; i++) {
      let p = sortedPlayers[i];
      if(p.totalScore !== lastScore) currentRank = i + 1;
      lastScore = p.totalScore;
      let highlight = (currentRank === 1) ? ' style="font-weight:bold; background-color:#ffd700;"' : '';
      standingsRows += `<tr${highlight}><td>${currentRank}</td><td>${p.name}</td><td>${p.totalScore}</td></tr>`;
    }
    const standingsHTML = `<h3>Final Standings</h3><div class="scroll-table-wrap"><table><thead><tr><th>Rank</th><th>Player</th><th>Score</th></tr></thead><tbody>${standingsRows}</tbody></table></div>`;

    let statsHTML = '<h3>Game Statistics</h3>';
    if(stats.longestTrain.value > 0)       statsHTML += `<div class="stat-item"><strong>Longest Train:</strong> ${stats.longestTrain.players.join(', ')} (${stats.longestTrain.value} cars)</div>`;
    if(stats.mostValuableTrain.value > 0)  statsHTML += `<div class="stat-item"><strong>Most Valuable:</strong> ${stats.mostValuableTrain.players.join(', ')} (${stats.mostValuableTrain.value} pts)</div>`;
    if(stats.highestSingleTurn.value > 0)  statsHTML += `<div class="stat-item"><strong>Best Turn:</strong> ${stats.highestSingleTurn.players.join(', ')} (${stats.highestSingleTurn.value} pts)</div>`;
    if(stats.highestAverage.value > 0)     statsHTML += `<div class="stat-item"><strong>Best Average:</strong> ${stats.highestAverage.players.join(', ')} (${stats.highestAverage.value} pts)</div>`;
    if(stats.mostFreightTrains.value > 0)  statsHTML += `<div class="stat-item"><strong>Most Freight Trains:</strong> ${stats.mostFreightTrains.players.join(', ')} (${stats.mostFreightTrains.value})</div>`;
    if(stats.mostPerfectTrains.value > 0)  statsHTML += `<div class="stat-item"><strong>Most Perfect Trains:</strong> ${stats.mostPerfectTrains.players.join(', ')} (${stats.mostPerfectTrains.value})</div>`;
    if(stats.mostBonusTrains.value > 0)    statsHTML += `<div class="stat-item"><strong>Most Bonus Trains:</strong> ${stats.mostBonusTrains.players.join(', ')} (${stats.mostBonusTrains.value})</div>`;

    endGameCard.innerHTML = `
      ${winnerHTML}
      <div class="results-columns">
        <div class="results-col">${standingsHTML}</div>
        <div class="results-col">${statsHTML}</div>
      </div>
      <button id="new_game_button">Start New Game</button>
    `;
  }

  resetGame() {
    // Reset game state
    this.game = new Game();
    this.diceModel = new Dice();
    this.train = new Train();

    // Show settings and hero, hide everything else
    this.hero_div.classList.remove('collapsed');
    this.settings_div.classList.remove('collapsed');
    this.dice_area_div.classList.add('collapsed');
    this.score_card_div.classList.add('collapsed');
    this.end_game_card_div.classList.add('collapsed');
    this.table_div.classList.add('collapsed');

    this.hideDisplayTrain();
  }

  createConfetti() {
    const confettiCount = 100;
    for(let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        document.body.appendChild(confetti);

        // Remove confetti after animation
        setTimeout(() => {
          confetti.remove();
        }, 5000);
      }, i * 30);
    }
  }

  selectDie(index) {
    // Check if the die has an error and isn't already selected
    if(this.diceModel.die[index].error !== Error.NONE && !this.diceModel.die[index].selected) {
      // Trigger shake animation
      this.die[index].classList.add('shake');
      setTimeout(() => {
        this.die[index].classList.remove('shake');
      }, 400);
      return;
    }

    this.die[index].classList.toggle('selected');
    let isSelected = this.diceModel.select(index);
    this.evalDice();
  }
}


view = new View();

window.onload = function () {
  view.initialize();
}

console.log('there');