/**
 * defaultConfig.js
 * 内置默认配置常量（只读参考）
 * 实际运行配置从 useConfig.js 的 localStorage 中读取
 */

export const DEFAULT_STAGE_LABELS = {
  STANDBY:          '待机',
  PREPARING:        '考前准备',
  DISTRIBUTING:     '试卷分发',
  EXAMING_NORMAL:   '正常答题',
  EXAMING_WARNING:  '答题预警',
  EXAMING_CRITICAL: '极端冲刺',
  EXAM_FINISHED:    '考试结束',
}

export const STAGE_COLORS = {
  STANDBY:          { text: 'text-slate-500',  bg: 'bg-slate-500/10' },
  PREPARING:        { text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  DISTRIBUTING:     { text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  EXAMING_NORMAL:   { text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  EXAMING_WARNING:  { text: 'text-amber-500',  bg: 'bg-amber-500/10' },
  EXAMING_CRITICAL: { text: 'text-red-500',    bg: 'bg-red-500/10' },
  EXAM_FINISHED:    { text: 'text-slate-400',  bg: 'bg-slate-500/10' },
}
