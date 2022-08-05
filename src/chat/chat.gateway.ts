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
import { UseGuards } from '@nestjs/common';
import { NewThrottlerGuard } from '../app.module';

@WebSocketGateway({
  transports: ['websocket'],
  cors: {
    origin:
      process.env.NODE_ENV === 'production' ? 'https://privchat.surge.sh' : '*',
    credentials: true,
  },
  httpCompression: true,
  maxHttpBufferSize: 1e6,
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private totalUsers = 0;
  private chats = {};

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket, ...args: any[]) {
    this.totalUsers++;
    console.log(this.totalUsers);
  }

  afterInit(server: Server) {
    // console.log('Init');
  }

  handleDisconnect(client: Socket) {
    Object.keys(this.chats).forEach((key) => {
      const chat = this.chats[key];
      const index = chat.users.indexOf(client.id);
      if (index > -1) {
        chat.users.splice(index, 1);
        chat.users.forEach((user) => {
          this.server.to(user).emit('left');
        });
      }
      if (chat.users.length === 0) {
        delete this.chats[key];
      }
    });
  }

  @SubscribeMessage('createChat')
  createChat(@ConnectedSocket() client: Socket) {
    const uuid = uuidv4();
    client.join(uuid);
    this.chats[uuid] = {
      users: [client.id],
    };
    client.emit('created', uuid);
  }

  @SubscribeMessage('joinChat')
  joinChat(@ConnectedSocket() client: Socket, @MessageBody() id: string) {
    const roomExist = this.chats[id];

    if (!roomExist) {
      return this.server.to(client.id).emit('roomNotExist');
    }

    client.rooms.forEach((room) => {
      if (room !== client.id) {
        client.leave(room);
      }
    });

    client.join(id);
    this.chats[id].users.push(client.id);
    this.server.to(client.id).emit('roomFound', id);
    client.broadcast.to(id).emit('joined');
  }

  // @UseGuards(NewThrottlerGuard)
  @SubscribeMessage('sendMessage')
  sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: string,
  ) {
    client.rooms.forEach((room) => {
      if (room !== client.id) {
        client.broadcast.to(room).emit('message', message);
      }
    });
  }
}
