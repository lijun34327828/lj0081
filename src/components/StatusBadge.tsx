import type { BodyStatus } from '../../shared/types'

const statusMap: Record<BodyStatus, { label: string; className: string }> = {
  stored: { label: '寄存中', className: 'status-stored' },
  reserved: { label: '已预约', className: 'status-reserved' },
  firing: { label: '烧制中', className: 'status-firing' },
  completed: { label: '已完成', className: 'status-completed' },
}

interface StatusBadgeProps {
  status: BodyStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = statusMap[status]
  return <span className={className}>{label}</span>
}
