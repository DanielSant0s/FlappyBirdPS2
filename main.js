const bird_states = [undefined, undefined, undefined];

const setCurrentSkin = (array, name) => {
    array.forEach(item => {
        if (item.name == name) {
            for(let i = 0; i < bird_states.length; i++) {
                bird_states[i] = new Image(item.path+item.files[i]);
                bird_states[i].width = 54;
                bird_states[i].height = 38;
                std.gc();
            }
        }
    });
}

const skins = System.listDir("sprites/skins").map(item => {
    let obj = {name:item.name, path:"sprites/skins/"+item.name + "/"};
    obj.files = System.listDir(obj.path).map(item => item.name);
    return obj;
});

const skin_names = skins.map(item => item.name);

System.listDir("sprites/").map(item => { 
    if (!item.dir) {
        console.log(item.name);
        globalThis[item.name.replace(".png", "").replace("-", "_")] = new Image(`sprites/${item.name}`) ;
    }
    
});

System.listDir("audio/").map(item => { globalThis[item.name.replace(".adp", "")] = Sound.load(`audio/${item.name}`) });

var current_skin = "bluebird";
setCurrentSkin(skins, "bluebird");

const setChVolume = (volume) => {
    for(let i = 0; i < 32; i++) {
        Sound.setVolume(volume, i);
    }
}

const font = new Font("fonts/flappy-font.ttf");

let screenModes = [{name: "NTSC(480i)", mode:NTSC, width:640, height:448, interlace:INTERLACED, field:FIELD},
                   {name: "PAL(576i)", mode:PAL, width:640, height:512 , interlace:INTERLACED, field:FIELD},
                   {name: "480p", mode:DTV_480p, width:640, height:480 , interlace:PROGRESSIVE, field:FRAME},
                   {name: "720p", mode:DTV_720p, width:960, height:720 , interlace:PROGRESSIVE, field:FRAME},
];

Screen.setMode(screenModes[0].mode, screenModes[0].width, screenModes[0].height, CT16S, screenModes[0].interlace, screenModes[0].field);

var canvas = Screen.getMode();

// general settings
let gamePlaying = false;
let optionsMenu = false;
let moddingMenu = false;
var gravity = 0.5f;
var speed = 6.2f;
const size = [51, 36];
var jump = -10.0f;
var cTenth = (canvas.width / 10);

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

var volume = 50;

setChVolume(volume);

var timer = Timer.new();

const main_menu_entries = [{text:"Start game", width:font.getTextSize("Start game").width, height:font.getTextSize("Start game").height, func: () => { gamePlaying = true; }},
                           {text:"Mods", width:font.getTextSize("Mods").width, height:font.getTextSize("Mods").height, func: () => { moddingMenu = true; }},
                           {text:"Options", width:font.getTextSize("Options").width, height:font.getTextSize("Options").height, func:  () => { optionsMenu = true; }}];

var main_menu_ptr = 0;

const options_menu_entries = [{text:`Volume: ${volume}`, width:font.getTextSize(`Volume: ${volume}`).width, height:font.getTextSize(`Volume: ${volume}`).height, func: () => { 
    options_menu_entries[0].text = `Volume: ${volume}`;
    options_menu_entries[0].width = font.getTextSize(`Volume: ${volume}`).width;
    options_menu_entries[0].height = font.getTextSize(`Volume: ${volume}`).height;
    if(Pads.check(pads.new, Pads.LEFT) && volume > 0 && Timer.getTime(timer) % 100 < 15) {
        volume--;
        setChVolume(volume);
    } else if(Pads.check(pads.new, Pads.RIGHT) && volume < 100 && Timer.getTime(timer) % 100 < 15) {
        volume++;
        setChVolume(volume);
    }
}},
{text:`Screen mode: ${screenModes[0].name}`, width:font.getTextSize(`Screen mode: ${screenModes[0].name}`).width, height:font.getTextSize(`Screen mode: ${screenModes[0].name}`).height, func: () => { 
    options_menu_entries[1].text = `Screen mode: ${screenModes[0].name}`;
    options_menu_entries[1].width = font.getTextSize(`Screen mode: ${screenModes[0].name}`).width;
    options_menu_entries[1].height = font.getTextSize(`Screen mode: ${screenModes[0].name}`).height;
    if(Pads.check(pads.new, Pads.LEFT) && volume > 0 && Timer.getTime(timer) % 150 < 15) {
        screenModes.unshift(screenModes.pop());
    } else if(Pads.check(pads.new, Pads.RIGHT) && Timer.getTime(timer) % 150 < 15) {
        screenModes.push(screenModes.shift());
    } else if(Pads.check(pads.new, Pads.CROSS), Pads.check(pads.old, Pads.CROSS)) {
        pipeGap = Math.floor(pipeGap * (screenModes[0].height/canvas.height));
        size[0] = size[0]*(screenModes[0].width/canvas.width);
        size[1] = size[1]*(screenModes[0].height/canvas.height);
        jump = jump * (screenModes[0].height/canvas.height);
        Screen.setMode(screenModes[0].mode, screenModes[0].width, screenModes[0].height, CT16S, screenModes[0].interlace, screenModes[0].field);
        canvas = Screen.getMode();
        cTenth = (canvas.width / 10);
        setup();
    }
}},
{text:`Pipes gap: ${pipeGap}`, width:font.getTextSize(`Pipes gap: ${pipeGap}`).width, height:font.getTextSize(`Pipes gap: ${pipeGap}`).height, func: () => { 
    options_menu_entries[2].text = `Pipes gap: ${pipeGap}`;
    options_menu_entries[2].width = font.getTextSize(`Pipes gap: ${pipeGap}`).width;
    options_menu_entries[2].height = font.getTextSize(`Pipes gap: ${pipeGap}`).height;
    if(Pads.check(pads.new, Pads.LEFT) && pipeGap > 0 && Timer.getTime(timer) % 100 < 15) {
        pipeGap--;
    } else if(Pads.check(pads.new, Pads.RIGHT) && pipeGap < canvas.width && Timer.getTime(timer) % 100 < 15) {
        pipeGap++;
    }
}},
{text:`Jump: ${(-jump).toFixed(1)}`, width:font.getTextSize(`Jump: ${(-jump).toFixed(1)}`).width, height:font.getTextSize(`Jump: ${(-jump).toFixed(1)}`).height, func: () => { 
    options_menu_entries[3].text = `Jump: ${(-jump).toFixed(1)}`;
    options_menu_entries[3].width = font.getTextSize(`Jump: ${(-jump).toFixed(1)}`).width;
    options_menu_entries[3].height = font.getTextSize(`Jump: ${(-jump).toFixed(1)}`).height;
    if(Pads.check(pads.new, Pads.LEFT) && jump < 0.5 && Timer.getTime(timer) % 100 < 15) {
        jump += 0.1;
    } else if(Pads.check(pads.new, Pads.RIGHT) && jump > -50.0 && Timer.getTime(timer) % 100 < 15) {
        jump -= 0.1;
    }
}}
];

var options_menu_ptr = 0;

const modding_menu_entries = [{text:`Bird: ${current_skin}`, width:font.getTextSize(`Bird: ${current_skin}`).width, height:font.getTextSize(`Bird: ${current_skin}`).height, func: () => { 
    modding_menu_entries[0].text = `Bird: ${current_skin}`;
    modding_menu_entries[0].width = font.getTextSize(`Bird: ${current_skin}`).width;
    modding_menu_entries[0].height = font.getTextSize(`Bird: ${current_skin}`).height;
    if(Pads.check(pads.new, Pads.LEFT) && Timer.getTime(timer) % 150 < 15) {
        skin_names.unshift(skin_names.pop());
        setCurrentSkin(skins, skin_names[0]);
        current_skin = skin_names[0];
    } else if(Pads.check(pads.new, Pads.RIGHT) && Timer.getTime(timer) % 150 < 15) {
        skin_names.push(skin_names.shift());
        setCurrentSkin(skins, skin_names[0]);
        current_skin = skin_names[0];
    }
}}];

var modding_menu_ptr = 0;

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
    bird_states[Math.floor((index % 9) / 3)].draw(((canvas.width / 2) - size[0] / 2), flyHeight);
    flyHeight = (canvas.height / 2) - (size[1] / 2);
    // text accueil
    let score_size = font.getTextSize(`Best score : ${bestScore}`); 
    font.print(canvas.width/2-score_size.width/2, 15, `Best score : ${bestScore}`);

    if (!optionsMenu) {

        if (!moddingMenu) {
            for(let i = 0; i < main_menu_entries.length; i++) {
                if (i == main_menu_ptr) {
                    font.print(canvas.width/2-main_menu_entries[i].width/2-20, (canvas.height*0.8f)+(i*30), ">");
                    font.print(canvas.width/2+main_menu_entries[i].width/2+5, (canvas.height*0.8f)+(i*30), "<");
                }
                font.print(canvas.width/2-main_menu_entries[i].width/2, (canvas.height*0.8f)+(i*30), main_menu_entries[i].text);
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
            for(let i = 0; i < modding_menu_entries.length; i++) {
                if (i == modding_menu_ptr) {
                    font.print(canvas.width/2-modding_menu_entries[i].width/2-20, (canvas.height*0.8f)+(i*30), ">");
                    font.print(canvas.width/2+modding_menu_entries[i].width/2+5, (canvas.height*0.8f)+(i*30), "<");
                }
                font.print(canvas.width/2-modding_menu_entries[i].width/2, (canvas.height*0.8f)+(i*30), modding_menu_entries[i].text);
            }
        
            pads.old = pads.new;
            pads.new = Pads.get();
        
            if(Pads.check(pads.new, Pads.UP) && !Pads.check(pads.old, Pads.UP) && modding_menu_ptr > 0) {
                modding_menu_ptr--;
            }
        
            if(Pads.check(pads.new, Pads.DOWN) && !Pads.check(pads.old, Pads.DOWN) && modding_menu_ptr < modding_menu_entries.length-1) {
                modding_menu_ptr++;
            }
        
            if(Pads.check(pads.new, Pads.TRIANGLE) && !Pads.check(pads.old, Pads.TRIANGLE)) {
                moddingMenu = false;
            }
    
            modding_menu_entries[modding_menu_ptr].func();
        }

    } else {

        for(let i = 0; i < options_menu_entries.length; i++) {
            if (i == options_menu_ptr) {
                font.print(canvas.width/2-options_menu_entries[i].width/2-20, (canvas.height*0.73f)+(i*30), ">");
                font.print(canvas.width/2+options_menu_entries[i].width/2+5, (canvas.height*0.73f)+(i*30), "<");
            }
            font.print(canvas.width/2-options_menu_entries[i].width/2, (canvas.height*0.73f)+(i*30), options_menu_entries[i].text);
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
            while (screenModes[0].mode != canvas.mode) {
                screenModes.push(screenModes.shift());
            }
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
