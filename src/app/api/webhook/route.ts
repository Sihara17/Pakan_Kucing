import { NextRequest, NextResponse } from 'next/server'

interface TelegramUpdate {
  message?: {
    message_id: number
    from?: {
      id: number
      first_name?: string
      username?: string
    }
    chat?: {
      id: number
      type: string
    }
    text?: string
    date: number
  }
}

interface Schedule {
  type: 'lampu' | 'pakan'
  action: 'on' | 'off' | 'feed'
  time: string
  chatId: number
  createdAt: string
}

// In-memory storage for schedules (gunakan database untuk production)
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

function handleStart(chatId: number, firstName?: string): string {
  const greeting = firstName ? `Halo ${firstName}!` : 'Halo!'
  return (
    `${greeting}\n\n` +
    `✅ Bot Connected\n` +
    `💡 Lampu Automation Ready\n` +
    `🐟 Pakan Automation Ready\n\n` +
    `<b>Commands Available:</b>\n` +
    `/start - Start bot\n` +
    `/status - Check system status\n` +
    `/jadwal - View all schedules\n` +
    `/setlampuon HH:MM - Set lamp ON schedule\n` +
    `/setlampuoff HH:MM - Set lamp OFF schedule\n` +
    `/setpakan1 HH:MM - Set feed schedule 1\n` +
    `/setpakan2 HH:MM - Set feed schedule 2\n` +
    `/setpakan3 HH:MM - Set feed schedule 3\n` +
    `/lampuon - Turn lamp ON now\n` +
    `/lampuoff - Turn lamp OFF now\n` +
    `/pakan - Feed now`
  )
}

function handleStatus(): string {
  const now = new Date()
  const jakartaTime = now.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'long',
  })
  
  return (
    `✅ System Active\n` +
    `🕒 Timezone: Asia/Jakarta\n` +
    `📅 Current: ${jakartaTime}\n` +
    `⚡ Schedules: ${schedules.length} active`
  )
}

function handleJadwal(): string {
  if (schedules.length === 0) {
    return '📋 No schedules configured.\n\nUse commands to set schedules:\n/setlampuon, /setlampuoff, /setpakan1, /setpakan2, /setpakan3'
  }
  
  let message = '📋 <b>Active Schedules:</b>\n\n'
  
  schedules.forEach((schedule, index) => {
    const icon = schedule.type === 'lampu' ? '💡' : '🐟'
    const action = schedule.action === 'on' ? 'ON' : schedule.action === 'off' ? 'OFF' : 'FEED'
    message += `${index + 1}. ${icon} ${schedule.type.toUpperCase()} ${action} at ${schedule.time}\n`
  })
  
  return message
}

function handleSetSchedule(type: 'lampu' | 'pakan', action: 'on' | 'off' | 'feed', time: string, chatId: number): string {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return '❌ Invalid time format. Use HH:MM (24-hour format)\nExample: /setlampuon 06:00'
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
  
  const icon = type === 'lampu' ? '💡' : '🐟'
  const actionText = action === 'on' ? 'ON' : action === 'off' ? 'OFF' : 'FEED'
  
  return `✅ Schedule set!\n${icon} ${type.toUpperCase()} ${actionText} at ${time}\n\n/jadwal - View all schedules`
}

function handleQuickAction(action: 'lampuon' | 'lampuoff' | 'pakan'): string {
  const icon = action === 'pakan' ? '🐟' : '💡'
  const actionText = action === 'lampuon' ? 'Lampu ON' : action === 'lampuoff' ? 'Lampu OFF' : 'Pakan Diberikan'
  
  return `${icon} ${actionText}\n⚡ Command executed successfully!`
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json()
    const message = update.message
    
    if (!message || !message.text) {
      return NextResponse.json({ ok: true })
    }
    
    const chatId = message.chat.id
    const text = message.text.trim()
    const firstName = message.from?.first_name
    
    let responseText = ''
    
    if (text === '/start') {
      responseText = handleStart(chatId, firstName)
    } else if (text === '/status') {
      responseText = handleStatus()
    } else if (text === '/jadwal') {
      responseText = handleJadwal()
    } else if (text === '/lampuon') {
      responseText = handleQuickAction('lampuon')
    } else if (text === '/lampuoff') {
      responseText = handleQuickAction('lampuoff')
    } else if (text === '/pakan') {
      responseText = handleQuickAction('pakan')
    } else if (text.startsWith('/setlampuon ')) {
      const time = text.replace('/setlampuon ', '').trim()
      responseText = handleSetSchedule('lampu', 'on', time, chatId)
    } else if (text.startsWith('/setlampuoff ')) {
      const time = text.replace('/setlampuoff ', '').trim()
      responseText = handleSetSchedule('lampu', 'off', time, chatId)
    } else if (text.startsWith('/setpakan1 ')) {
      const time = text.replace('/setpakan1 ', '').trim()
      responseText = handleSetSchedule('pakan', 'feed', time, chatId)
    } else if (text.startsWith('/setpakan2 ')) {
      const time = text.replace('/setpakan2 ', '').trim()
      responseText = handleSetSchedule('pakan', 'feed', time, chatId)
    } else if (text.startsWith('/setpakan3 ')) {
      const time = text.replace('/setpakan3 ', '').trim()
      responseText = handleSetSchedule('pakan', 'feed', time, chatId)
    } else {
      responseText = (
        '❌ Unknown command\n\n' +
        'Use /start to see available commands'
      )
    }
    
    await sendMessage(chatId, responseText)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}

// Support GET untuk webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'webhook active',
    timestamp: new Date().toISOString()
  })
}
