import { Test, TestingModule } from '@nestjs/testing';
import { ScreeningService } from './screening.service';
import { PrismaService } from '../prisma.service';
import { CreateScreeningDTO } from './dto/create-screening.dto';
import { UpdateScreeningDto } from './dto/update-screening.dto';

describe('ScreeningService', () => {
  let service: ScreeningService;
  let prisma: PrismaService;

  const mockPrisma = {
    screening: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    movie: {
      findUnique: jest.fn(),
    },
    movieTheater: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreeningService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ScreeningService>(ScreeningService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new screening', async () => {
      const now = new Date();
      const start = new Date(now.setHours(14, 0, 0, 0)).toISOString();
      const end = new Date(now.setHours(16, 0, 0, 0)).toISOString();
      const date = new Date(start).toISOString();

      const dto: CreateScreeningDTO = {
        start,
        end,
        date,
        movieId: 1,
        movieTheaterId: 2,
        nb_ticket: 0,
      };

      const result = { id: 1, ...dto };

      mockPrisma.movie.findUnique.mockResolvedValue({ id: 1, duration: 120 });
      mockPrisma.movieTheater.findUnique.mockResolvedValue({
        id: 2,
        capacity: 100,
      });
      mockPrisma.screening.findFirst.mockResolvedValue(null);
      mockPrisma.screening.create.mockResolvedValue(result);

      const created = await service.create(dto);

      expect(created).toEqual(result);
      expect(mockPrisma.screening.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          start: expect.any(String),
          end: expect.any(String),
          date: expect.any(String),
          movieId: 1,
          movieTheaterId: 2,
          nb_ticket: 0,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all screenings', async () => {
      const result = [{ id: 1 }, { id: 2 }];
      mockPrisma.screening.findMany.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
    });
  });

  describe('findOne', () => {
    it('should return a screening by ID', async () => {
      const result = { id: 1 };
      mockPrisma.screening.findUnique.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockPrisma.screening.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { movie: true, movieTheater: true },
      });
    });
  });

  describe('update', () => {
    it('should update and return the screening', async () => {
      const dto: UpdateScreeningDto = { start: '15:00' };
      const result = { id: 1, ...dto };

      mockPrisma.screening.update.mockResolvedValue(result);

      expect(await service.update(1, dto)).toEqual(result);
      expect(mockPrisma.screening.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('should delete the screening', async () => {
      const result = { id: 1 };
      mockPrisma.screening.delete.mockResolvedValue(result);

      expect(await service.remove(1)).toEqual({
        message: 'Screening #1 deleted successfully.',
      });
      expect(mockPrisma.screening.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('create - logique métier', () => {
    it('should throw if movie does not exist', async () => {
      const dto: CreateScreeningDTO = {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        date: new Date().toISOString(),
        movieId: 1,
        movieTheaterId: 1,
        nb_ticket: 0,
      };

      mockPrisma.movie.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(
        'Movie with ID 1 not found',
      );
    });

    it('should throw if movie theater does not exist', async () => {
      const dto: CreateScreeningDTO = {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        date: new Date().toISOString(),
        movieId: 1,
        movieTheaterId: 1,
        nb_ticket: 0,
      };
      mockPrisma.movie.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.movieTheater.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(
        'Theater with ID 1 not found',
      );
    });

    it('should throw if another screening exists at the same time', async () => {
      const dto: CreateScreeningDTO = {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        date: new Date().toISOString(),
        movieId: 1,
        movieTheaterId: 1,
        nb_ticket: 0,
      };

      mockPrisma.movie.findUnique.mockResolvedValue({ id: 1, duration: 120 });
      mockPrisma.movieTheater.findUnique.mockResolvedValue({
        id: 1,
        capacity: 100,
      });
      mockPrisma.screening.findFirst.mockResolvedValue({
        id: 99,
        start: dto.start,
        date: dto.date,
      });

      await expect(service.create(dto)).rejects.toThrow('Créneau occupé chef.');
    });

    it('should create screening if all checks pass', async () => {
      const now = new Date();
      const start = new Date(now.setHours(14, 0, 0, 0)).toISOString();
      const end = new Date(now.setHours(16, 0, 0, 0)).toISOString();
      const date = new Date(start).toISOString();

      const dto: CreateScreeningDTO = {
        start,
        end,
        date,
        movieId: 1,
        movieTheaterId: 1,
        nb_ticket: 0,
      };

      const expected = { id: 1, ...dto };

      mockPrisma.movie.findUnique.mockResolvedValue({ id: 1, duration: 120 });
      mockPrisma.movieTheater.findUnique.mockResolvedValue({
        id: 1,
        capacity: 100,
      });
      mockPrisma.screening.findFirst.mockResolvedValue(null);
      mockPrisma.screening.create.mockResolvedValue(expected);

      const result = await service.create(dto);
      expect(result).toEqual(expected);
    });
  });
});
