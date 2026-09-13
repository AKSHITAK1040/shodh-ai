import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  @Post()
  async submit(@Body() body: any, @Request() req) {
    return this.submissionsService.submitCode(req.user.sub, body.problemId, body.code, body.language);
  }

  @Get('my')
  async getMySubmissions(@Request() req) {
    return this.submissionsService.getUserSubmissions(req.user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.submissionsService.getSubmission(id, req.user.sub, req.user.role);
  }
}
