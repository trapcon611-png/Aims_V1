import { Controller, Get, Post, Body } from '@nestjs/common';
import { BatchesService } from './batches.service';

@Controller('batches')
export class BatchesController {
  constructor(private readonly service: BatchesService) {}

  @Post()
  create(@Body() body: { name: string }) {
    return this.service.create(body.name);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}