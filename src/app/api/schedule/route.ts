import { NextRequest, NextResponse } from 'next/server'

interface Schedule {
  type: 'lampu' | 'pakan'
  action: 'on' | 'off' | 'feed'
  time: string
  chatId: number
  createdAt: string
  lastTriggered?: string
}

// In-memory storage untuk schedules (gunakan database untuk production)
let schedules: Schedule[] = []

async function sendMessage(chatId: number, text: string) {
  const BOT_TOKEN = process.env.BOT_TOKEN
  if (!BOT_TOKEN) {
    throw new Error('BOT_TOKEN not configured')
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  })

  const data = await response.json()
  if (!data.ok) {
    throw new Error(data.description || 'Failed to send message')
  }
  
  return data.result
}

function getJakartaTime(): Date {
  const now = new Date()
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const jakartaOffset = 7 * 60 * 60 * 1000 // UTC+7
  return new Date(utc + jakartaOffset)
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

async function checkAndTriggerSchedules() {
  const now = getJakartaTime()
  const currentTime = formatTime(now)
  const currentSecond = now.getSeconds()
  
  // Hanya jalankan di detik pertama setiap menit (00-05) untuk menghindari double trigger
  if (currentSecond > 5) {
    return { triggered: 0, schedules: [] }
  }
  
  let triggeredCount = 0
  const triggeredSchedules: string[] = []
  
  for (const schedule of schedules) {
    // Cek jika waktu cocok dan belum di-trigger menit ini
    if (schedule.time === currentTime) {
      const wasTriggered = schedule.lastTriggered
      const lastTriggeredTime = wasTriggered ? new Date(wasTriggered) : null
      
      // Cek jika sudah di-trigger dalam 2 menit terakhir
      if (lastTriggeredTime) {
        const diffMinutes = (now.getTime() - lastTriggeredTime.getTime()) / (1000 * 60)
        if (diffMinutes < 2) {
          continue // Skip, sudah di-trigger recently
        }
      }
      
      // Trigger schedule
      let message = ''
      const icon = schedule.type === 'lampu' ? '💡' : '🐟'
      
      if (schedule.type === 'lampu' && schedule.action === 'on') {
        message = (
          `${icon} <b>LAMPU ON</b>\n\n` +
          `⏰ Time: ${currentTime}\n` +
          `📅 Date: ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
          `✅ Lamp automation executed successfully!`
        )
      } else if (schedule.type === 'lampu' && schedule.action === 'off') {
        message = (
          `${icon} <b>LAMPU OFF</b>\n\n` +
          `⏰ Time: ${currentTime}\n` +
          `📅 Date: ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
          `✅ Lamp automation executed successfully!`
        )
      } else if (schedule.type === 'pakan' && schedule.action === 'feed') {
        message = (
          `${icon} <b>PAKAN REMINDER</b>\n\n` +
          `⏰ Time: ${currentTime}\n` +
          `📅 Date: ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
          `🍽️ Waktunya memberi pakan!\n` +
          `✅ Feed reminder sent successfully!`
        )
      }
      
      try {
        await sendMessage(schedule.chatId, message)
        
        // Update last triggered time
        schedule.lastTriggered = now.toISOString()
        triggeredCount++
        triggeredSchedules.push(`${schedule.type.toUpperCase()} ${schedule.action} at ${schedule.time}`)
      } catch (error) {
        console.error(`Failed to trigger schedule:`, error)
      }
    }
  }
  
  return { triggered: triggeredCount, schedules: triggeredSchedules }
}

// GET endpoint untuk scheduler
export async function GET(request: NextRequest) {
  try {
    const result = await checkAndTriggerSchedules()
    
    const now = getJakartaTime()
    const response = {
      status: 'success',
      timestamp: now.toISOString(),
      jakartaTime: now.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'full',
        timeStyle: 'long',
      }),
      currentTime: formatTime(now),
      schedulesCount: schedules.length,
      triggeredCount: result.triggered,
      triggeredSchedules: result.schedules,
      allSchedules: schedules.map(s => ({
        type: s.type,
        action: s.action,
        time: s.time,
        lastTriggered: s.lastTriggered,
      })),
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Schedule error:', error)
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST endpoint untuk menambah schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, action, time, chatId } = body
    
    if (!type || !action || !time || !chatId) {
      return NextResponse.json(
        { error: 'Missing required fields: type, action, time, chatId' },
        { status: 400 }
      )
    }
    
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM (24-hour format)' },
        { status: 400 }
      )
    }
    
    // Hapus schedule lama dengan type dan action yang sama
    schedules = schedules.filter(s => !(s.type === type && s.action === action && s.chatId === chatId))
    
    // Tambahkan schedule baru
    const newSchedule: Schedule = {
      type,
      action,
      time,
      chatId,
      createdAt: new Date().toISOString(),
    }
    schedules.push(newSchedule)
    
    return NextResponse.json({
      success: true,
      message: 'Schedule created successfully',
      schedule: newSchedule,
    })
  } catch (error) {
    console.error('Create schedule error:', error)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}

// DELETE endpoint untuk menghapus schedule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const action = searchParams.get('action')
    const chatId = searchParams.get('chatId')
    
    if (!type || !action || !chatId) {
      return NextResponse.json(
        { error: 'Missing required query params: type, action, chatId' },
        { status: 400 }
      )
    }
    
    const initialCount = schedules.length
    schedules = schedules.filter(s => !(s.type === type && s.action === action && s.chatId === parseInt(chatId)))
    
    const deleted = initialCount - schedules.length
    
    return NextResponse.json({
      success: true,
      message: deleted > 0 ? 'Schedule deleted successfully' : 'No schedule found',
      deleted,
    })
  } catch (error) {
    console.error('Delete schedule error:', error)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
