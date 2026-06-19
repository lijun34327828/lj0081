import { useState, useEffect } from 'react'
import { Package, Archive, CalendarCheck, Flame, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import useStore from '@/store/useStore'
import { fetchExpiringBodies, fetchPendingBodies } from '@/lib/api'
import type { BodyRecord } from '../../shared/types'
import StatusBadge from '@/components/StatusBadge'

function getStorageDays(createdAt: string): number {
  const start = new Date(createdAt)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export default function Home() {
  const { stats, fetchStats, loading } = useStore()
  const [expiringBodies, setExpiringBodies] = useState<BodyRecord[]>([])
  const [pendingBodies, setPendingBodies] = useState<BodyRecord[]>([])

  useEffect(() => {
    fetchStats()
    fetchExpiringBodies().then(setExpiringBodies).catch(() => {})
    fetchPendingBodies().then(setPendingBodies).catch(() => {})
  }, [])

  const statCards = [
    { label: '坯体总数', value: stats?.totalBodies ?? 0, icon: Package, color: 'text-pottery-500', bg: 'bg-pottery-50' },
    { label: '寄存中', value: stats?.storedCount ?? 0, icon: Archive, color: 'text-glaze-500', bg: 'bg-glaze-50' },
    { label: '已预约', value: stats?.reservedCount ?? 0, icon: CalendarCheck, color: 'text-kiln-500', bg: 'bg-kiln-50' },
    { label: '烧制中', value: stats?.firingCount ?? 0, icon: Flame, color: 'text-kiln-600', bg: 'bg-kiln-50' },
    { label: '已完成', value: stats?.completedCount ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ]

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-pottery-800 mb-6">仪表盘</h2>

      {loading && <p className="text-pottery-400">加载中...</p>}

      <div className="grid grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-pottery-800">{card.value}</p>
              <p className="text-sm text-pottery-400">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-kiln-500" />
            <h3 className="font-serif text-lg font-semibold text-pottery-800">即将到期</h3>
            <span className="text-xs text-kiln-500 bg-kiln-50 px-2 py-0.5 rounded-full">
              {(stats?.expiringCount ?? 0) + (stats?.overdueCount ?? 0)} 项
            </span>
          </div>
          {expiringBodies.length === 0 ? (
            <p className="text-pottery-300 text-sm py-4 text-center">暂无即将到期的坯体</p>
          ) : (
            <div className="space-y-2">
              {expiringBodies.map((body) => {
                const days = getStorageDays(body.createdAt)
                const isOverdue = days > 30
                return (
                  <div
                    key={body.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                      isOverdue ? 'bg-kiln-50 border border-kiln-200' : 'bg-pottery-50 border border-pottery-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-pottery-700">{body.bodyNo}</span>
                      <StatusBadge status={body.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${isOverdue ? 'text-kiln-500' : 'text-pottery-400'}`} />
                      <span className={`text-sm font-medium ${isOverdue ? 'text-kiln-600' : 'text-pottery-500'}`}>
                        {days}天{isOverdue ? ' (已超期)' : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-pottery-500" />
            <h3 className="font-serif text-lg font-semibold text-pottery-800">待烧制</h3>
          </div>
          {pendingBodies.length === 0 ? (
            <p className="text-pottery-300 text-sm py-4 text-center">暂无待烧制坯体</p>
          ) : (
            <div className="space-y-2">
              {pendingBodies.map((body) => (
                <div key={body.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-pottery-50 border border-pottery-200">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-pottery-700">{body.bodyNo}</span>
                    <StatusBadge status={body.status} />
                  </div>
                  <span className="text-sm text-pottery-400">{body.customerName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
