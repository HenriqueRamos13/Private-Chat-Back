import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { v4 as uuidv4 } from 'uuid';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({
  transports: ['websocket'],
  cors: {
    origin: ['http://localhost:5173', 'https://privchat.surge.sh'],
    credentials: true,
  },
  httpCompression: true,
  maxHttpBufferSize: 1e6,
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private totalUsers = 0;

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket, ...args: any[]) {
    // console.log(`Client connected: ${client.id}`);
    this.totalUsers++;
    console.log(this.totalUsers);
  }

  afterInit(server: Server) {
    // console.log('Init');
  }

  handleDisconnect(client: Socket) {
    // console.log(`Client disconnected: ${client.id}`);
    client.rooms.forEach((room) => {
      if (room !== client.id) {
        client.broadcast.to(room).emit('left');

        client.leave(room);
      }
    });
  }

  @SubscribeMessage('createChat')
  createChat(@ConnectedSocket() client: Socket) {
    const uuid = uuidv4();
    client.join(uuid);
    client.emit('created', uuid);
  }

  @SubscribeMessage('joinChat')
  joinChat(@ConnectedSocket() client: Socket, @MessageBody() id: string) {
    // console.log('joinChat', id);
    client.rooms.forEach((room) => {
      if (room !== client.id) {
        client.leave(room);
      }
    });

    client.join(id);
    client.broadcast.to(id).emit('joined');
  }

  @SubscribeMessage('sendMessage')
  sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: string,
  ) {
    // console.log('sendMessage');
    client.rooms.forEach((room) => {
      if (room !== client.id) {
        // console.log(room, message);
        client.broadcast.to(room).emit('message', message);
      }
    });
  }
}
