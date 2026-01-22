import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionsController } from './admissions.controller';
import { AdmissionsService } from './admissions.service';

describe('AdmissionsController', () => {
  let controller: AdmissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdmissionsController],
      providers: [AdmissionsService],
    }).compile();

    controller = module.get<AdmissionsController>(AdmissionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
