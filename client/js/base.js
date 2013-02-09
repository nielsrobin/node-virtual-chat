var socket = io.connect(webconfig.server);
var tileSize = 32;
var players = [];
var tiles = [];
var center = { x: 304, y: 177 };


var body = { h: $(document).height() - 5, w: $("body").width()};
//$("body").append("<canvas id='board' width='" + body.w + "' height='" + body.h + "'></canvas>");
var s = new CanvasState(document.getElementById('board'));

var $createPlayer = $("#createPlayer");

/* Loading */
socket.emit('getMap');

var player = store.get("player");

if(player != undefined) 
{
	// wee found him
	s.player = new Entity(player.name, "player", player.loc.x, player.loc.y, false, tileSize, tileSize, 2);
	s.valid = false;
	socket.emit('playerJoined', player);
	s.interval = 250;
}
else
{
	$createPlayer.show();
}

$("#join").click(function(){
	createNewPlayer($("#createPlayer input.text").attr("value"));
	$createPlayer.hide();
});

function createNewPlayer(name)
{
	player = {
		name: name,
		loc: {},
		id: new Date().getTime()
	}
	
	socket.emit('newPlayer', { name: player.name });
}

socket.on('map', function (data) {
	buildMap(data, s);
	tiles = data;
});

socket.on('player', function (data) {
	player = data;
	s.player = new Entity(player.name, "player", player.loc.x, player.loc.y, false, tileSize, tileSize, 2);
	s.valid = false;
	
	store.set("player",player);
	s.interval = 250;
});

socket.on('addPlayer', function (data) {
	players.push(data);
	
	s.players.push(new Entity(p.name, "other", data.loc.x, data.loc.y, false, tileSize, tileSize, 2));
	s.valid = false;
});

socket.on('removePlayer', function (data) {
	
	for(var i=0; i<players.length; i++)
	{
		if(players[i].id == data)
		{
			players.splice(i,1);
		}
	}
	
	s.players = []
	
	_.each(players, function(p){
		s.players.push(new Entity(p.name,"other", p.loc.x, p.loc.y, false, tileSize, tileSize, 2));
	});
	
	s.valid = false;
});

socket.on('players', function (data) {
	_.each(data,function(entity){
		players.push(entity);
		s.players.push(new Entity(entity.name,"other", entity.loc.x, entity.loc.y, false, tileSize, tileSize, 2));
	});
	s.valid = false;	
});

socket.on('move', function (data) {

	s.players = []
	
	_.each(players, function(p){
		if(p.id == data.id) p.loc = { x: data.x, y: data.y };
		s.players.push(new Entity(p.name,"other", p.loc.x, p.loc.y, false, tileSize, tileSize, 2));
	});
	
	s.valid = false;
});

function move(e){
	socket.emit('move', { id: e.id, x: e.loc.x, y: e.loc.y });
}

function say(message)
{
    if(message.length > 0)
    {
	    $chat.append("<p class='light-rounded shadowed'>You: " + message + "</p>");
	    socket.emit('say', { name: player.name, msg: message });	
    }
}

socket.on('say', function (data) {
	$chat.append("<p class='light-rounded shadowed'>" + data.name + ": " + data.msg + "</p>");
});

function buildMap(mapMatrix)
{
	_.each(mapMatrix, function(row, y){ _.each(row, function(tile, x){
			s.tiles.push(getTileFromInt(tile, x, y));
	}); });
}

function getTileFromInt(tile, x, y)
{
	switch (tile)
	{
		case 0:
			return new Entity(undefined, "wall-0", x, y, false, tileSize, tileSize, 0);
		case 1:
			return new Entity(undefined,"ground-0", x, y, true, tileSize, tileSize, 0);
	}		
}

function Entity (name, spriteName, x, y, passable, w, h, sequence) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.sprite = new Image();
    this.sprite.src = "img/" + spriteName + "-" + tileSize + ".png";
    this.spriteName = spriteName;
    this.passable = passable;
    this.sequence = sequence;
    this.current = 0;
}

Entity.prototype.draw = function(ctx) {
	if(player != undefined)
	{

    ctx.drawImage(this.sprite, this.current * 32, 0, 32, 32, this.x * tileSize + center.x - player.loc.x * 32, this.y * tileSize + center.y - player.loc.y * 32, this.w, this.h);
    if(this.sequence > this.current) this.current++;
    else this.current = 0;
    if(this.name != undefined) 
    {
    	ctx.font = "12pt Calibri";
    	ctx.fillStyle = "white";
    	ctx.textAlign = "center";
    	ctx.fillText(this.name, this.x * tileSize + center.x - player.loc.x * 32 + 16, this.y * tileSize + center.y - player.loc.y * 32 - 2);
    }
    }
}

Entity.prototype.updateLoc = function(x, y) {
	this.x = x;
	this.y = y;
}

function CanvasState(canvas) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = canvas.getContext('2d');

    // fixes mouse stuff
    var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
    if (document.defaultView && document.defaultView.getComputedStyle) {
        this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10) || 0;
        this.stylePaddingTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10) || 0;
        this.styleBorderLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
        this.styleBorderTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10) || 0;
    }
    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;

    // **** Keep track of state! ****
    this.valid = false; // when set to false, the canvas will redraw everything
    this.tiles = [];  // the collection of things to be drawn
    this.player = {};
	this.players = [];

    this.dragoffx = 0; // See mousedown and mousemove events for explanation
    this.dragoffy = 0;

    // **** Then events! ****
    var myState = this;

    this.interval = 250;
    setInterval(function () {
        myState.draw();
    }, myState.interval);
}

CanvasState.prototype.clear = function () {
    this.ctx.clearRect(0, 0, this.width, this.height);
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.draw = function () {
    // if our state is invalid, redraw and validate!
    if (!this.valid) {
        var ctx = this.ctx;
        var tiles = this.tiles;
        var players = this.players;
        var p = this.player;
        this.clear();

        // draw all tiles
        _.each(tiles, function(tile){
	    	// We can skip the drawing of elements that have moved off the screen:
			if (tile.x > this.width || tile.y > this.height || tile.x + tile.w < 0 || tile.y + tile.h < 0) {}
			else {tile.draw(ctx)};
        });
        
        // draw all tiles
        _.each(players, function(player){
	    	// We can skip the drawing of elements that have moved off the screen:
			if (player.x > this.width || player.y > this.height || player.x + player.w < 0 || player.y + player.h < 0) {}
			else {player.draw(ctx)};
        });
        
        
        if(player != undefined) p.draw(ctx);
        
        // ** Add stuff you want drawn on top all the time here **

        //this.valid = true;
    }
}

var keyboard = 
{
	return: 13,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    b: 66,
    c: 67,
    d: 68,
    i: 73,
    s: 83,
    n0: 48,
    n1: 49,
    n2: 50,
    n3: 51,
    n4: 52,
    n5: 53,
    n6: 54,
    n7: 55,
    n8: 56,
    n9: 57
};

$("#ipad-up").click(function(){ keydown({ keyCode: keyboard.up }); });
$("#ipad-left").click(function(){ keydown({ keyCode: keyboard.left }); });
$("#ipad-right").click(function(){ keydown({ keyCode: keyboard.right }); });
$("#ipad-down").click(function(){ keydown({ keyCode: keyboard.down }); });


var $chatbox = $("#chatbox input");
var $chat = $("#chat");

$(document).keydown(keydown);

function keydown(e) {
	if(e.keyCode >= keyboard.left && e.keyCode <= keyboard.down)
	{
		// movement
		switch (e.keyCode)
		{
			case keyboard.left:
				if(tiles[player.loc.y][player.loc.x-1] == 1) player.loc.x--;
				break;
			case keyboard.right:
				if(tiles[player.loc.y][player.loc.x+1] == 1) player.loc.x++;
				break;
			case keyboard.up:
				if(tiles[player.loc.y-1][player.loc.x] == 1) player.loc.y--;
				break;
			case keyboard.down:
				if(tiles[player.loc.y+1][player.loc.x] == 1) player.loc.y++;
				break;
			default:
				break;
		}
		
		s.player.updateLoc(player.loc.x, player.loc.y);
		move(player);
		store.set("player",player);
	}
    else if(e.keyCode == keyboard.return)
    {
    	// chat
    	$chatbox.toggle();
    	if($chatbox.css("display") == "inline-block")
    	{
    		$chatbox.focus();
    	}
    	else
    	{
    		say($chatbox.attr("value"));
    		$chatbox.attr("value","");
    	}
    	
		return false; 
	}
	else if(e.keyCode == keyboard.c)
	{
		$chat.toggle();
	}
}