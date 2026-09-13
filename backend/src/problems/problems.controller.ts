import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ProblemsService } from './problems.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('problems')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProblemsController {
  constructor(private problemsService: ProblemsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.problemsService.findOne(id, req.user.role);
  }

  @Post()
  @Roles('INSTRUCTOR', 'ADMIN')
  async create(@Body() body: any) {
    return this.problemsService.create(body);
  }
}
