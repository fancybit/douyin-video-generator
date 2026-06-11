import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const engineApiUrl = process.env.ENGINE_API_URL || 'http://localhost:8000'

  if (!supabaseServiceKey) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 查找最早的一个 pending 任务
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  if (fetchError || !tasks || tasks.length === 0) {
    return Response.json({ message: 'No pending tasks', error: fetchError?.message })
  }

  const task = tasks[0]

  // 将任务转发给引擎，引擎自主管理进度和状态
  try {
    const engineResponse = await fetch(`${engineApiUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: task.id,
        title: task.title || '',
        keywords: task.keywords || '',
      }),
    })

    if (!engineResponse.ok) {
      const errBody = await engineResponse.text()
      return Response.json({ error: `Engine error: ${errBody}` }, { status: engineResponse.status })
    }

    const engineResult = await engineResponse.json()
    return Response.json({ message: 'Task completed', taskId: task.id, video_url: engineResult.video_url })
  } catch (err: any) {
    // 引擎不可达时标记失败
    await supabase.from('tasks').update({
      status: 'failed',
      error_message: `Engine unreachable: ${err.message}`,
    }).eq('id', task.id)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
