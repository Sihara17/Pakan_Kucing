import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const BOT_TOKEN = process.env.BOT_TOKEN
    const CHAT_ID = process.env.CHAT_ID

    if (!BOT_TOKEN || !CHAT_ID) {
      return NextResponse.json(
        { error: 'Bot configuration missing' },
        { status: 500 }
      )
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json(
        { error: data.description || 'Failed to send message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: data.result,
    })
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
