/**
 * 类型定义文件
 * 定义所有核心数据结构
 */

/**
 * 流程节点
 */
export interface ProcessNode {
  /** 节点名称（如：考生入场、发卷） */
  name: string
  /** 相对时间偏移（分钟，负数表示考试开始前） */
  offset: number
  /** 提前提醒时间（分钟） */
  warnTime: number
  /** 提醒内容描述 */
  description?: string
  /** 注意事项（简短提示） */
  tips?: string
}

/**
 * 考试模板
 */
export interface Template {
  /** 模板唯一ID */
  id: string
  /** 模板名称 */
  name: string
  /** 版本号 */
  version: string
  /** 流程节点列表 */
  nodes: ProcessNode[]
  /** 发布时间 */
  publishedAt?: string
  /** 关联的远程模板ID（本地副本时使用） */
  remoteId?: string
  /** 是否已修改 */
  isModified?: boolean
  /** 最后同步时间 */
  lastSync?: string
}

/**
 * 考试状态
 */
export interface ExamState {
  /** 模板ID */
  templateId: string
  /** 模板名称（快照） */
  templateName: string
  /** 考试开始时间（ISO字符串） */
  startTime: string
  /** 考试状态：running / paused / ended */
  status: 'running' | 'paused' | 'ended'
  /** 已完成的节点名称 */
  completedNodes: string[]
  /** 当前正在进行的节点名称 */
  currentNode?: string
  /** 本地与NTP的时间偏差（秒） */
  ntpOffset: number
  /** 最后同步时间 */
  lastSyncTime: string
  /** 暂停时间（如果暂停） */
  pausedAt?: string
  /** 结束时间（如果结束） */
  endedAt?: string
  /** 考试日志 */
  logs: ExamLog[]
}

/**
 * 考试日志
 */
export interface ExamLog {
  /** 时间戳 */
  timestamp: string
  /** 操作类型 */
  action: 'start' | 'pause' | 'resume' | 'skip' | 'complete' | 'end' | 'warning'
  /** 节点名称（可选） */
  nodeName?: string
  /** 备注 */
  note?: string
}

/**
 * 用户设置
 */
export interface Settings {
  /** 默认提前提醒时间（分钟） */
  warnTime: number
  /** 是否启用声音提醒 */
  soundEnabled: boolean
  /** 远程API地址 */
  apiEndpoint: string
}

/**
 * 时间同步状态
 */
export interface TimeSyncStatus {
  /** 状态：normal / warning / error */
  status: 'normal' | 'warning' | 'error'
  /** 时间偏差（秒） */
  offset: number
  /** 最后同步时间 */
  lastSyncTime: Date | null
  /** 消息 */
  message: string
  /** 时间源 */
  source?: string
}

/**
 * 提醒信息
 */
export interface Reminder {
  /** 提醒类型 */
  type: 'warning' | 'alert'
  /** 标题 */
  title: string
  /** 内容 */
  content: string
  /** 下一环节 */
  nextNode?: string
  /** 剩余时间（秒） */
  remainingTime?: number
}

/**
 * 考试进度计算结果
 */
export interface ExamProgress {
  /** 当前节点 */
  currentNode: ProcessNode | null
  /** 下一节点 */
  nextNode: ProcessNode | null
  /** 距离下一节点的剩余时间（秒） */
  remainingTime: number
  /** 进度百分比 */
  progress: number
  /** 已完成节点列表 */
  completedNodes: ProcessNode[]
  /** 待进行节点列表 */
  upcomingNodes: ProcessNode[]
}
