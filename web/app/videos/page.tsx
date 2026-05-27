'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Video {
  id: string
  title: string
  status: string
  video_url: string | null
  cover_url: string | null
  publish_status: string
  created_at: string
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchVideos() }, [])

  async function fetchVideos() {
    setLoading(true)
    const { data } = await supabase.from('tasks')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
    setVideos(data || [])
    setLoading(false)
  }

  const filtered = filter === 'all'
    ? videos
    : videos.filter((v) => v.publish_status === filter)

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">视频库</h2>

      {/* 筛选 */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: '全部' },
          { key: 'draft', label: '未发布' },
          { key: 'published', label: '已发布' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === f.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 视频网格 */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">暂无视频</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((video) => (
            <div key={video.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-[9/16] bg-gray-100 flex items-center justify-center">
                {video.video_url ? (
                  <video src={video.video_url} controls className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-sm">视频加载中</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 truncate">{video.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {new Date(video.created_at).toLocaleDateString('zh-CN')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    video.publish_status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {video.publish_status === 'published' ? '已发布' : '未发布'}
                  </span>
                </div>
                {video.video_url && (
                  <div className="flex gap-2 mt-3">
                    <a
                      href={video.video_url}
                      download
                      className="flex-1 text-center px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      下载
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}