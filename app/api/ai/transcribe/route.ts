import { NextRequest, NextResponse } from 'next/server'

function getAudioTranscriptionsUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (trimmed.endsWith('/audio/transcriptions')) return trimmed
  if (trimmed.endsWith('/v1')) return `${trimmed}/audio/transcriptions`
  return `${trimmed}/v1/audio/transcriptions`
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.AI_API_KEY?.trim()
  const baseUrl = process.env.AI_BASE_URL?.trim()
  const model = process.env.AI_TRANSCRIBE_MODEL?.trim() || 'whisper-1'

  if (!apiKey || !baseUrl) {
    return NextResponse.json({ message: 'AI_API_KEY 或 AI_BASE_URL 未配置' }, { status: 500 })
  }

  const input = await req.formData()
  const audio = input.get('audio')
  if (!(audio instanceof File)) {
    return NextResponse.json({ message: '请上传音频文件' }, { status: 400 })
  }

  const form = new FormData()
  form.append('file', audio, audio.name || 'voice.webm')
  form.append('model', model)
  form.append('language', 'zh')

  try {
    const response = await fetch(getAudioTranscriptionsUrl(baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    })

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await response.json() : { text: await response.text() }

    if (!response.ok) {
      return NextResponse.json(
        { message: `AI 语音转写失败：${response.status}`, detail: JSON.stringify(data).slice(0, 500) },
        { status: 502 }
      )
    }

    const text = String(data?.text || data?.data?.text || '').trim()
    if (!text) {
      return NextResponse.json({ message: 'AI 没有返回语音文字' }, { status: 502 })
    }

    return NextResponse.json({ text })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || 'AI 语音转写异常' }, { status: 502 })
  }
}
