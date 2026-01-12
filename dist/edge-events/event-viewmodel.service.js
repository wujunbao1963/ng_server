"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventViewModelService = void 0;
const common_1 = require("@nestjs/common");
const topomap_service_1 = require("../topomap/topomap.service");
let EventViewModelService = class EventViewModelService {
    constructor(topoMapService) {
        this.topoMapService = topoMapService;
        this.defaultEntryPointLabels = {
            ep_back: '后门',
            ep_front: '前门',
            ep_garage: '车库门',
            ep_side: '侧门',
            back_door: '后门',
            front_door: '前门',
            garage_door: '车库门',
            side_door: '侧门',
        };
        this.modeLabels = {
            home: '在家模式',
            away: '离家模式',
            night: '夜间模式',
            disarm: '撤防模式',
        };
        this.statusLabels = {
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
        this.triggerReasonLabels = {
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
    }
    async toViewModel(raw, circleId, options) {
        const summary = raw.summaryJson ?? {};
        const topoMap = await this.topoMapService.get(circleId);
        const topoData = topoMap?.data ?? {};
        const entryPointId = summary.entryPointId ?? '';
        const entryPointLabel = this.resolveEntryPointLabel(entryPointId, topoData);
        const mode = (summary.mode ?? 'away').toLowerCase();
        const modeLabel = this.modeLabels[mode] ?? mode;
        const threatState = (raw.threatState ?? 'NONE');
        const statusLabel = this.statusLabels[threatState] ?? threatState;
        const triggerReason = (raw.triggerReason ?? undefined);
        const headlineText = this.generateHeadline(threatState, triggerReason, entryPointLabel, summary);
        const timeText = this.formatTimeText(raw.edgeUpdatedAt);
        const facts = this.generateFacts(raw, entryPointLabel);
        const explanations = this.generateExplanations(threatState, triggerReason);
        const nextActions = this.generateNextActions(threatState);
        const viewModel = {
            schemaVersion: 'ng.ui.event.viewmodel/1.0',
            edgeSpecVersion: 'v7.7',
            eventId: raw.eventId,
            edgeInstanceId: raw.edgeInstanceId,
            createdAt: raw.edgeUpdatedAt.toISOString(),
            updatedAt: raw.edgeUpdatedAt.toISOString(),
            timeText,
            mode,
            modeLabel,
            entryPoint: {
                id: entryPointId,
                label: entryPointLabel,
            },
            threatState,
            triggerReason: triggerReason ?? 'none',
            statusLabel,
            headlineText,
            workflowClass: summary.workflowClass ?? 'NONE',
            facts,
            explanations,
            nextActions,
            privacy: {
                level: 'summary_only',
                note: '视频仅在本地保存，未上传云端',
            },
        };
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
    async toViewModelList(events, circleId) {
        const topoMap = await this.topoMapService.get(circleId);
        const topoData = topoMap?.data ?? {};
        return events.map((raw) => {
            const summary = raw.summaryJson ?? {};
            const entryPointId = summary.entryPointId ?? '';
            const entryPointLabel = this.resolveEntryPointLabel(entryPointId, topoData);
            const mode = (summary.mode ?? 'away').toLowerCase();
            const modeLabel = this.modeLabels[mode] ?? mode;
            const threatState = (raw.threatState ?? 'NONE');
            const statusLabel = this.statusLabels[threatState] ?? threatState;
            const triggerReason = (raw.triggerReason ?? undefined);
            const headlineText = this.generateHeadline(threatState, triggerReason, entryPointLabel, summary);
            const timeText = this.formatTimeText(raw.edgeUpdatedAt);
            const facts = this.generateFacts(raw, entryPointLabel);
            const nextActions = this.generateNextActions(threatState);
            return {
                schemaVersion: 'ng.ui.event.viewmodel/1.0',
                edgeSpecVersion: 'v7.7',
                eventId: raw.eventId,
                edgeInstanceId: raw.edgeInstanceId,
                createdAt: raw.edgeUpdatedAt.toISOString(),
                updatedAt: raw.edgeUpdatedAt.toISOString(),
                timeText,
                mode,
                modeLabel,
                entryPoint: {
                    label: entryPointLabel,
                },
                threatState,
                triggerReason: triggerReason ?? 'none',
                statusLabel,
                headlineText,
                workflowClass: summary.workflowClass ?? 'NONE',
                facts,
                nextActions,
                privacy: {
                    level: 'summary_only',
                },
            };
        });
    }
    resolveEntryPointLabel(entryPointId, topoData) {
        if (!entryPointId) {
            return '入口';
        }
        const topoEntry = topoData.entryPoints?.find((ep) => ep.id === entryPointId);
        if (topoEntry?.label) {
            return topoEntry.label;
        }
        const defaultLabel = this.defaultEntryPointLabels[entryPointId];
        if (defaultLabel) {
            return defaultLabel;
        }
        if (entryPointId.startsWith('ep_')) {
            const suffix = entryPointId.replace('ep_', '');
            const labelMap = {
                back: '入口 A',
                front: '入口 B',
                garage: '入口 C',
                side: '入口 D',
            };
            return labelMap[suffix] ?? '入口';
        }
        return '入口';
    }
    generateHeadline(threatState, triggerReason, locationLabel, summary) {
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
                if (summary.workflowClass === 'LOGISTICS') {
                    return `${loc}快递到达`;
                }
                return `${loc}安全状态正常`;
        }
    }
    formatTimeText(date) {
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
    generateFacts(raw, locationLabel) {
        const facts = [];
        const summary = raw.summaryJson ?? {};
        const timeStr = raw.edgeUpdatedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const triggerReason = raw.triggerReason ?? 'unknown';
        const reasonLabel = this.triggerReasonLabels[triggerReason] ?? '检测到异常';
        facts.push({
            iconKey: this.getIconKeyForTrigger(triggerReason),
            text: `${reasonLabel}（${timeStr}）`,
        });
        facts.push({
            iconKey: 'location',
            text: `位置：${locationLabel}`,
        });
        return facts;
    }
    generateExplanations(threatState, triggerReason) {
        const explanations = [];
        switch (threatState) {
            case 'PENDING':
                explanations.push({ text: '进入"等待确认"：因为门被打开（door_open）' });
                explanations.push({ text: '如果是你或家人进入，请解除警报' });
                break;
            case 'TRIGGERED':
                if (triggerReason === 'entry_delay_expired') {
                    explanations.push({ text: '进入"已报警"：因为等待确认超时（entry_delay_expired）' });
                }
                else if (triggerReason === 'glass_break') {
                    explanations.push({ text: '进入"已报警"：因为检测到玻璃破碎（强证据）' });
                }
                else {
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
    generateNextActions(threatState) {
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
    getIconKeyForTrigger(triggerReason) {
        const iconMap = {
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
};
exports.EventViewModelService = EventViewModelService;
exports.EventViewModelService = EventViewModelService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [topomap_service_1.TopoMapService])
], EventViewModelService);
//# sourceMappingURL=event-viewmodel.service.js.map