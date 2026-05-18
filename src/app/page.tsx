'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Calculator, Download, Shield, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

// Tipe data untuk hasil perhitungan
interface NIOSHResult {
  LC: number
  HM: number
  VM: number
  DM: number
  AM: number
  FM: number
  CM: number
  RWL: number
  LI: number
  riskCategory: 'safe' | 'medium' | 'high'
}

// Tipe data untuk input form
interface FormData {
  jobName: string
  location: string
  analysisDate: string
  analyst: string
  loadWeight: number
  horizontalDistance: number
  verticalHeight: number
  verticalTravelDistance: number
  asymmetricAngle: number
  frequency: number
  duration: string
  coupling: string
}

// Faktor FM berdasarkan frekuensi dan durasi (tabel NIOSH)
function getFM(frequency: number, duration: string): number {
  const freq = Math.round(frequency)
  const durationMap: Record<string, number> = {
    '≤1 jam': 1,
    '1-2 jam': 2,
    '2-8 jam': 3
  }
  const durationKey = duration

  // Tabel FM NIOSH
  const fmTable: Record<string, Record<number, number>> = {
    1: { 0.2: 1.00, 0.5: 0.97, 1: 0.94, 2: 0.91, 3: 0.88, 4: 0.84, 5: 0.81, 6: 0.78, 7: 0.75, 8: 0.73, 9: 0.70, 10: 0.68, 11: 0.66, 12: 0.64, 13: 0.62, 14: 0.60, 15: 0.59 },
    2: { 0.2: 0.95, 0.5: 0.92, 1: 0.88, 2: 0.84, 3: 0.81, 4: 0.77, 5: 0.74, 6: 0.71, 7: 0.68, 8: 0.66, 9: 0.64, 10: 0.62, 11: 0.60, 12: 0.58, 13: 0.57, 14: 0.55, 15: 0.54 },
    3: { 0.2: 0.85, 0.5: 0.81, 1: 0.78, 2: 0.74, 3: 0.70, 4: 0.66, 5: 0.63, 6: 0.60, 7: 0.58, 8: 0.56, 9: 0.54, 10: 0.52, 11: 0.50, 12: 0.49, 13: 0.47, 14: 0.46, 15: 0.45 }
  }

  const durationValues = fmTable[durationKey] || fmTable[1]

  // Cari frekuensi terdekat
  const freqs = Object.keys(durationValues).map(Number).sort((a, b) => a - b)
  const closestFreq = freqs.reduce((prev, curr) => {
    return Math.abs(curr - freq) < Math.abs(prev - freq) ? curr : prev
  })

  return durationValues[closestFreq] || 0.70
}

// Faktor CM berdasarkan kualitas coupling
function getCM(coupling: string): number {
  const cmMap: Record<string, number> = {
    'Good': 1.0,
    'Fair': 0.95,
    'Poor': 0.90
  }
  return cmMap[coupling] || 0.95
}

// Fungsi utama untuk menghitung NIOSH
function calculateNIOSH(data: FormData): NIOSHResult {
  const LC = 23 // Load Constant

  // Horizontal Multiplier: HM = 25 / H
  const HM = Math.min(25 / data.horizontalDistance, 1.0)

  // Vertical Multiplier: VM = 1 − 0.003 × |V − 75|
  const VM = 1 - 0.003 * Math.abs(data.verticalHeight - 75)
  const VM_clamped = Math.max(VM, 0)

  // Distance Multiplier: DM = 0.82 + (4.5 / D)
  const DM = 0.82 + (4.5 / data.verticalTravelDistance)
  const DM_clamped = Math.min(Math.max(DM, 0), 1.0)

  // Asymmetric Multiplier: AM = 1 − 0.0032 × A
  const AM = 1 - 0.0032 * data.asymmetricAngle
  const AM_clamped = Math.max(AM, 0)

  // Frequency Multiplier (dari tabel)
  const FM = getFM(data.frequency, data.duration)

  // Coupling Multiplier
  const CM = getCM(data.coupling)

  // Recommended Weight Limit: RWL = LC × HM × VM × DM × AM × FM × CM
  const RWL = LC * HM * VM_clamped * DM_clamped * AM_clamped * FM * CM

  // Lifting Index: LI = Load Weight / RWL
  const LI = data.loadWeight / RWL

  // Tentukan kategori risiko
  let riskCategory: 'safe' | 'medium' | 'high' = 'high'
  if (LI <= 1.0) {
    riskCategory = 'safe'
  } else if (LI <= 3.0) {
    riskCategory = 'medium'
  } else {
    riskCategory = 'high'
  }

  return {
    LC,
    HM,
    VM: VM_clamped,
    DM: DM_clamped,
    AM: AM_clamped,
    FM,
    CM,
    RWL,
    LI,
    riskCategory
  }
}

// Fungsi untuk export ke Excel
function exportToExcel(data: FormData, result: NIOSHResult) {
  // Sheet 1: DATA INPUT
  const inputData = [
    ['DATA INPUT MANUAL LIFTING', '', ''],
    ['', '', ''],
    ['Data Umum', '', ''],
    ['Nama Pekerjaan', data.jobName, ''],
    ['Lokasi Kerja', data.location, ''],
    ['Tanggal Analisis', data.analysisDate, ''],
    ['Analis / Evaluator', data.analyst, ''],
    ['', '', ''],
    ['Parameter', 'Nilai', 'Satuan'],
    ['Berat Beban', data.loadWeight, 'kg'],
    ['Horizontal Distance (H)', data.horizontalDistance, 'cm'],
    ['Vertical Height (V)', data.verticalHeight, 'cm'],
    ['Vertical Travel Distance (D)', data.verticalTravelDistance, 'cm'],
    ['Asymmetric Angle (A)', data.asymmetricAngle, 'derajat'],
    ['Frekuensi Lifting', data.frequency, 'lift/menit'],
    ['Durasi Kerja', data.duration, ''],
    ['Kualitas Coupling', data.coupling, '']
  ]

  const wsInput = XLSX.utils.aoa_to_sheet(inputData)

  // Set width column
  wsInput['!cols'] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 10 }
  ]

  // Bold headers
  wsInput['A1'].s = { font: { bold: true, sz: 14 } }
  wsInput['A5'].s = { font: { bold: true } }
  wsInput['A13'].s = { font: { bold: true } }
  wsInput['B13'].s = { font: { bold: true } }
  wsInput['C13'].s = { font: { bold: true } }

  // Sheet 2: FAKTOR NIOSH
  const factorData = [
    ['FAKTOR NIOSH', '', ''],
    ['', '', ''],
    ['Faktor', 'Nilai', 'Deskripsi'],
    ['LC (Load Constant)', result.LC.toFixed(2), 'Konstanta beban dasar'],
    ['HM (Horizontal Multiplier)', result.HM.toFixed(3), `25 / ${data.horizontalDistance}`],
    ['VM (Vertical Multiplier)', result.VM.toFixed(3), `1 − 0.003 × |${data.verticalHeight} − 75|`],
    ['DM (Distance Multiplier)', result.DM.toFixed(3), `0.82 + (4.5 / ${data.verticalTravelDistance})`],
    ['AM (Asymmetric Multiplier)', result.AM.toFixed(3), `1 − 0.0032 × ${data.asymmetricAngle}`],
    ['FM (Frequency Multiplier)', result.FM.toFixed(3), `${data.frequency} lift/menit, ${data.duration}`],
    ['CM (Coupling Multiplier)', result.CM.toFixed(2), data.coupling]
  ]

  const wsFactors = XLSX.utils.aoa_to_sheet(factorData)
  wsFactors['!cols'] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 40 }
  ]

  wsFactors['A1'].s = { font: { bold: true, sz: 14 } }
  wsFactors['A3'].s = { font: { bold: true } }
  wsFactors['B3'].s = { font: { bold: true } }
  wsFactors['C3'].s = { font: { bold: true } }

  // Sheet 3: HASIL ANALISIS
  const riskColor = result.riskCategory === 'safe' ? 'Hijau' : result.riskCategory === 'medium' ? 'Kuning' : 'Merah'
  const resultData = [
    ['HASIL ANALISIS ERGONOMI', '', ''],
    ['', '', ''],
    ['Parameter', 'Nilai', 'Keterangan'],
    ['Recommended Weight Limit (RWL)', `${result.RWL.toFixed(2)} kg`, 'Beban maksimal yang direkomendasikan'],
    ['Lifting Index (LI)', result.LI.toFixed(2), 'Rasio beban terhadap RWL'],
    ['', '', ''],
    ['KATEGORI RISIKO', '', ''],
    ['Kategori', result.riskCategory.toUpperCase(), `Indikator: ${riskColor}`],
    ['', '', ''],
    ['', '', ''],
    ['STATUS RISIKO:', '', ''],
    [result.riskCategory === 'safe' ? 'AMAN' : result.riskCategory === 'medium' ? 'RISIKO SEDANG' : 'RISIKO TINGGI', '', '']
  ]

  const wsResults = XLSX.utils.aoa_to_sheet(resultData)
  wsResults['!cols'] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 40 }
  ]

  wsResults['A1'].s = { font: { bold: true, sz: 14 } }
  wsResults['A3'].s = { font: { bold: true } }
  wsResults['B3'].s = { font: { bold: true } }
  wsResults['C3'].s = { font: { bold: true } }
  wsResults['A7'].s = { font: { bold: true } }
  wsResults['B7'].s = { font: { bold: true } }
  wsResults['A10'].s = { font: { bold: true, sz: 12 } }

  // Apply conditional formatting colors
  if (result.riskCategory === 'safe') {
    wsResults['A12'].s = { font: { bold: true, color: { rgb: '008000' } } }
  } else if (result.riskCategory === 'medium') {
    wsResults['A12'].s = { font: { bold: true, color: { rgb: 'FFA500' } } }
  } else {
    wsResults['A12'].s = { font: { bold: true, color: { rgb: 'FF0000' } } }
  }

  // Sheet 4: DISCLAIMER
  const disclaimerData = [
    ['DISCLAIMER K3 (Keselamatan dan Kesehatan Kerja)', '', ''],
    ['', '', ''],
    ['Alat ini dikembangkan berdasarkan persamaan lifting NIOSH (National Institute for Occupational Safety and Health).', '', ''],
    ['', '', ''],
    ['1. Hasil perhitungan ini adalah estimasi dan harus digunakan sebagai panduan awal dalam assessment ergonomi.', '', ''],
    ['', '', ''],
    ['2. Kalkulator ini tidak menggantikan assessment ergonomi yang dilakukan oleh profesional K3 yang tersertifikasi.', '', ''],
    ['', '', ''],
    ['3. Perusahaan/individu yang menggunakan alat ini bertanggung jawab penuh atas penggunaan dan interpretasi hasilnya.', '', ''],
    ['', '', ''],
    ['4. Untuk kondisi kerja yang kompleks atau hasil yang menunjukkan risiko tinggi, disarankan melakukan assessment', '', ''],
    ['   ergonomi menyeluruh oleh ahli K3.', '', ''],
    ['', '', ''],
    ['5. Konsultasikan dengan profesional K3 dan tenaga kerja terkait untuk perbaikan ergonomi dan kontrol risiko.', '', ''],
    ['', '', ''],
    ['', '', ''],
    ['Dibuat:', format(new Date(), 'dd MMMM yyyy'), ''],
    ['Oleh:', data.analyst, '']
  ]

  const wsDisclaimer = XLSX.utils.aoa_to_sheet(disclaimerData)
  wsDisclaimer['!cols'] = [
    { wch: 80 },
    { wch: 10 },
    { wch: 20 }
  ]

  wsDisclaimer['A1'].s = { font: { bold: true, sz: 12 } }

  // Buat workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsInput, 'DATA INPUT')
  XLSX.utils.book_append_sheet(wb, wsFactors, 'FAKTOR NIOSH')
  XLSX.utils.book_append_sheet(wb, wsResults, 'HASIL ANALISIS')
  XLSX.utils.book_append_sheet(wb, wsDisclaimer, 'DISCLAIMER')

  // Generate nama file dengan tanggal
  const fileName = `WISHA_Lifting_Assessment_${format(new Date(), 'yyyyMMdd')}.xlsx`

  // Download file
  XLSX.writeFile(wb, fileName)
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    jobName: '',
    location: '',
    analysisDate: format(new Date(), 'yyyy-MM-dd'),
    analyst: '',
    loadWeight: 0,
    horizontalDistance: 63, // default NIOSH
    verticalHeight: 75, // default NIOSH
    verticalTravelDistance: 25, // default NIOSH
    asymmetricAngle: 0,
    frequency: 0.2,
    duration: '1-2 jam',
    coupling: 'Fair'
  })

  const [result, setResult] = useState<NIOSHResult | null>(null)

  const handleCalculate = () => {
    const calculationResult = calculateNIOSH(formData)
    setResult(calculationResult)
  }

  const handleExport = () => {
    if (result) {
      exportToExcel(formData, result)
    }
  }

  const handleReset = () => {
    setFormData({
      jobName: '',
      location: '',
      analysisDate: format(new Date(), 'yyyy-MM-dd'),
      analyst: '',
      loadWeight: 0,
      horizontalDistance: 63,
      verticalHeight: 75,
      verticalTravelDistance: 25,
      asymmetricAngle: 0,
      frequency: 0.2,
      duration: '1-2 jam',
      coupling: 'Fair'
    })
    setResult(null)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="w-8 h-8" />
            <h1 className="text-3xl font-bold">NIOSH-based Lifting Calculator</h1>
          </div>
          <p className="text-primary-foreground/80">
            Alat assessment ergonomi manual lifting untuk evaluasi risiko K3
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Input Form */}
          <div className="space-y-6">
            {/* General Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Data Umum
                </CardTitle>
                <CardDescription>Informasi dasar pekerjaan dan analisis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="jobName">Nama Pekerjaan</Label>
                    <Input
                      id="jobName"
                      value={formData.jobName}
                      onChange={(e) => setFormData({ ...formData, jobName: e.target.value })}
                      placeholder="Contoh: Pemindahan Box A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Lokasi Kerja</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Contoh: Gudang A"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="analysisDate">Tanggal Analisis</Label>
                    <Input
                      id="analysisDate"
                      type="date"
                      value={formData.analysisDate}
                      onChange={(e) => setFormData({ ...formData, analysisDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="analyst">Analis / Evaluator</Label>
                    <Input
                      id="analyst"
                      value={formData.analyst}
                      onChange={(e) => setFormData({ ...formData, analyst: e.target.value })}
                      placeholder="Nama analis"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lifting Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Data Lifting
                </CardTitle>
                <CardDescription>Parameter lifting untuk perhitungan NIOSH</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loadWeight">Berat Beban (kg)</Label>
                  <Input
                    id="loadWeight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.loadWeight || ''}
                    onChange={(e) => setFormData({ ...formData, loadWeight: parseFloat(e.target.value) || 0 })}
                    placeholder="Masukkan berat beban dalam kg"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="horizontalDistance">
                      Horizontal Distance - H (cm)
                    </Label>
                    <Input
                      id="horizontalDistance"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.horizontalDistance}
                      onChange={(e) => setFormData({ ...formData, horizontalDistance: parseFloat(e.target.value) || 0 })}
                      placeholder="Default: 63"
                    />
                    <p className="text-xs text-muted-foreground">Jarak horizontal dari pusat beban ke tubuh</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verticalHeight">
                      Vertical Height - V (cm)
                    </Label>
                    <Input
                      id="verticalHeight"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.verticalHeight}
                      onChange={(e) => setFormData({ ...formData, verticalHeight: parseFloat(e.target.value) || 0 })}
                      placeholder="Default: 75"
                    />
                    <p className="text-xs text-muted-foreground">Tinggi vertikal awal dari lantai</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="verticalTravelDistance">
                      Vertical Travel Distance - D (cm)
                    </Label>
                    <Input
                      id="verticalTravelDistance"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.verticalTravelDistance}
                      onChange={(e) => setFormData({ ...formData, verticalTravelDistance: parseFloat(e.target.value) || 0 })}
                      placeholder="Default: 25"
                    />
                    <p className="text-xs text-muted-foreground">Jarak perjalanan vertikal beban</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asymmetricAngle">
                      Asymmetric Angle - A (derajat)
                    </Label>
                    <Input
                      id="asymmetricAngle"
                      type="number"
                      step="1"
                      min="0"
                      max="135"
                      value={formData.asymmetricAngle}
                      onChange={(e) => setFormData({ ...formData, asymmetricAngle: parseFloat(e.target.value) || 0 })}
                      placeholder="Default: 0"
                    />
                    <p className="text-xs text-muted-foreground">Sudut putar tubuh saat lifting</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frekuensi (lift/menit)</Label>
                    <Input
                      id="frequency"
                      type="number"
                      step="0.1"
                      min="0"
                      max="15"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: parseFloat(e.target.value) || 0 })}
                      placeholder="Default: 0.2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durasi Kerja</Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) => setFormData({ ...formData, duration: value })}
                    >
                      <SelectTrigger id="duration">
                        <SelectValue placeholder="Pilih durasi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="≤1 jam">≤ 1 jam</SelectItem>
                        <SelectItem value="1-2 jam">1 - 2 jam</SelectItem>
                        <SelectItem value="2-8 jam">2 - 8 jam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coupling">Kualitas Coupling</Label>
                  <Select
                    value={formData.coupling}
                    onValueChange={(value) => setFormData({ ...formData, coupling: value })}
                  >
                    <SelectTrigger id="coupling">
                      <SelectValue placeholder="Pilih kualitas coupling" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good (Baik)</SelectItem>
                      <SelectItem value="Fair">Fair (Sedang)</SelectItem>
                      <SelectItem value="Poor">Poor (Buruk)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Good: Pegangan yang optimal, Fair: Pegangan yang cukup, Poor: Pegangan yang buruk
                  </p>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={handleCalculate} className="flex-1" size="lg">
                    <Calculator className="w-4 h-4 mr-2" />
                    Hitung Analisis
                  </Button>
                  <Button onClick={handleReset} variant="outline" size="lg">
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Results Card */}
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Hasil Analisis
                </CardTitle>
                <CardDescription>Hasil perhitungan NIOSH lifting equation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {result ? (
                  <>
                    {/* Risk Category Badge */}
                    <div className="text-center py-6">
                      <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold ${
                        result.riskCategory === 'safe'
                          ? 'bg-green-100 text-green-700 border-2 border-green-500'
                          : result.riskCategory === 'medium'
                          ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-500'
                          : 'bg-red-100 text-red-700 border-2 border-red-500'
                      }`}>
                        {result.riskCategory === 'safe' && <CheckCircle2 className="w-6 h-6" />}
                        {result.riskCategory === 'medium' && <AlertTriangle className="w-6 h-6" />}
                        {result.riskCategory === 'high' && <AlertTriangle className="w-6 h-6" />}
                        <span>
                          {result.riskCategory === 'safe' ? 'AMAN' : result.riskCategory === 'medium' ? 'RISIKO SEDANG' : 'RISIKO TINGGI'}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {result.riskCategory === 'safe' && 'Kondisi kerja aman, risiko ergonomi rendah'}
                        {result.riskCategory === 'medium' && 'Perlu perhatian, sebaiknya dilakukan perbaikan ergonomi'}
                        {result.riskCategory === 'high' && 'Risiko tinggi, segera lakukan perbaikan ergonomi'}
                      </p>
                    </div>

                    <Separator />

                    {/* Main Results */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">RWL (Recommended Weight Limit)</p>
                          <p className="text-xs text-muted-foreground">Beban maksimal yang direkomendasikan</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{result.RWL.toFixed(2)} kg</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">LI (Lifting Index)</p>
                          <p className="text-xs text-muted-foreground">Rasio beban terhadap RWL</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${
                            result.LI <= 1.0 ? 'text-green-600' : result.LI <= 3.0 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {result.LI.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* NIOSH Factors */}
                    <div>
                      <h3 className="font-semibold mb-3">Faktor NIOSH</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">LC (Load Constant)</span>
                          <span className="font-medium">{result.LC} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">HM (Horizontal Multiplier)</span>
                          <span className="font-medium">{result.HM.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">VM (Vertical Multiplier)</span>
                          <span className="font-medium">{result.VM.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">DM (Distance Multiplier)</span>
                          <span className="font-medium">{result.DM.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">AM (Asymmetric Multiplier)</span>
                          <span className="font-medium">{result.AM.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">FM (Frequency Multiplier)</span>
                          <span className="font-medium">{result.FM.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CM (Coupling Multiplier)</span>
                          <span className="font-medium">{result.CM.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Risk Scale */}
                    <div>
                      <h3 className="font-semibold mb-3">Skala Risiko</h3>
                      <div className="flex gap-2">
                        <Badge className="flex-1 justify-center py-2 bg-green-500 hover:bg-green-600">
                          LI &lt;= 1.0: Aman
                        </Badge>
                        <Badge className="flex-1 justify-center py-2 bg-yellow-500 hover:bg-yellow-600">
                          1.0 &lt; LI &lt;= 3.0: Sedang
                        </Badge>
                        <Badge className="flex-1 justify-center py-2 bg-red-500 hover:bg-red-600">
                          LI &gt; 3.0: Tinggi
                        </Badge>
                      </div>
                    </div>

                    {/* Export Button */}
                    <Button
                      onClick={handleExport}
                      className="w-full"
                      size="lg"
                      variant="default"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export ke Excel
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calculator className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Isi data di sebelah kiri dan klik "Hitung Analisis"</p>
                    <p className="text-sm mt-2">untuk melihat hasil perhitungan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-6 px-4 border-t mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Disclaimer K3:</strong> Alat ini dikembangkan berdasarkan persamaan lifting NIOSH (National Institute for Occupational Safety and Health). Hasil perhitungan ini adalah estimasi dan harus digunakan sebagai panduan awal dalam assessment ergonomi.
            </p>
            <p className="text-xs text-muted-foreground">
              Kalkulator ini tidak menggantikan assessment ergonomi yang dilakukan oleh profesional K3 yang tersertifikasi. Perusahaan/individu yang menggunakan alat ini bertanggung jawab penuh atas penggunaan dan interpretasi hasilnya.
            </p>
            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground">
              NIOSH-based Lifting Calculator &copy; {new Date().getFullYear()} | Untuk tujuan assessment ergonomi dan Keselamatan Kerja (K3)
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
