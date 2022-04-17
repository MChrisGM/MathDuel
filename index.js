var express = require('express');
var app = express();
var fs = require('fs');

app.use(express.static('public'));

let lobbies = {};
let players = {};

function listen() {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Started server at https://' + host + ':' + port);
    setInterval(function () {
      console.log('Lobbies: ',lobbies);
      console.log('Players: ',players);
    }, 1000);
}

var server = app.listen(process.env.PORT || 3000, listen);

var io = require('socket.io')(server);

io.sockets.on('connection',
    function (socket) {

      players[socket.id]={
        lobby_id : null,
        ready : false,
      };

      socket.on('create_lobby', function(data){
        if(!players[socket.id].lobby_id){
          let code = randomString(5, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
          lobbies[code] = {
            id : code,
            players : { 0 : null, 1 : null},
            started : false,
            questions : {},
            answers : {},
            scores : {},
            indices : {},
            finished : false
          }
          players[socket.id].lobby_id = code;
          lobbies[code].players[0] = socket.id;
          socket.join(code);
          socket.emit('joined_lobby', lobbies[code]);
        }
      });

      socket.on('join_lobby', function(code){
        if(lobbies.hasOwnProperty(code)){
          players[socket.id].lobby_id = code;
          lobbies[code].players[1] = socket.id
          socket.join(code);
          socket.emit('joined_lobby', lobbies[code]);
        }
      })

      socket.on('player_ready', function(data){
        players[socket.id].ready = data;
        let ps = getPlayerStates(lobbies[players[socket.id].lobby_id]);
        io.in(players[socket.id].lobby_id).emit('ready_status', ps);
        
        if(ps.p1.ready && ps.p2.ready){
          start_lobby(players[socket.id].lobby_id);
        }
      });

      socket.on('started', function(data){

        lobbies[players[socket.id].lobby_id].started = true;
        
        let id1 = lobbies[players[socket.id].lobby_id].players[0];
        let id2 = lobbies[players[socket.id].lobby_id].players[1];

        lobbies[players[socket.id].lobby_id].scores[id1] = 0;
        lobbies[players[socket.id].lobby_id].scores[id2] = 0;

        lobbies[players[socket.id].lobby_id].indices[id1] = 0;
        lobbies[players[socket.id].lobby_id].indices[id2] = 0;
        
        // socket.emit('receive_question', parse(lobbies[players[socket.id].lobby_id].questions[0]));
        // lobbies[players[socket.id].lobby_id].indices[socket.id] += 1;
      });

      socket.on('next_question', function(data){
        let idx = lobbies[players[socket.id].lobby_id].indices[socket.id];
        if(idx<10){
          socket.emit('receive_question', parse(lobbies[players[socket.id].lobby_id].questions[idx]));
          lobbies[players[socket.id].lobby_id].indices[socket.id] += 1;
        }else{
          io.in(players[socket.id].lobby_id).emit("player_finished"); 
        }
      });

      socket.on('submission',function(data){
        let qidx = lobbies[players[socket.id].lobby_id].indices[socket.id];
        if(Number(data) == lobbies[players[socket.id].lobby_id].answers[qidx-1]){
          lobbies[players[socket.id].lobby_id].scores[socket.id]+=1;
          socket.emit('sub_correct');
        }else{
          socket.emit('sub_wrong');
        }
      });

      socket.on('results', function(data){
        results = {};
        socket.emit('returned_results', results);
      });

      socket.on('disconnect', function(){
        socket.to(players[socket.id].lobby_id).emit('disconn');
        delete lobbies[players[socket.id].lobby_id]
        delete players[socket.id]
      });
      
    }
);

function getPlayerStates(lobby){
  let ps = {
    p1: {id: lobby.players[0], ready: false},
    p2: {id: lobby.players[1], ready: false},
  };

  try{
    ps.p1.ready = players[lobby.players[0]].ready;
  }catch(e){}

  try{
    ps.p2.ready = players[lobby.players[1]].ready;
  }catch(e){}
  
  return ps
}

function parse(question){
  const convert = {
    0:'+',
    1:'-',
    2:'*',
    3:'/',
  };
  let q = question.nums[0] + ' '+ convert[question.ops[0]] +' '+question.nums[1]+' = ?';
  return `${q} (1 d.p.)`;
}


function start_lobby(lobby_code){
  let questions = generateQuestions(10);
  lobbies[lobby_code].questions = questions;
  let answers = solve(questions);
  lobbies[lobby_code].answers = answers;
  io.in(lobby_code).emit("start"); 
}


const operations = {
  'operation':['a','s','m','d'],
  'a':0,
  's':1,
  'm':2,
  'd':3
};

function createExpression(difficulty){
  let num1 = Math.floor(Math.random() * 100)+1;
  let num2 = Math.floor(Math.random() * 100)+1;
  let ops = operations['operation'];
  let op = operations[ops[Math.floor(Math.random()*ops.length)]];
  return {nums:[num1,num2],ops:[op]};
}

function generateQuestions(length){
  let questions = {};
  for(let i=0;i<length;i++){
    let q = {};
    let expression = createExpression(0);
    q = expression;
    questions[i] = q;
  }
  return questions;
}

function solve(questions){
  let answers = {};
  for(let i=0;i<Object.keys(questions).length;i++){
    let q = questions[i];
    switch(q.ops[0]){
      case 0:
        answers[i] = q.nums[0]+q.nums[1];
        break;
      case 1:
        answers[i] = q.nums[0]-q.nums[1];
        break;
      case 2:
        answers[i] = q.nums[0]*q.nums[1];
        break;
      case 3:
        answers[i] = Math.round(q.nums[0]/q.nums[1] * 10 )/10;
        break;
    }
  }  
  return answers;
}

function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}
