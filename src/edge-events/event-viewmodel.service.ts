/**
 * EventViewModelService - 事件 ViewModel 转换服务
 * 
 * 职责：将原始事件数据转换为符合 NG_EVENT_VIEWMODEL_SCHEMA_v7.7 的 ViewModel
 * 
 * 设计原则：
 * - 后端生成所有人类可读文案，前端纯渲染
 * - 禁止暴露内部 ID (ep_back, inc_*, 等)
 * - 所有字段按照 NG_UI_EVENT_LANGUAGE_SPEC_v7.7 生成
 */

import { Injectable } from '@nestjs/common';
import { TopoMapService } from '../topomap/topomap.service';

// ============================================================================
// Types
// ============================================================================

export interface EventViewModel {
  schemaVersion: 'ng.ui.event.viewmodel/1.0';
  edgeSpecVersion: 'v7.7';
  eventId: string;
  edgeInstanceId?: string;
  createdAt: string;
  updatedAt: string;
  // 兼容字段：原始 app.html 依赖
  occurredAt: string;
  timeText: string;
  mode: 'home' | 'away' | 'night' | 'disarm';
  modeLabel: string;
  entryPoint: {
    id?: string;  // 内部用，不展示
    label: string;
  };
  threatState: 'NONE' | 'PRE' | 'PENDING' | 'TRIGGERED' | 'RESOLVED' | 'CANCELED';
  triggerReason?: 'none' | 'entry_delay_expired' | 'glass_break' | 'tamper_verified_by_user' | 'life_safety';
  // 兼容字段：原始 app.html 依赖此字段判断事件状态
  status: 'OPEN' | 'ACKED' | 'RESOLVED';
  // 兼容字段：原始 app.html 依赖
  entryPointId?: string;
  title: string;
  statusLabel: string;
  headlineText: string;
  workflowClass?: 'SECURITY_HEAVY' | 'SUSPICION_LIGHT' | 'LOGISTICS' | 'LIFE_SAFETY' | 'NONE';
  facts: Array<{ iconKey?: string; text: string }>;
  explanations?: Array<{ text: string }>;
  userActions?: Array<{ type: string; at: string; note?: string }>;
  nextActions: Array<{ actionId: string; label: string; style?: 'primary' | 'secondary' | 'danger' | 'link' }>;
  media?: Array<{
    kind: 'key_clip' | 'snapshot' | 'incident_packet_item';
    title?: string;
    sizeBytes?: number;
    durationSec?: number;
    access?: { type: string; url?: string; expiresAt?: string };
  }>;
  privacy: {
    level: 'summary_only' | 'authorized_media';
    note?: string;
  };
  debug?: Record<string, unknown>;
}

interface RawEventData {
  eventId: string;
  edgeInstanceId?: string;
  threatState: string;
  triggerReason?: string | null;
  edgeUpdatedAt: Date;
  summaryJson?: Record<string, unknown>;
  status?: string;
}

interface TopoMapData {
  entryPoints?: Array<{
    id: string;
    label: string;
  }>;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class EventViewModelService {
  // 入口点标签映射（默认值，当 TopoMap 不可用时使用）
  private readonly defaultEntryPointLabels: Record<string, string> = {
    ep_back: '后门',
    ep_front: '前门',
    ep_garage: '车库门',
    ep_side: '侧门',
    back_door: '后门',
    front_door: '前门',
    garage_door: '车库门',
    side_door: '侧门',
  };

  // 模式标签
  private readonly modeLabels: Record<string, string> = {
    home: '在家模式',
    away: '离家模式',
    night: '夜间模式',
    disarm: '撤防模式',
  };

  // ThreatState → UI 状态标签
  private readonly statusLabels: Record<string, string> = {
    NONE: '正常',
    PRE: '观察中',
    PRE_L1: '观察中',
    PRE_L2: '观察中',
    PRE_L3: '观察中',
    PENDING: '等待确认',
    TRIGGERED: '已报警',
    RESOLVED: '已解决',
    CANCELED: '已取消',
  };

  // 触发原因 → 人类可读文案
  private readonly triggerReasonLabels: Record<string, string> = {
    door_open: '门被打开',
    door_close: '门已关闭',
    entry_delay_expired: '等待确认超时',
    glass_break: '检测到玻璃破碎',
    tamper_verified_by_user: '用户确认防拆异常',
    life_safety: '检测到生命安全风险',
    person_detected: '检测到有人',
    motion_active: '检测到活动',
    delivery_detected: '快递到达',
    network_down: '摄像头离线',
  };

  constructor(private readonly topoMapService: TopoMapService) {}

  /**
   * 将原始事件数据转换为完整的 ViewModel
   */
  async toViewModel(
    raw: RawEventData,
    circleId: string,
    options?: { includeDebug?: boolean },
  ): Promise<EventViewModel> {
    const summary = raw.summaryJson ?? {};
    
    // 获取 TopoMap 用于入口点标签解析
    const topoMap = await this.topoMapService.get(circleId);
    const topoData = (topoMap?.data as TopoMapData) ?? {};

    // 解析入口点
    const entryPointId = (summary.entryPointId as string) ?? '';
    const entryPointLabel = this.resolveEntryPointLabel(entryPointId, topoData);

    // 解析模式
    const mode = ((summary.mode as string) ?? 'away').toLowerCase() as EventViewModel['mode'];
    const modeLabel = this.modeLabels[mode] ?? mode;

    // 解析状态
    const threatState = (raw.threatState ?? 'NONE') as EventViewModel['threatState'];
    const statusLabel = this.statusLabels[threatState] ?? threatState;

    // 解析触发原因（null转为undefined）
    const triggerReason = (raw.triggerReason ?? undefined) as EventViewModel['triggerReason'];

    // 生成标题
    const headlineText = this.generateHeadline(threatState, triggerReason, entryPointLabel, summary);

    // 生成时间文本
    const timeText = this.formatTimeText(raw.edgeUpdatedAt);

    // 生成事实列表
    const facts = this.generateFacts(raw, entryPointLabel);

    // 生成解释
    const explanations = this.generateExplanations(threatState, triggerReason);

    // 生成下一步操作
    const nextActions = this.generateNextActions(threatState);

    const viewModel: EventViewModel = {
      schemaVersion: 'ng.ui.event.viewmodel/1.0',
      edgeSpecVersion: 'v7.7',
      eventId: raw.eventId,
      edgeInstanceId: raw.edgeInstanceId,
      createdAt: raw.edgeUpdatedAt.toISOString(),
      updatedAt: raw.edgeUpdatedAt.toISOString(),
      occurredAt: raw.edgeUpdatedAt.toISOString(),  // 兼容字段
      timeText,
      mode,
      modeLabel,
      entryPoint: {
        id: entryPointId,  // 内部使用，前端不应显示
        label: entryPointLabel,
      },
      threatState,
      triggerReason: triggerReason ?? 'none',
      status: this.mapThreatStateToStatus(threatState),
      entryPointId: entryPointId,  // 兼容字段
      title: headlineText,  // 兼容字段
      statusLabel,
      headlineText,
      workflowClass: (summary.workflowClass as EventViewModel['workflowClass']) ?? 'NONE',
      facts,
      explanations,
      nextActions,
      privacy: {
        level: 'summary_only',
        note: '视频仅在本地保存，未上传云端',
      },
    };

    // 可选：包含调试信息
    if (options?.includeDebug) {
      viewModel.debug = {
        rawThreatState: raw.threatState,
        rawTriggerReason: raw.triggerReason,
        rawEntryPointId: entryPointId,
        summaryJson: summary,
      };
    }

    return viewModel;
  }

  /**
   * 批量转换事件列表
   */
  async toViewModelList(
    events: RawEventData[],
    circleId: string,
  ): Promise<EventViewModel[]> {
    // 预加载 TopoMap（避免 N+1 查询）
    const topoMap = await this.topoMapService.get(circleId);
    const topoData = (topoMap?.data as TopoMapData) ?? {};

    return events.map((raw) => {
      const summary = raw.summaryJson ?? {};
      const entryPointId = (summary.entryPointId as string) ?? '';
      const entryPointLabel = this.resolveEntryPointLabel(entryPointId, topoData);
      const mode = ((summary.mode as string) ?? 'away').toLowerCase() as EventViewModel['mode'];
      const modeLabel = this.modeLabels[mode] ?? mode;
      const threatState = (raw.threatState ?? 'NONE') as EventViewModel['threatState'];
      const statusLabel = this.statusLabels[threatState] ?? threatState;
      const triggerReason = (raw.triggerReason ?? undefined) as EventViewModel['triggerReason'];
      const headlineText = this.generateHeadline(threatState, triggerReason, entryPointLabel, summary);
      const timeText = this.formatTimeText(raw.edgeUpdatedAt);
      const facts = this.generateFacts(raw, entryPointLabel);
      const nextActions = this.generateNextActions(threatState);

      return {
        schemaVersion: 'ng.ui.event.viewmodel/1.0' as const,
        edgeSpecVersion: 'v7.7' as const,
        eventId: raw.eventId,
        edgeInstanceId: raw.edgeInstanceId,
        createdAt: raw.edgeUpdatedAt.toISOString(),
        updatedAt: raw.edgeUpdatedAt.toISOString(),
        occurredAt: raw.edgeUpdatedAt.toISOString(),  // 兼容字段
        timeText,
        mode,
        modeLabel,
        entryPoint: {
          label: entryPointLabel,
        },
        threatState,
        triggerReason: triggerReason ?? 'none',
        status: this.mapThreatStateToStatus(threatState),  // 兼容字段
        entryPointId: entryPointId,  // 兼容字段
        title: headlineText,  // 兼容字段
        statusLabel,
        headlineText,
        workflowClass: (summary.workflowClass as EventViewModel['workflowClass']) ?? 'NONE',
        facts,
        nextActions,
        privacy: {
          level: 'summary_only' as const,
        },
      };
    });
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * 解析入口点标签
   * 优先级: TopoMap > 默认映射 > 安全降级
   */
  private resolveEntryPointLabel(entryPointId: string, topoData: TopoMapData): string {
    if (!entryPointId) {
      return '入口';
    }

    // 1. 尝试从 TopoMap 获取
    const topoEntry = topoData.entryPoints?.find((ep) => ep.id === entryPointId);
    if (topoEntry?.label) {
      return topoEntry.label;
    }

    // 2. 尝试默认映射
    const defaultLabel = this.defaultEntryPointLabels[entryPointId];
    if (defaultLabel) {
      return defaultLabel;
    }

    // 3. 安全降级：不暴露内部 ID
    // 将 ep_back → 入口 A, ep_front → 入口 B 等
    if (entryPointId.startsWith('ep_')) {
      const suffix = entryPointId.replace('ep_', '');
      const labelMap: Record<string, string> = {
        back: '入口 A',
        front: '入口 B',
        garage: '入口 C',
        side: '入口 D',
      };
      return labelMap[suffix] ?? '入口';
    }

    return '入口';
  }

  /**
   * 生成标题文案
   * 按照 NG_UI_EVENT_LANGUAGE_SPEC_v7.7 §3 模板
   */
  private generateHeadline(
    threatState: string,
    triggerReason: string | undefined,
    locationLabel: string,
    summary: Record<string, unknown>,
  ): string {
    const loc = `【${locationLabel}】`;

    switch (threatState) {
      case 'PENDING':
        return `${loc}门已打开，等待你确认`;

      case 'TRIGGERED':
        switch (triggerReason) {
          case 'entry_delay_expired':
            return `${loc}未确认开门事件，已进入警报`;
          case 'glass_break':
            return `${loc}检测到玻璃破碎，已进入警报`;
          case 'tamper_verified_by_user':
            return `${loc}你已确认防拆异常，已进入警报`;
          case 'life_safety':
            return `${loc}检测到生命安全风险，已进入警报`;
          default:
            return `${loc}已进入警报状态`;
        }

      case 'PRE':
      case 'PRE_L1':
      case 'PRE_L2':
      case 'PRE_L3':
        // 根据 triggerReason 细化
        if (triggerReason === 'person_detected') {
          return `${loc}门外有人活动（观察中）`;
        }
        if (triggerReason === 'delivery_detected') {
          return `${loc}快递到达`;
        }
        if (triggerReason === 'network_down') {
          return `${loc}摄像头可能离线（观察中）`;
        }
        return `${loc}检测到活动（观察中）`;

      case 'RESOLVED':
        return `${loc}本次活动已确认安全`;

      case 'CANCELED':
        return `${loc}已解除本次等待确认`;

      default:
        // LOGISTICS 快递事件
        if ((summary.workflowClass as string) === 'LOGISTICS') {
          return `${loc}快递到达`;
        }
        return `${loc}安全状态正常`;
    }
  }

  /**
   * 格式化时间文本
   */
  private formatTimeText(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) {
      return '刚刚';
    }
    if (diffMin < 60) {
      return `${diffMin} 分钟前`;
    }
    if (diffHour < 24) {
      return `${diffHour} 小时前`;
    }
    if (diffDay === 0) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDay === 1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 生成事实列表
   */
  private generateFacts(raw: RawEventData, locationLabel: string): Array<{ iconKey?: string; text: string }> {
    const facts: Array<{ iconKey?: string; text: string }> = [];
    const summary = raw.summaryJson ?? {};
    const timeStr = raw.edgeUpdatedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    // 主要事实
    const triggerReason = raw.triggerReason ?? 'unknown';
    const reasonLabel = this.triggerReasonLabels[triggerReason] ?? '检测到异常';

    facts.push({
      iconKey: this.getIconKeyForTrigger(triggerReason),
      text: `${reasonLabel}（${timeStr}）`,
    });

    // 位置信息
    facts.push({
      iconKey: 'location',
      text: `位置：${locationLabel}`,
    });

    return facts;
  }

  /**
   * 生成解释
   */
  private generateExplanations(
    threatState: string,
    triggerReason: string | undefined,
  ): Array<{ text: string }> {
    const explanations: Array<{ text: string }> = [];

    switch (threatState) {
      case 'PENDING':
        explanations.push({ text: '进入"等待确认"：因为门被打开（door_open）' });
        explanations.push({ text: '如果是你或家人进入，请解除警报' });
        break;

      case 'TRIGGERED':
        if (triggerReason === 'entry_delay_expired') {
          explanations.push({ text: '进入"已报警"：因为等待确认超时（entry_delay_expired）' });
        } else if (triggerReason === 'glass_break') {
          explanations.push({ text: '进入"已报警"：因为检测到玻璃破碎（强证据）' });
        } else {
          explanations.push({ text: '进入"已报警"：因为检测到安全威胁' });
        }
        break;

      case 'PRE':
      case 'PRE_L1':
      case 'PRE_L2':
        explanations.push({ text: '进入"观察中"：因为检测到门外活动（软信号，不会直接报警）' });
        break;

      case 'RESOLVED':
        explanations.push({ text: '本次事件已被用户确认为安全' });
        break;

      case 'CANCELED':
        explanations.push({ text: '本次警报流程已被解除/取消' });
        break;
    }

    return explanations;
  }

  /**
   * 生成下一步操作
   */
  private generateNextActions(
    threatState: string,
  ): Array<{ actionId: string; label: string; style?: 'primary' | 'secondary' | 'danger' | 'link' }> {
    switch (threatState) {
      case 'PENDING':
        return [
          { actionId: 'disarm', label: '解除/撤防', style: 'primary' },
          { actionId: 'open_live_view', label: '查看现场视频', style: 'secondary' },
        ];

      case 'TRIGGERED':
        return [
          { actionId: 'open_live_view', label: '立即查看现场', style: 'danger' },
          { actionId: 'silence', label: '静音', style: 'secondary' },
          { actionId: 'request_help', label: '联系协作人', style: 'link' },
        ];

      case 'PRE':
      case 'PRE_L1':
      case 'PRE_L2':
        return [
          { actionId: 'open_live_view', label: '查看现场视频', style: 'primary' },
          { actionId: 'view_details', label: '查看详情', style: 'link' },
        ];

      case 'RESOLVED':
      case 'CANCELED':
        return [{ actionId: 'view_details', label: '查看记录', style: 'link' }];

      default:
        return [{ actionId: 'view_details', label: '查看详情', style: 'link' }];
    }
  }

  /**
   * 获取触发原因对应的图标
   */
  private getIconKeyForTrigger(triggerReason: string): string {
    const iconMap: Record<string, string> = {
      door_open: 'door',
      door_close: 'door',
      person_detected: 'person',
      motion_active: 'motion',
      glass_break: 'alert',
      delivery_detected: 'package',
      network_down: 'camera',
      entry_delay_expired: 'timer',
      tamper_verified_by_user: 'shield',
      life_safety: 'heart',
    };
    return iconMap[triggerReason] ?? 'info';
  }

  /**
   * 兼容映射：threatState → 原始 status 字段
   * 原始 app.html 依赖此字段判断是否显示操作按钮
   */
  private mapThreatStateToStatus(threatState: string): 'OPEN' | 'ACKED' | 'RESOLVED' {
    if (threatState === 'RESOLVED' || threatState === 'CANCELED') {
      return 'RESOLVED';
    }
    // NONE, PRE, PENDING, TRIGGERED 都映射为 OPEN
    return 'OPEN';
  }
}
