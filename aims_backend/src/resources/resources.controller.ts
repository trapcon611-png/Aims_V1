import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ResourcesService } from './resources.service';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get()
  findAll(@Query('batchId') batchId: string) {
    return this.service.findByBatch(batchId);
  }
}