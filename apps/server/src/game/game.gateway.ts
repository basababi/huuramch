import { C2S, type ClientEvent } from '@khuuramch/protocol';
import { Inject, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';

/**
 * Socket.IO gateway (§3.2): a thin shell. Every handler returns the room service's `Ack`, which
 * Nest sends back as the Socket.IO acknowledgement.
 */
@WebSocketGateway()
export class GameGateway
  implements OnGatewayInit<Server>, OnGatewayDisconnect<Socket>, OnModuleInit, OnModuleDestroy
{
  private sweeper: ReturnType<typeof setInterval> | null = null;

  constructor(@Inject(RoomService) private readonly rooms: RoomService) {}

  afterInit(server: Server): void {
    this.rooms.attach({
      send: (socketId, event, payload) => server.to(socketId).emit(event, payload),
    });
  }

  onModuleInit(): void {
    this.sweeper = setInterval(() => void this.rooms.sweep(), 60_000);
    this.sweeper.unref();
  }

  onModuleDestroy(): void {
    if (this.sweeper) clearInterval(this.sweeper);
    this.rooms.dispose();
  }

  handleDisconnect(socket: Socket): void {
    void this.rooms.socketDisconnected(socket.id);
  }

  private on(event: ClientEvent, socket: Socket, body: unknown) {
    return this.rooms.handle(socket.id, event, body);
  }

  @SubscribeMessage(C2S.roomCreate)
  roomCreate(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.roomCreate, s, b);
  }

  @SubscribeMessage(C2S.roomJoin)
  roomJoin(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.roomJoin, s, b);
  }

  @SubscribeMessage(C2S.roomRejoin)
  roomRejoin(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.roomRejoin, s, b);
  }

  @SubscribeMessage(C2S.roomPeek)
  roomPeek(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.roomPeek, s, b);
  }

  @SubscribeMessage(C2S.roomLeave)
  roomLeave(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.roomLeave, s, b);
  }

  @SubscribeMessage(C2S.roomUpdateSettings)
  roomUpdateSettings(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.roomUpdateSettings, s, b);
  }

  @SubscribeMessage(C2S.roomKick)
  roomKick(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.roomKick, s, b);
  }

  @SubscribeMessage(C2S.gameStart)
  gameStart(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.gameStart, s, b);
  }

  @SubscribeMessage(C2S.roleConfirm)
  roleConfirm(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.roleConfirm, s, b);
  }

  @SubscribeMessage(C2S.roleForce)
  roleForce(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.roleForce, s, b);
  }

  @SubscribeMessage(C2S.turnDone)
  turnDone(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.turnDone, s, b);
  }

  @SubscribeMessage(C2S.discussionSkip)
  discussionSkip(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.discussionSkip, s, b);
  }

  @SubscribeMessage(C2S.voteCast)
  voteCast(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.voteCast, s, b);
  }

  @SubscribeMessage(C2S.guessSubmit)
  guessSubmit(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.guessSubmit, s, b);
  }

  @SubscribeMessage(C2S.roundContinue)
  roundContinue(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.roundContinue, s, b);
  }

  @SubscribeMessage(C2S.gameReplay)
  gameReplay(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.gameReplay, s, b);
  }

  @SubscribeMessage(C2S.tvWatch)
  tvWatch(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.tvWatch, s, b);
  }

  @SubscribeMessage(C2S.clockPing)
  clockPing(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.on(C2S.clockPing, s, b);
  }
}
