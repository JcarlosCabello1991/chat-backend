import {Server} from 'socket.io'
import express from 'express'
import http from 'http'
import fetch from 'node-fetch'
import cors from 'cors'

const app = express();

app.use(cors({
    origin:'*'
}))

//Vercel
app.get('/', (req,res) => {
  res.send("Escuchando")
})

const server = http.createServer(app);
var usuarios = []

const io = new Server(server,{
  cors:{
    origin:'*'
}}); 

global.onlineUsers = new Map();
//Create the connection when user is logged in chat
io.on('connection', function (socket) {
  global.chatSocket = socket;

  //Update the users list on the array to send its information to each user
  socket.on('update_list', function( data )
	{
    console.log("######", data);
    
    var user = { idSocket: socket.id, id: data.id, usuario: data.usuario };
			
			// Save de user in the chat sessions array
			if(typeof usuarios[fnFindUser(data.id)] === 'undefined')
			{
				usuarios.push(user);
        console.log("USUARIOS CONECTADOS",usuarios);
        
			}
			else
			{
				usuarios[fnFindUser(data.id)] = user;
			}
      io.emit('session_update', usuarios.sort(fncompare), socket.id );
  })
  
  console.log(`hola, ${socket}`);

  //When user is connected we set in online user his id and socketId
  socket.on('connected', (userId) => {
    console.log(userId, socket.id);
    onlineUsers.set(userId, socket.id);
  })

  //Hearing when a user is typing a new message
  socket.on('typing', (data) => {
    console.log("DATA Typing", data);
    
    const receiverUserSocket = onlineUsers.get(data.to);
    console.log("DATOS USUARIO", usuarios);
    
    //Sending the typing message to the receiver user
    if(receiverUserSocket)socket.to(receiverUserSocket).emit(`typing`, data.msg)
    // socket.broadcast.to(data.to).emit('typing',data.msg)    
  })

  //Hearing when a user sends a new message
  socket.on("send-Message", (data) => {
    console.log("hola", data.to);
    console.log("msg", data.msg);
    console.log("socket", data.socket);
    console.log(data)
    const receiverUserSocket = onlineUsers.get(data.to);
    console.log("receiver",receiverUserSocket);
    
    const senderUserSocket = onlineUsers.get(data.sender);
    console.log("sender",senderUserSocket);

    //Sending the new message to the users of the current convertation
    if(senderUserSocket)socket.to(receiverUserSocket).emit(`${data.to}`, {msg:data.msg, from: data.sender})//receiverUserSocket
    // socket.broadcast.to(data.to).emit(`${data.receiver}`, {msg:data.msg, from: data.sender})
    io.emit(`${data.sender}`, {msg:data.msg, from: data.sender})
    console.log("USUARIOS", usuarios)
    //Updating the message on the dataBase 
    const updateMessages = async () => {
      try{
    const response = await fetch("http://localhost:5001/messages",{
        method:'POST',
        headers:{
          "Access-Control-Allow-Origin":'*',
          "Content-Type": "application/json"
        },
        body: JSON.stringify({sender: data.sender, receiver: data.to, msgs:data.msg, name:data.msg.split(':')[0]})
      })
    const dataResponse = await response.json()
    console.log("MSG",dataResponse);
      }catch(error){
        console.log(error.msg)
      }
    }
    updateMessages();
  })
})

//Search the user to set if is connected
function fnFindUser(id)
{
	for(var i = 0; i < usuarios.length; i++)
	{
		var u = usuarios[i];
		if(u.id == id)
			return i;
	}
	
	return -1;
}

//Compare de name of each user to sort in the array of connected users
function fncompare(a, b) 
{
  if (a.nombre < b.nombre)
    return -1;
  else if (a.nombre > b.nombre)
    return 1;
  else 
    return 0;
}

server.listen(process.env.PORT || 4000, () => {
  console.log("Server running");
})