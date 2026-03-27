import { Controller, Get, Post, Delete, Body, Param, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('carousel')
  getCarousel() {
    return this.appService.getCarouselImages();
  }

  @Post('carousel')
  addCarousel(@Body() body: { imageUrl: string; aspectRatio: string }) {
    if (!body.imageUrl) throw new BadRequestException('Image URL/Base64 is required');
    return this.appService.addCarouselImage(body);
  }

  @Delete('carousel/:id')
  deleteCarousel(@Param('id') id: string) {
    return this.appService.deleteCarouselImage(id);
  }
}