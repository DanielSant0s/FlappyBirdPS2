System.listDir("sprites/").map(item => { globalThis[item.name.replace(".png", "").replace("-", "_")] = new Image(`sprites/${item.name}`) });
System.listDir("audio/").map(item => { globalThis[item.name.replace(".adp", "")] = Sound.load(`audio/${item.name}`) });

const font = new Font("fonts/flappy-font.ttf");

const canvas = Screen.getMode();

// general settings
let gamePlaying = false;
let optionsMenu = false;
var gravity = .5;
var speed = 6.2;
const size = [51, 36];
var jump = -10.0;
const cTenth = (canvas.width / 10);

let index = 0,
    bestScore = 0, 
    flight, 
    flyHeight, 
    currentScore, 
    pipes;

// pipe settings
const pipeWidth = 78;
var pipeGap = 180;
const pipeLoc = () => (Math.random() * ((canvas.height - (pipeGap + pipeWidth)) - pipeWidth)) + pipeWidth;

const setup = () => {
  currentScore = 0;
  flight = jump;

  // set initial flyHeight (middle of screen - size of the bird)
  flyHeight = (canvas.height / 2) - (size[1] / 2);

  // setup first 3 pipes
  pipes = Array(3).fill().map((a, i) => [canvas.width + (i * (pipeGap + pipeWidth)), pipeLoc()]);
}

const pads = {old:Pads.get(), new:Pads.get()};

let bkp_endy = pipe_green.endy;

const bird_states = [bluebird_upflap, bluebird_midflap, bluebird_downflap];

var volume = 50;

Sound.setVolume(volume, 0);
Sound.setVolume(volume, 1);
Sound.setVolume(volume, 2);
Sound.setVolume(volume, 3);
Sound.setVolume(volume, 4);

var timer = Timer.new();

const main_menu_entries = [{text:"Start game", width:font.getTextSize("Start game").width, height:font.getTextSize("Start game").height, func: () => { gamePlaying = true; }},
                           {text:"Options", width:font.getTextSize("Options").width, height:font.getTextSize("Options").height, func:  () => { optionsMenu = true; }}];

const options_menu_entries = [{text:`Volume: ${volume}`, width:font.getTextSize(`Volume: ${volume}`).width, height:font.getTextSize(`Volume: ${volume}`).height, func: () => { 
    options_menu_entries[0].text = `Volume: ${volume}`;
    options_menu_entries[0].width = font.getTextSize(`Volume: ${volume}`).width;
    options_menu_entries[0].height = font.getTextSize(`Volume: ${volume}`).height;
    if(Pads.check(pads.new, Pads.LEFT) && volume > 0 && Timer.getTime(timer) % 100 < 15) {
        volume--;
        Sound.setVolume(volume, 0);
        Sound.setVolume(volume, 1);
        Sound.setVolume(volume, 2);
        Sound.setVolume(volume, 3);
        Sound.setVolume(volume, 4);
    } else if(Pads.check(pads.new, Pads.RIGHT) && volume < 100 && Timer.getTime(timer) % 100 < 15) {
        volume++;
        Sound.setVolume(volume, 0);
        Sound.setVolume(volume, 1);
        Sound.setVolume(volume, 2);
        Sound.setVolume(volume, 3);
        Sound.setVolume(volume, 4);
    }
}},
{text:`Pipes gap: ${pipeGap}`, width:font.getTextSize(`Pipes gap: ${pipeGap}`).width, height:font.getTextSize(`Pipes gap: ${pipeGap}`).height, func: () => { 
    options_menu_entries[1].text = `Pipes gap: ${pipeGap}`;
    options_menu_entries[1].width = font.getTextSize(`Pipes gap: ${pipeGap}`).width;
    options_menu_entries[1].height = font.getTextSize(`Pipes gap: ${pipeGap}`).height;
    if(Pads.check(pads.new, Pads.LEFT) && pipeGap > 0 && Timer.getTime(timer) % 100 < 15) {
        pipeGap--;
    } else if(Pads.check(pads.new, Pads.RIGHT) && pipeGap < canvas.width && Timer.getTime(timer) % 100 < 15) {
        pipeGap++;
    }
}},
{text:`Jump: ${(-jump).toFixed(1)}`, width:font.getTextSize(`Jump: ${(-jump).toFixed(1)}`).width, height:font.getTextSize(`Jump: ${(-jump).toFixed(1)}`).height, func: () => { 
    options_menu_entries[2].text = `Jump: ${(-jump).toFixed(1)}`;
    options_menu_entries[2].width = font.getTextSize(`Jump: ${(-jump).toFixed(1)}`).width;
    options_menu_entries[2].height = font.getTextSize(`Jump: ${(-jump).toFixed(1)}`).height;
    if(Pads.check(pads.new, Pads.LEFT) && jump < 0.5 && Timer.getTime(timer) % 100 < 15) {
        jump += 0.1;
    } else if(Pads.check(pads.new, Pads.RIGHT) && jump > -50.0 && Timer.getTime(timer) % 100 < 15) {
        jump -= 0.1;
    }
}}
];

var main_menu_ptr = 0;
var options_menu_ptr = 0;

const render = () => {
  // make the pipe and bird moving 
  index++;

  // background first part 
  background_day.width = canvas.width;
  background_day.height = canvas.height;
  background_day.draw(-((index * (speed / 2)) % canvas.width) + canvas.width, 0);
  // background second part
  background_day.width = canvas.width;
  background_day.height = canvas.height;
  background_day.draw(-(index * (speed / 2)) % canvas.width, 0);

  // pipe display
  if (gamePlaying){
    pipes.map(pipe => {
      // pipe moving
      pipe[0] -= speed;

      // top pipe
      //ctx.drawImage(img, 432, 588 - pipe[1], pipeWidth, pipe[1], pipe[0], 0, , );
      pipe_green.width = -pipeWidth;
      pipe_green.height = -pipe[1];
      pipe_green.endy = pipe[1];
      pipe_green.draw(pipe[0]+pipeWidth, 0+pipe[1]);
      // bottom pipe
      pipe_green.width = pipeWidth;
      pipe_green.endy = bkp_endy;
      pipe_green.height = canvas.height - pipe[1] + pipeGap;
      pipe_green.draw(pipe[0], pipe[1] + pipeGap);

      //ctx.drawImage(img, 432 + pipeWidth, 108, pipeWidth, canvas.height - pipe[1] + pipeGap, , , , );

      // give 1 point & create new pipe
      if(pipe[0] <= -pipeWidth){
        Sound.play(point, 2);
        currentScore++;
        // check if it's the best score
        bestScore = Math.max(bestScore, currentScore);
        
        // remove & create new pipe
        pipes = [...pipes.slice(1), [pipes[pipes.length-1][0] + pipeGap + pipeWidth, pipeLoc()]];
        console.log(pipes);
      }
    
      // if hit the pipe, end
      if ([
        pipe[0] <= cTenth + size[0], 
        pipe[0] + pipeWidth >= cTenth, 
        pipe[1] > flyHeight || pipe[1] + pipeGap < flyHeight + size[1]
      ].every(elem => elem)) {
        Sound.play(hit, 3);
        gamePlaying = false;
        setup();
      }
    })
  }
  // draw bird
  if (gamePlaying) {
    bird_states[Math.floor((index % 9) / 3)].draw(cTenth, flyHeight);
    flight += gravity;
    flyHeight = Math.min(flyHeight + flight, canvas.height - size[1]);

    pads.old = pads.new;
    pads.new = Pads.get();

    if(Pads.check(pads.new, Pads.CROSS) && !Pads.check(pads.old, Pads.CROSS)) {
        Sound.play(wing, 1);
        flight = jump;
    }

    font.print(15, 40, `Best : ${bestScore}`);
    font.print(15, 15, `Current : ${currentScore}`);

  } else {
    bluebird_midflap.draw(((canvas.width / 2) - size[0] / 2), flyHeight);
    flyHeight = (canvas.height / 2) - (size[1] / 2);
    // text accueil
    let score_size = font.getTextSize(`Best score : ${bestScore}`); 
    font.print(canvas.width/2-score_size.width/2, 15, `Best score : ${bestScore}`);

    if (!optionsMenu) {
        for(let i = 0; i < main_menu_entries.length; i++) {
            if (i == main_menu_ptr) {
                font.print(canvas.width/2-main_menu_entries[i].width/2-20, 350+(i*30), ">");
                font.print(canvas.width/2+main_menu_entries[i].width/2+5, 350+(i*30), "<");
            }
            font.print(canvas.width/2-main_menu_entries[i].width/2, 350+(i*30), main_menu_entries[i].text);
        }
    
        pads.old = pads.new;
        pads.new = Pads.get();
    
        if(Pads.check(pads.new, Pads.UP) && !Pads.check(pads.old, Pads.UP) && main_menu_ptr > 0) {
            main_menu_ptr--;
        }
    
        if(Pads.check(pads.new, Pads.DOWN) && !Pads.check(pads.old, Pads.DOWN) && main_menu_ptr < main_menu_entries.length-1) {
            main_menu_ptr++;
        }
    
        if(Pads.check(pads.new, Pads.CROSS) && !Pads.check(pads.old, Pads.CROSS)) {
            main_menu_entries[main_menu_ptr].func();
        }

    } else {

        for(let i = 0; i < options_menu_entries.length; i++) {
            if (i == options_menu_ptr) {
                font.print(canvas.width/2-options_menu_entries[i].width/2-20, 350+(i*30), ">");
                font.print(canvas.width/2+options_menu_entries[i].width/2+5, 350+(i*30), "<");
            }
            font.print(canvas.width/2-options_menu_entries[i].width/2, 350+(i*30), options_menu_entries[i].text);
        }
    
        pads.old = pads.new;
        pads.new = Pads.get();
    
        if(Pads.check(pads.new, Pads.UP) && !Pads.check(pads.old, Pads.UP) && options_menu_ptr > 0) {
            options_menu_ptr--;
        }
    
        if(Pads.check(pads.new, Pads.DOWN) && !Pads.check(pads.old, Pads.DOWN) && options_menu_ptr < options_menu_entries.length-1) {
            options_menu_ptr++;
        }
    
        if(Pads.check(pads.new, Pads.TRIANGLE) && !Pads.check(pads.old, Pads.TRIANGLE)) {
            optionsMenu = false;
        }

        options_menu_entries[options_menu_ptr].func();

    }
    


  }

}

setup();

for(;;) {
    Screen.clear();

    render();

    Screen.flip();

}
