import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AttendanceGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinClass')
  handleJoinClass(
    @MessageBody() classId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`class-${classId}`);
  }

  @SubscribeMessage('leaveClass')
  handleLeaveClass(
    @MessageBody() classId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`class-${classId}`);
  }

  notifyAttendanceUpdate(classId: string, attendanceData: any) {
    this.server.to(`class-${classId}`).emit('attendanceUpdate', attendanceData);
  }
}