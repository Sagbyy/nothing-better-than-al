import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  HttpException,
} from '@nestjs/common';
import { CreateScreeningDTO } from './dto/create-screening.dto';
import { UpdateScreeningDto } from './dto/update-screening.dto';
import { PrismaService } from '../prisma.service';
import { addDays, addMinutes, setHours, setMinutes } from 'date-fns';

@Injectable()
export class ScreeningService {
  private readonly logger = new Logger(ScreeningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateScreeningDTO) {
    const { movieId, movieTheaterId, start } = createDto;

    try {
      const movie = await this.prisma.movie.findUnique({
        where: { id: movieId },
      });
      if (!movie)
        throw new NotFoundException(`Movie with ID ${movieId} not found`);

      const theater = await this.prisma.movieTheater.findUnique({
        where: { id: movieTheaterId },
      });
      if (!theater)
        throw new NotFoundException(
          `Theater with ID ${movieTheaterId} not found`,
        );

      const startDate = new Date(start);
      const endDate = addMinutes(startDate, movie.duration + 30);

      const conflict = await this.prisma.screening.findFirst({
        where: {
          movieTheaterId,
          OR: [
            {
              start: { lte: endDate.toISOString() },
              end: { gte: startDate.toISOString() },
            },
          ],
        },
      });

      if (conflict) {
        throw new ConflictException(`Créneau occupé chef.`);
      }

      const hour = startDate.getHours();
      if (hour < 9 || hour >= 24) {
        throw new ConflictException(
          'Vous ne pouvez pas créer de séance en dehors des horaires (9h-00h).',
        );
      }

      const screening = await this.prisma.screening.create({
        data: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          date: startDate.toISOString(),
          nb_ticket: 0,
          movieId,
          movieTheaterId,
        },
      });

      return screening;
    } catch (error) {
      this.logger.error('Error creating screening', error.stack);
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Could not create screening');
    }
  }

  async createMany(screenings: CreateScreeningDTO[]) {
    return this.prisma.screening.createMany({
      data: screenings,
      skipDuplicates: true,
    });
  }

  async findAll() {
    return this.prisma.screening.findMany({
      include: {
        movie: true,
        movieTheater: true,
      },
    });
  }

  async getPlanning(start: string, end: string) {
    if (!start || !end) {
      this.logger.error('start and end dates are required!');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      this.logger.error('Invalid date format!');
    }

    if (startDate > endDate) {
      this.logger.error('start date must be before end date!!');
    }

    const screenings = this.prisma.screening.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        movie: true,
        movieTheater: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (!screenings) {
      const logger = new Logger('ScreeningService');
      logger.warn(`Aucnune séance trouvé entre le ${start} et le ${end}`);
    }

    return screenings;
  }

  async getTickets(id: number) {
    return this.prisma.screening.findUnique({
      where: { id },
      select: { nb_ticket: true },
    });
  }

  async findOne(id: number) {
    const screening = await this.prisma.screening.findUnique({
      where: { id },
      include: {
        movie: true,
        movieTheater: true,
      },
    });

    if (!screening) {
      throw new NotFoundException(`Screening with ID ${id} not found`);
    }

    return screening;
  }

  async update(id: number, updateDto: UpdateScreeningDto) {
    const existing = await this.prisma.screening.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Screening with ID ${id} not found`);
    }

    try {
      const { movieTheaterId, ...safeData } = updateDto;

      const updated = await this.prisma.screening.update({
        where: { id },
        data: safeData,
      });
      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error updating screening #${id}`, error.stack);
      throw new InternalServerErrorException('Failed to update screening');
    }
  }

  async remove(id: number) {
    const screening = await this.prisma.screening.findUnique({ where: { id } });

    if (!screening) {
      throw new NotFoundException(`Screening with ID ${id} not found`);
    }

    await this.prisma.screening.delete({ where: { id } });
    return { message: `Screening #${id} deleted successfully.` };
  }
}
