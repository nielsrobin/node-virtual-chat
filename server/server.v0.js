var _ = require('underscore');
var io = require('socket.io').listen(8888);

var players = [];
var map = {
	tiles: [
		[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		[0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,0],
		[0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0],
		[0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,0],
		[0,1,1,1,1,1,0,1,1,1,0,0,0,0,0,1,1,1,0,1,1,1,0],
		[0,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,0,1,1,1,0],
		[0,0,0,1,0,0,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,0,1,1,1,0,0,0,0,0,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,0],
		[0,0,0,1,0,0,0,0,0,0,0,1,1,1,0,1,1,1,0,1,1,1,0],
		[0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,0],
		[0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,0],
		[0,1,1,1,1,1,1,0,1,0,0,0,0,0,0,1,1,1,0,1,1,1,0],
		[0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,0],
		[0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,0],
		[0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,0],
		[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	],
	startingArea: {
		top: 1, 
		left: 1,
		bottom: 5, 
		right: 5
	}
};


io.sockets.on('connection', function (socket) {

	socket.on('move', function (data) {
		_.each(players,function(p){
			if(p.id == data.pid)
			{
				p.loc = data.loc;
			}
		});
		
		socket.broadcast.emit('move', data);
	});

	socket.on('say', function (data) {
		socket.broadcast.emit('say', data);
	});

	socket.on('getMap', function () {
		socket.emit('map', map.tiles);
		socket.emit('players', players);
	});
	
	socket.on('playerJoined', function (data) {
		players.push(data);
		socket.broadcast.emit('addPlayer', data);
		
		socket.set('pid', data.id);
      	
      	socket.on('disconnect', function () {
      		socket.get('pid', function (err, pid) {
	    		io.sockets.emit('removePlayer', pid);
	    		
	    		for(var i=0; i<players.length; i++)
				{
					if(players[i].id == pid)
					{
						players.splice(i,1);
					}
				}
    		});
  		});

	});
	
	socket.on('newPlayer', function (data) {
		data.loc = getStartingCoords(players, map.startingArea);
		data.id = new Date().getTime();
		players.push(data);
		socket.emit('player', data);
		socket.broadcast.emit('addPlayer', data);
		
		socket.set('pid', data.id);
      	
      	socket.on('disconnect', function () {
      		socket.get('pid', function (err, pid) {
	    		io.sockets.emit('removePlayer', pid);
	    		
	    		for(var i=0; i<players.length; i++)
				{
					if(players[i].id == pid)
					{
						players.splice(i,1);
					}
				}
    		});
  		});
	});  
});

function getStartingCoords(players, area) {
	return { x: Math.floor(Math.random()*area.right-area.left)+area.left+1, y: Math.floor(Math.random()*area.bottom-area.top)+area.top+1 };
}