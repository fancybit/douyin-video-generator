import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

  // 更新为 processing
  await supabase.from('tasks').update({ status: 'processing', progress: 10 }).eq('id', task.id)

  try {
    // 模拟视频生成过程（实际应调用 AI 服务）
    const steps = [
      { progress: 25, delay: 800 },
      { progress: 50, delay: 1000 },
      { progress: 75, delay: 800 },
      { progress: 100, delay: 600 },
    ]

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, step.delay))
      await supabase.from('tasks').update({ progress: step.progress }).eq('id', task.id)
    }

    // 标记完成
    await supabase.from('tasks').update({
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)

    return Response.json({ message: 'Task completed', taskId: task.id })
  } catch (err: any) {
    await supabase.from('tasks').update({
      status: 'failed',
      error_message: err.message || 'Processing failed',
    }).eq('id', task.id)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
