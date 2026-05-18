'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  Lightbulb, 
  Fish, 
  Power, 
  PowerOff, 
  Clock, 
  Zap, 
  Terminal,
  Menu,
  X,
  ChevronRight,
  Activity,
  Calendar,
  Bell,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { useIsMobile } from '@/hooks/use-mobile'

interface Schedule {
  type: 'lampu' | 'pakan'
  action: 'on' | 'off' | 'feed'
  time: string
  chatId: number
  createdAt: string
  lastTriggered?: string
}

interface LogEntry {
  id: number
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export default function SyncroCommandDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isMobile = useIsMobile()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  // Status states
  const [lampStatus, setLampStatus] = useState<'on' | 'off'>('off')
  const [feedStatus, setFeedStatus] = useState<'idle' | 'feeding'>('idle')
  const [botStatus, setBotStatus] = useState<'online' | 'offline'>('online')
  
  // Schedule states
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [currentTime, setCurrentTime] = useState('')
  
  // Terminal logs
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: Date.now() - 6000, timestamp: new Date(Date.now() - 6000).toISOString(), type: 'info', message: 'SyncroCommand System initialized' },
    { id: Date.now() - 4000, timestamp: new Date(Date.now() - 4000).toISOString(), type: 'success', message: 'Telegram Bot connected' },
    { id: Date.now() - 2000, timestamp: new Date(Date.now() - 2000).toISOString(), type: 'info', message: 'Automation system ready' },
  ])
  
  useEffect(() => {
    setMounted(true)
    fetchSchedules()
    updateTime()
    
    const timeInterval = setInterval(updateTime, 1000)
    const scheduleInterval = setInterval(fetchSchedules, 30000) // Refresh every 30s
    
    return () => {
      clearInterval(timeInterval)
      clearInterval(scheduleInterval)
    }
  }, [])
  
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false)
    }
  }, [isMobile])
  
  function updateTime() {
    const now = new Date()
    const jakartaTime = now.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    setCurrentTime(jakartaTime)
  }
  
  function addLog(type: LogEntry['type'], message: string) {
    const newLog: LogEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      message,
    }
    setLogs(prev => [newLog, ...prev].slice(0, 50)) // Keep last 50 logs
  }
  
  async function fetchSchedules() {
    try {
      const response = await fetch('/api/schedule')
      if (response.ok) {
        const data = await response.json()
        if (data.allSchedules) {
          setSchedules(data.allSchedules)
        }
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    }
  }
  
  async function sendTelegramCommand(command: string) {
    try {
      addLog('info', `Sending command: ${command}`)
      
      const response = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: command }),
      })
      
      if (response.ok) {
        addLog('success', `Command sent: ${command}`)
        toast.success('Command sent successfully!')
      } else {
        throw new Error('Failed to send command')
      }
    } catch (error) {
      addLog('error', `Failed to send: ${command}`)
      toast.error('Failed to send command')
    }
  }
  
  async function toggleLamp() {
    const newStatus = lampStatus === 'on' ? 'off' : 'on'
    setLampStatus(newStatus)
    
    const command = newStatus === 'on' ? '/lampuon' : '/lampuoff'
    await sendTelegramCommand(command)
    
    addLog('success', `Lamp turned ${newStatus.toUpperCase()}`)
    toast.success(`Lamp ${newStatus.toUpperCase()}`)
  }
  
  async function triggerFeed() {
    setFeedStatus('feeding')
    await sendTelegramCommand('/pakan')
    addLog('success', 'Feeding triggered')
    toast.success('Feed triggered!')
    
    setTimeout(() => {
      setFeedStatus('idle')
    }, 2000)
  }
  
  async function handleQuickCommand(command: string, description: string) {
    await sendTelegramCommand(command)
    toast.success(description)
  }
  
  function getLogColor(type: LogEntry['type']) {
    switch (type) {
      case 'success': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-blue-400'
    }
  }
  
  function getLogIcon(type: LogEntry['type']) {
    switch (type) {
      case 'success': return '✓'
      case 'warning': return '⚠'
      case 'error': return '✕'
      default: return '→'
    }
  }
  
  if (!mounted) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-purple-500/20">
        <div className="flex items-center justify-between px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Zap className="h-6 w-6 text-purple-400" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  SyncroCommand
                </h1>
                <p className="text-xs text-muted-foreground">Pet Automation System</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="glass">
              <Clock className="h-3 w-3 mr-1" />
              {currentTime}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Lightbulb className="h-4 w-4" /> : <Lightbulb className="h-4 w-4 fill-current" />}
            </Button>
          </div>
        </div>
      </header>
      
      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-40 w-64 glass border-r border-purple-500/20
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}>
          <div className="flex flex-col h-full pt-16 md:pt-0">
            <div className="p-4 border-b border-purple-500/20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>System Status</span>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <Button variant="ghost" className="w-full justify-start" onClick={() => {}}>
                <Activity className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => {}}>
                <Calendar className="mr-2 h-4 w-4" />
                Schedules
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => {}}>
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => {}}>
                <Terminal className="mr-2 h-4 w-4" />
                Logs
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => {}}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </nav>
            
            <div className="p-4 border-t border-purple-500/20">
              <div className="glass rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bot Status</span>
                  <Badge className={botStatus === 'online' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                    {botStatus === 'online' ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Schedules</span>
                  <span className="font-mono text-purple-400">{schedules.length}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Status Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Lamp Status */}
              <Card className="glass cyber-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-400" />
                      Lamp Status
                    </CardTitle>
                    <Badge className={lampStatus === 'on' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}>
                      {lampStatus.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={lampStatus === 'on' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={toggleLamp}
                      disabled={lampStatus === 'on'}
                    >
                      <Power className="h-4 w-4 mr-1" />
                      ON
                    </Button>
                    <Button
                      size="sm"
                      variant={lampStatus === 'off' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={toggleLamp}
                      disabled={lampStatus === 'off'}
                    >
                      <PowerOff className="h-4 w-4 mr-1" />
                      OFF
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Feed Status */}
              <Card className="glass cyber-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Fish className="h-4 w-4 text-blue-400" />
                      Feed Status
                    </CardTitle>
                    <Badge className={feedStatus === 'feeding' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}>
                      {feedStatus.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={triggerFeed}
                    disabled={feedStatus === 'feeding'}
                  >
                    <Fish className="h-4 w-4 mr-2" />
                    {feedStatus === 'feeding' ? 'Feeding...' : 'Feed Now'}
                  </Button>
                </CardContent>
              </Card>
              
              {/* Bot Status */}
              <Card className="glass cyber-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Bot className="h-4 w-4 text-purple-400" />
                      Telegram Bot
                    </CardTitle>
                    <Badge className={botStatus === 'online' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                      {botStatus === 'online' ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Bot is {botStatus === 'online' ? 'active' : 'inactive'}</p>
                    <p>Webhook: <span className="text-green-400">Active</span></p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Quick Commands */}
            <Card className="glass cyber-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-400" />
                  Quick Commands
                </CardTitle>
                <CardDescription>
                  Send commands directly to Telegram Bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <Button
                    variant="outline"
                    className="justify-start glass"
                    onClick={() => handleQuickCommand('/start', 'Start command sent')}
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    /start
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start glass"
                    onClick={() => handleQuickCommand('/status', 'Status command sent')}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    /status
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start glass"
                    onClick={() => handleQuickCommand('/jadwal', 'Schedule command sent')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    /jadwal
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start glass"
                    onClick={() => handleQuickCommand('/lampuon', 'Lamp ON command sent')}
                  >
                    <Power className="mr-2 h-4 w-4" />
                    Lampu ON
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start glass"
                    onClick={() => handleQuickCommand('/lampuoff', 'Lamp OFF command sent')}
                  >
                    <PowerOff className="mr-2 h-4 w-4" />
                    Lampu OFF
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start glass"
                    onClick={() => handleQuickCommand('/pakan', 'Feed command sent')}
                  >
                    <Fish className="mr-2 h-4 w-4" />
                    Pakan ON
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Terminal Logs */}
              <Card className="glass cyber-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-green-400" />
                    Terminal Logs
                  </CardTitle>
                  <CardDescription>
                    Real-time system logs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="terminal rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs space-y-1 scanline relative">
                    {logs.map((log) => (
                      <div key={log.id} className={`${getLogColor(log.type)} flex gap-2`}>
                        <span className="text-muted-foreground">
                          [{new Date(log.timestamp).toLocaleTimeString('id-ID')}]
                        </span>
                        <span>{getLogIcon(log.type)}</span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Schedules */}
              <Card className="glass cyber-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    Active Schedules
                  </CardTitle>
                  <CardDescription>
                    Automated task schedules
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {schedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No schedules configured
                      </p>
                    ) : (
                      schedules.map((schedule, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 glass rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-8 h-8 rounded-lg flex items-center justify-center
                              ${schedule.type === 'lampu' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}
                            `}>
                              {schedule.type === 'lampu' ? <Lightbulb className="h-4 w-4" /> : <Fish className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {schedule.type === 'lampu' ? 'Lampu' : 'Pakan'} {schedule.action === 'on' ? 'ON' : schedule.action === 'off' ? 'OFF' : 'Feed'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {schedule.time} Asia/Jakarta
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="glass">
                            Active
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
