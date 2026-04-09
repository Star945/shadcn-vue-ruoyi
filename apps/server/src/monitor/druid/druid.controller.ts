import { Controller, Get, Res } from '@nestjs/common'

import { Public } from '../../common/decorators/public.decorator'

import { CacheService } from '../cache/cache.service'
import { ServerService } from '../server/server.service'

@Controller('druid')
export class DruidController {
  constructor(
    private readonly serverService: ServerService,
    private readonly cacheService: CacheService,
  ) {}

  @Public()
  @Get('login.html')
  async render(@Res() response: any) {
    const server = await this.serverService.getServer() as Record<string, any>
    const cache = await this.cacheService.getCache() as Record<string, any>
    const serverData = server?.data ?? {}
    const cacheData = cache?.data ?? {}

    const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Druid 监控</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fc;
      --card: rgba(255,255,255,.88);
      --border: rgba(95, 114, 189, .18);
      --text: #18213a;
      --muted: #627095;
      --primary: #5b5bd6;
      --accent: #eef0ff;
      --shadow: 0 18px 40px rgba(72, 82, 142, .12);
      --radius: 20px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(91,91,214,.14), transparent 28%),
        radial-gradient(circle at top right, rgba(68,193,255,.12), transparent 22%),
        var(--bg);
      color: var(--text);
      min-height: 100vh;
    }
    .shell {
      max-width: 1280px;
      margin: 0 auto;
      padding: 28px;
    }
    .hero {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: center;
      margin-bottom: 24px;
    }
    .hero h1 {
      margin: 0;
      font-size: 32px;
      line-height: 1.2;
    }
    .hero p {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 999px;
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      text-decoration: none;
      box-shadow: var(--shadow);
      font-size: 13px;
    }
    .grid {
      display: grid;
      gap: 18px;
      grid-template-columns: repeat(12, minmax(0, 1fr));
    }
    .card {
      grid-column: span 12;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 20px;
      backdrop-filter: blur(14px);
    }
    .card h2 {
      margin: 0 0 14px;
      font-size: 18px;
    }
    .stats {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .stat {
      background: var(--accent);
      border: 1px solid rgba(91,91,214,.12);
      border-radius: 16px;
      padding: 16px;
    }
    .stat .label { color: var(--muted); font-size: 12px; margin-bottom: 8px; }
    .stat .value { font-size: 24px; font-weight: 700; }
    .kv {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(255,255,255,.72);
      border: 1px solid rgba(95,114,189,.12);
      font-size: 14px;
    }
    .row .k { color: var(--muted); }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(91,91,214,.1);
      color: var(--primary);
      font-size: 12px;
      font-weight: 600;
    }
    .span-7 { grid-column: span 7; }
    .span-5 { grid-column: span 5; }
    .span-6 { grid-column: span 6; }
    @media (max-width: 960px) {
      .hero { flex-direction: column; align-items: flex-start; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .kv { grid-template-columns: 1fr; }
      .span-7, .span-5, .span-6 { grid-column: span 12; }
    }
    @media (max-width: 640px) {
      .shell { padding: 18px; }
      .stats { grid-template-columns: 1fr; }
      .hero h1 { font-size: 28px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div>
        <h1>Druid 监控</h1>
        <p>当前运行环境未集成 Java Druid 控制台，这里提供与当前 Nest 服务对应的运行诊断视图。</p>
      </div>
      <div class="links">
        <a class="link" href="/docs" target="_blank" rel="noreferrer">打开 Swagger 文档</a>
        <a class="link" href="/monitor/server" target="_blank" rel="noreferrer">查看服务监控接口</a>
        <a class="link" href="/monitor/cache" target="_blank" rel="noreferrer">查看缓存监控接口</a>
      </div>
    </section>

    <section class="grid">
      <article class="card span-7">
        <h2>服务概览</h2>
        <div class="stats">
          <div class="stat">
            <div class="label">CPU 核心</div>
            <div class="value">${serverData?.cpu?.cpuNum ?? '--'}</div>
          </div>
          <div class="stat">
            <div class="label">内存占用</div>
            <div class="value">${serverData?.mem?.usage ?? '--'}%</div>
          </div>
          <div class="stat">
            <div class="label">缓存名称</div>
            <div class="value">${cacheData?.cacheNames ?? '--'}</div>
          </div>
          <div class="stat">
            <div class="label">缓存键</div>
            <div class="value">${cacheData?.cacheKeys ?? '--'}</div>
          </div>
        </div>
      </article>

      <article class="card span-5">
        <h2>节点状态</h2>
        <div class="kv">
          <div class="row"><span class="k">主机名</span><strong>${serverData?.sys?.computerName ?? '--'}</strong></div>
          <div class="row"><span class="k">系统版本</span><strong>${serverData?.sys?.osName ?? '--'}</strong></div>
          <div class="row"><span class="k">IP 地址</span><strong>${serverData?.sys?.computerIp ?? '--'}</strong></div>
          <div class="row"><span class="k">JVM/Runtime</span><strong>${serverData?.jvm?.version ?? '--'}</strong></div>
        </div>
      </article>

      <article class="card span-6">
        <h2>缓存摘要</h2>
        <div class="kv">
          ${(cacheData?.commandStats ?? []).map((item: any) => `<div class="row"><span class="k">${item.name}</span><strong>${item.value}</strong></div>`).join('')}
        </div>
      </article>

      <article class="card span-6">
        <h2>磁盘信息</h2>
        <div class="kv">
          ${(serverData?.sysFiles ?? []).map((item: any) => `<div class="row"><span class="k">${item.dirName}</span><strong>${item.used} / ${item.total}</strong></div>`).join('') || '<div class="row"><span class="k">暂无数据</span><strong>--</strong></div>'}
        </div>
      </article>
    </section>
  </div>
</body>
</html>`

    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.send(html)
  }
}