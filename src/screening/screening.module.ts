import { Module } from '@nestjs/common';
import { ScreeningService } from './screening.service';
import { ScreeningController } from './screening.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ScreeningController],
  providers: [ScreeningService, PrismaService],
})
export class ScreeningModule {}
