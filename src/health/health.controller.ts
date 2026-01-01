import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // 基础设施健康检查 (Railway, Docker, K8s)
  @Get('health')
  async health() {
    return this.doHealthCheck();
  }

  // API 一致性路由 (前端调用)
  @Get('api/health')
  async apiHealth() {
    return this.doHealthCheck();
  }

  private async doHealthCheck() {
    try {
      await this.healthService.checkDb();
      return { ok: true, db: 'up' };
    } catch (e: any) {
      return { ok: false, db: 'down', error: e?.message ?? 'unknown' };
    }
  }
}
