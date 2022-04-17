const socket = io(window.location.href);

const views = {
  0:'mm',
  1:'lob',
  2:'cont',
  3:'res'
}

let state = views[0];

function setup(){
  socket_functions();

  document.getElementById("lobby_join_form").addEventListener("submit",(e)=>{
    e.preventDefault();
    let code = document.getElementById("lobby_code").value;
    socket.emit("join_lobby", code);
  });
  document.getElementById("answer_form").addEventListener("submit",(e)=>{
    e.preventDefault();
    let answer = document.getElementById("answer").value;
    socket.emit("submission", answer);
    document.getElementById("answer").value = null;
  });
}


function draw(){
  let mm = document.getElementById('mainmenu');
  let lob = document.getElementById('lobby');
  let cont = document.getElementById('container');
  let res = document.getElementById('results');
  mm.style.display = "none";
  lob.style.display = "none";
  cont.style.display = "none";
  res.style.display = "none";
  switch(state){
    case views[0]:
      mm.style.display = "block";
      break;
    case views[1]:
      lob.style.display = "block";
      break;
    case views[2]:
      cont.style.display = "block";
      break;
    case views[3]:
      res.style.display = "block";
      break;
  }
}

function socket_functions(){
  socket.on('receive_question', function(data){
    document.getElementById('question').innerHTML = data;
  });
  socket.on('start', function(data){
    state = views[2];
    socket.emit('started');
    socket.emit("next_question");
  });
  socket.on('disconn', function(data){
    if(state != views[3]){
      location.reload();
    }
  });
  socket.on('joined_lobby', function(lobby){
    state = views[1];
    socket.emit("player_ready", false);
    document.getElementById('lobby_code_label').innerHTML = "Lobby Code: "+lobby.id;
  });
  socket.on('started_game', function(lobby){
    state = views[2];
  });
  socket.on('ready_status', function(data){
    let ps = {
      other: false,
      me: false,
    };
    
    if(data.p1.id == socket.id){ps.me = data.p1.ready;}
    else{ps.other = data.p1.ready;}
    
    if(data.p2.id == socket.id){ps.me = data.p2.ready;}
    else{ps.other = data.p2.ready;}

    document.getElementById('op_status').innerHTML = (ps.other) ? "Ready" : "Not Ready";
    document.getElementById('me_status').innerHTML = (ps.me) ? "Ready" : "Not Ready";
  });

  socket.on('sub_correct', function(data){
    socket.emit("next_question");
  });

  socket.on('sub_wrong', function(data){
    socket.emit("next_question");
  });
  
  socket.on('player_finished', function(data){
    state = views[3];
    socket.emit('results');
  });

  socket.on('returned_results', function(data){

    let ps = {
      other: 0,
      me: 0,
    };
    
    if(data.p1.id == socket.id){ps.me = data.p1.result;}
    else{ps.other = data.p1.result;}
    
    if(data.p2.id == socket.id){ps.me = data.p2.result;}
    else{ps.other = data.p2.result;}

    document.getElementById('op_results').innerHTML = ps.other+" / 10";
    document.getElementById('me_results').innerHTML = ps.me+" / 10";
    
  });
  
}

function createLobby(){
  socket.emit("create_lobby");
}

function setReady(){
  socket.emit("player_ready", true);
}