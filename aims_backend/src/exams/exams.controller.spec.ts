import { Test, TestingModule } from '@nestjs/testing';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

const examsServiceMock = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  startAttempt: jest.fn(),
  submitAttempt: jest.fn(),
  addQuestionsToExam: jest.fn(),
};

describe('ExamsController', () => {
  let controller: ExamsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsController],
      providers: [
        { provide: ExamsService, useValue: examsServiceMock }, // Mock Service
      ],
    }).compile();

    controller = module.get<ExamsController>(ExamsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});