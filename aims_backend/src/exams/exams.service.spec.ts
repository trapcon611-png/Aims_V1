import { Test, TestingModule } from '@nestjs/testing';
import { ExamsService } from './exams.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  exam: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  testAttempt: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  questionBank: {
    findMany: jest.fn(),
  },
  question: {
    createMany: jest.fn(),
  },
  answer: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('ExamsService', () => {
  let service: ExamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: PrismaService, useValue: prismaMock }, // Mock Database
      ],
    }).compile();

    service = module.get<ExamsService>(ExamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});