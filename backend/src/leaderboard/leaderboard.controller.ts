import { Controller, Get, Param } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get('contest/:id')
  async getLeaderboard(@Param('id') contestId: string) {
    return this.leaderboardService.getLeaderboard(contestId);
  }
}
