const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {pingInterval: 2000, pingTimeout:5000});



app.use(express.static(__dirname));

var players = {}
var bulletID = 0;


io.on('connection', (socket) => {
    console.log('A player joined!');
    players[socket.id] = {
        position: {
            x: 30, 
            y: 10, 
            z: 0,
        },
        forwardVector: {},
        quaternion : {},
        bullets: {},
        gun: "",
    }
    //io.emits for EVERYONE, and socket.emit emit for 1 player!!
    io.emit('updatePlayers', players);

    socket.on("disconnect", (reason)=>{
        console.log(reason);
        delete players[socket.id];
        io.emit("updatePlayers", players);
    });
    socket.on("updateMovement", ({x, y, z, quaternion, forwardVector, gun})=>{
        players[socket.id].position.x = x;
        players[socket.id].position.y = y;
        players[socket.id].position.z = z;
        players[socket.id].quaternion = quaternion;
        players[socket.id].forwardVector = forwardVector;
        players[socket.id].gun = gun;
    });
    var bulletsContainer = players[socket.id].bullets;
    socket.on("updateBullets", ()=>{
        if(!bulletsContainer[bulletID]){
            bulletsContainer[bulletID] = {
                exists: true,
            }
            bulletID++;
        } 
        console.log(players[socket.id].bullets);
    });

    socket.on("getCurrentBulletID", ()=>{
        socket.emit("currentBulletID", bulletID);
    });
    
    socket.on("shotSuper", ()=>{
        io.emit("playerSupered", ({
            x: players[socket.id].position.x,
            y: players[socket.id].position.y,
            z: players[socket.id].position.z,
            quaternion: players[socket.id].quaternion,
        }))
    });

    socket.on("deleteBullets", ({id})=>{
        if(bulletsContainer[id]){
            delete bulletsContainer[id];
            console.log("deleted " + id);

        }
        // console.log("ran delete");
        
    });

    console.log(players);

});

setInterval(()=>{
    io.emit("updatePlayers", players);
}, 15);

const PORT = process.env.PORT || 80;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
