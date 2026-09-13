import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ContestsService } from './contests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('contests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContestsController {
  constructor(private contestsService: ContestsService) {}

  @Get()
  async findAll() {
    return this.contestsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contestsService.findOne(id);
  }

  @Post()
  @Roles('INSTRUCTOR', 'ADMIN')
  async create(@Body() body: any) {
    return this.contestsService.create(body);
  }

  @Post(':id/join')
  @Roles('STUDENT', 'INSTRUCTOR', 'ADMIN')
  async join(@Param('id') id: string, @Request() req) {
    return this.contestsService.joinContest(id, req.user.sub);
  }
}
