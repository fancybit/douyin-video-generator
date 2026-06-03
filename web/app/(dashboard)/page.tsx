'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Task {
  id: string
  title: string
  script: string | null
  status: string
  progress: number
  error_message: string | null
  video_url: string | null
  created_at: string
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [script, setScript] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setTasks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    setSubmitError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('tasks').insert({
      title: title.trim(),
      script: script.trim(),
      status: 'pending',
      progress: 0,
      user_id: user?.id,
    })

    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }

    setShowModal(false)
    setTitle('')
    setScript('')
    setSubmitting(false)
    fetchTasks()
  }

  const statusLabel: Record<string, string> = {
    pending: '排队中',
    processing: '生成中',
    completed: '已完成',
    failed: '失败',
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">任务面板</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          新建任务
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '全部任务', value: tasks.length },
          { label: '生成中', value: tasks.filter((t) => ['pending', 'processing'].includes(t.status)).length },
          { label: '已完成', value: tasks.filter((t) => t.status === 'completed').length },
          { label: '失败', value: tasks.filter((t) => t.status === 'failed').length },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 任务列表 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">任务</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">进度</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">加载中...</td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                  暂无任务，点击「新建任务」开始生成
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    {task.script && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{task.script}</p>
                    )}
                    {task.error_message && (
                      <p className="text-xs text-red-500 mt-0.5">{task.error_message}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[task.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[task.status] || task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {['pending', 'processing'].includes(task.status) ? (
                      <div className="w-24">
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{task.progress}%</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(task.created_at).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新建任务弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">新建任务</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">任务标题 *</label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：AI 生成产品介绍视频"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label htmlFor="script" className="block text-sm font-medium text-gray-700 mb-1">视频脚本</label>
                <textarea
                  id="script"
                  rows={4}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="描述你想生成的视频内容..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              {submitError && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{submitError}</div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '创建中...' : '创建任务'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}