'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Account {
  id: string
  app_id: string
  nickname: string
  status: string
  created_at: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ app_id: '', app_secret: '', nickname: '' })

  useEffect(() => { fetchAccounts() }, [])

  async function fetchAccounts() {
    setLoading(true)
    const { data } = await supabase.from('accounts').select('*').order('created_at', { ascending: false })
    setAccounts(data || [])
    setLoading(false)
  }

  async function addAccount() {
    const { data: user } = await supabase.auth.getUser()
    await supabase.from('accounts').insert({
      user_id: user.user?.id,
      app_id: formData.app_id,
      app_secret: formData.app_secret,
      nickname: formData.nickname || `账号 ${Date.now()}`,
    })
    setFormData({ app_id: '', app_secret: '', nickname: '' })
    fetchAccounts()
  }

  async function removeAccount(id: string) {
    await supabase.from('accounts').delete().eq('id', id)
    fetchAccounts()
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">账号管理</h2>

      {/* 添加账号 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">添加抖音账号</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="App ID"
            value={formData.app_id}
            onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
          />
          <input
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="App Secret"
            type="password"
            value={formData.app_secret}
            onChange={(e) => setFormData({ ...formData, app_secret: e.target.value })}
          />
          <input
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="昵称 (可选)"
            value={formData.nickname}
            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
          />
        </div>
        <button
          onClick={addAccount}
          disabled={!formData.app_id || !formData.app_secret}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          添加账号
        </button>
      </div>

      {/* 账号列表 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">昵称</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">App ID</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">添加时间</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} className="border-b border-gray-100">
                <td className="px-6 py-4 text-sm text-gray-900">{acc.nickname || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{acc.app_id}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    acc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {acc.status === 'active' ? '有效' : '失效'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(acc.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => removeAccount(acc.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {!loading && accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                  暂无账号，请添加抖音开放平台账号
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}