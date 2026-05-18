'use client'

import { useState, useEffect } from 'react'
import {
  Bot,
  Lightbulb,
  Cat,
  Clock,
  Activity,
  Calendar,
  Terminal,
  Plus,
  Menu,
  X,
} from 'lucide-react'

import { toast } from 'sonner'
import { useTheme } from 'next-themes'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Schedule {
  type: 'lampu' | 'pakan'
  action: 'on' | 'off' | 'feed'
  time: string
}

interface LogEntry {
  id: number
  type: 'info' | 'success' | 'error'
  message: string
  timestamp: string
}

export default function DashboardPage() {
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const [lampStatus, setLampStatus] = useState<'on' | 'off'>('off')
  const [feeding, setFeeding] = useState(false)

  const [currentTime, setCurrentTime] = useState('')

  const [scheduleType, setScheduleType] = useState<'lampu' | 'pakan'>('lampu')
  const [scheduleAction, setScheduleAction] = useState<'on' | 'off' | 'feed'>('on')
  const [scheduleTime, setScheduleTime] = useState('')

  const [schedules, setSchedules] = useState<Schedule[]>([])

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 1,
      type: 'info',
      message: 'Dashboard initialized',
      timestamp: new Date().toISOString(),
    },
  ])

  // =========================
  // INIT
  // =========================
  useEffect(() => {
    setMounted(true)

    updateTime()
    const timer = setInterval(updateTime, 1000)

    fetchSchedules()
    const sync = setInterval(fetchSchedules, 5000)

    return () => {
      clearInterval(timer)
      clearInterval(sync)
    }
  }, [])

  function updateTime() {
    const now = new Date()
    const time = now.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
    })
    setCurrentTime(time)
  }

  // =========================
  // LOG SYSTEM
  // =========================
  function addLog(type: 'info' | 'success' | 'error', message: string) {
    setLogs((prev) => [
      {
        id: Date.now(),
        type,
        message,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ])
  }

  // =========================
  // TELEGRAM COMMAND
  // =========================
  async function sendTelegram(message: string) {
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
  }

  // =========================
  // FETCH SCHEDULE FROM API
  // =========================
  async function fetchSchedules() {
    try {
      const res = await fetch('/api/schedule')
      const data = await res.json()

      console.log('Schedules data:', data)

      if (data?.allSchedules) {
        setSchedules(data.allSchedules)
        addLog('info', `Loaded ${data.allSchedules.length} schedules`)
      } else {
        addLog('warning', 'No schedules found in response')
      }
    } catch (err) {
      console.log('schedule error:', err)
      addLog('error', 'Failed to fetch schedules')
    }
  }

  // =========================
  // BUTTON ACTIONS
  // =========================
  async function lampOn() {
    setLampStatus('on')

    await sendTelegram('/lampuon')

    addLog('success', 'Lampu ON sent')
    toast.success('Lampu ON')
  }

  async function lampOff() {
    setLampStatus('off')

    await sendTelegram('/lampuoff')

    addLog('success', 'Lampu OFF sent')
    toast.success('Lampu OFF')
  }

  async function feedNow() {
    setFeeding(true)

    await sendTelegram('/pakan')

    addLog('success', 'Feed sent')
    toast.success('Pakan dikirim')

    setTimeout(() => setFeeding(false), 2000)
  }

  // =========================
  // ADD SCHEDULE (BACKEND)
  // =========================
  async function addSchedule() {
    if (!scheduleTime) {
      toast.error('Masukkan jam jadwal')
      return
    }

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: scheduleType,
          action: scheduleAction,
          time: scheduleTime,
          chatId: 8385157031, // Chat ID dari environment
        }),
      })

      const data = await response.json()

      if (data.success) {
        addLog(
          'success',
          `Schedule ${scheduleType} ${scheduleAction} ${scheduleTime}`
        )

        toast.success('Jadwal tersimpan ke server')

        setScheduleTime('')
        fetchSchedules()
      } else {
        toast.error(data.error || 'Gagal tambah schedule')
        addLog('error', data.error || 'Gagal tambah schedule')
      }
    } catch (err) {
      console.error('Add schedule error:', err)
      toast.error('Gagal tambah schedule')
      addLog('error', 'Gagal tambah schedule')
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X /> : <Menu />}
            </Button>

            <div>
              <h1 className="text-xl font-bold text-purple-400">Pakan Kucing Dashboard</h1>
              <p className="text-xs text-zinc-400">Smart Automation System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="bg-purple-500/20 text-purple-300">
              <Clock className="mr-1 h-3 w-3" />
              {currentTime}
            </Badge>

            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setTheme(theme === 'dark' ? 'light' : 'dark')
              }
            >
              <Lightbulb />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex pt-20">
        {/* SIDEBAR */}
        <aside className={`fixed md:static z-40 top-20 left-0 w-64 bg-zinc-950 border-r border-white/10 transition-transform ${menuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <div className="p-4 space-y-3">
            <Button variant="ghost" className="w-full justify-start">
              <Activity className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" /> Jadwal
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Terminal className="mr-2 h-4 w-4" /> Logs
            </Button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* CONTROL */}
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader>
                <CardTitle>Kontrol</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-3">
                <Button onClick={feedNow} className="bg-blue-600">
                  <Cat className="mr-2" />
                  {feeding ? 'Feeding...' : 'Feed Kucing'}
                </Button>

                <Button onClick={lampOn} className="bg-yellow-500">
                  <Lightbulb className="mr-2" /> ON
                </Button>

                <Button onClick={lampOff} className="bg-red-500">
                  <Lightbulb className="mr-2" /> OFF
                </Button>
              </CardContent>
            </Card>

            {/* ADD SCHEDULE */}
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader>
                <CardTitle>Tambah Jadwal</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-4 gap-3">
                <select
                  className="bg-zinc-800 p-2 rounded"
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as any)}
                >
                  <option value="lampu">Lampu</option>
                  <option value="pakan">Pakan Kucing</option>
                </select>

                <select
                  className="bg-zinc-800 p-2 rounded"
                  value={scheduleAction}
                  onChange={(e) => setScheduleAction(e.target.value as any)}
                >
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                  <option value="feed">FEED</option>
                </select>

                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />

                <Button onClick={addSchedule}>
                  <Plus className="mr-2" />
                  Add
                </Button>
              </CardContent>
            </Card>

            {/* SCHEDULE LIST */}
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader>
                <CardTitle>Jadwal</CardTitle>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-zinc-600 mb-3" />
                    <p className="text-zinc-400">Belum ada jadwal</p>
                    <p className="text-zinc-500 text-sm mt-1">Tambahkan jadwal di form atas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((s, i) => (
                      <div key={i} className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-10 h-10 rounded-lg flex items-center justify-center
                              ${s.type === 'lampu' 
                                ? 'bg-yellow-500/20 text-yellow-400' 
                                : 'bg-blue-500/20 text-blue-400'}
                            `}>
                              {s.type === 'lampu' ? <Lightbulb className="h-5 w-5" /> : <Cat className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="font-medium text-white">
                                {s.type === 'lampu' ? 'Lampu' : 'Pakan Kucing'}{' '}
                                <span className={
                                  s.action === 'on' ? 'text-green-400' : 
                                  s.action === 'off' ? 'text-red-400' : 
                                  'text-blue-400'
                                }>
                                  {s.action === 'feed' ? 'Feed' : s.action.toUpperCase()}
                                </span>
                              </p>
                              <p className="text-sm text-zinc-400">
                                {s.time} WIB
                              </p>
                            </div>
                          </div>
                          <Badge className={
                            s.type === 'lampu' 
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }>
                            Aktif
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LOGS */}
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader>
                <CardTitle>Logs</CardTitle>
              </CardHeader>
              <CardContent className="h-64 overflow-y-auto text-sm font-mono">
                {logs.map((l) => (
                  <div key={l.id}>
                    [{l.type}] {l.message}
                  </div>
                ))}
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  )
}
