'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  value: string
  size?: number
  className?: string
}

export function QrCode({ value, size = 200, className }: Props) {
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    if (!value) return
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: '#1F1235', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(''))
  }, [value, size])

  if (!dataUrl) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: '#F3EEFF',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: '#7A6A94',
        }}
      >
        QR…
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt="QR-Code"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 12, background: 'white', padding: 8, border: '1px solid #E9D5FF' }}
    />
  )
}

interface KlassenraumQrProps {
  url: string
  hinweis?: string
}

export function KlassenraumQr({ url, hinweis }: KlassenraumQrProps) {
  const [fullscreen, setFullscreen] = useState(false)

  function onPrint() {
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) return
    QRCode.toDataURL(url, { width: 800, margin: 2 }).then((dataUrl) => {
      w.document.write(`
        <html>
          <head><title>EduGame – QR-Code zum Spielen</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; color: #1F1235; }
            img { width: 480px; height: 480px; }
            h1 { font-size: 28px; margin-bottom: 8px; }
            p { font-size: 18px; color: #7A6A94; margin-top: 0; }
            .url { font-family: monospace; font-size: 16px; margin-top: 24px; padding: 12px 20px; background: #F6F1FF; border-radius: 12px; display: inline-block; }
          </style></head>
          <body>
            <h1>Mit dem Handy scannen</h1>
            <p>So kommst du zum Lernspiel</p>
            <img src="${dataUrl}" alt="QR-Code" />
            <div class="url">${url}</div>
            <script>window.onload = () => setTimeout(() => window.print(), 200);</script>
          </body>
        </html>
      `)
      w.document.close()
    })
  }

  return (
    <>
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E9D5FF',
          borderRadius: 20,
          boxShadow: '0 2px 24px rgba(124,58,237,0.08)',
          padding: 24,
          display: 'flex',
          gap: 24,
          alignItems: 'center',
        }}
      >
        <QrCode value={url} size={140} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.08em', marginBottom: 4 }}>
            FÜR DIE KLASSE
          </p>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1F1235', marginBottom: 6 }}>
            Schüler scannen den Code
          </h3>
          <p style={{ fontSize: 13, color: '#7A6A94', marginBottom: 12, lineHeight: 1.5 }}>
            {hinweis ?? 'Beam ihn an die Wand oder druck ihn aus. Die Kinder geben dann ihren persönlichen Code ein.'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setFullscreen(true)}
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
              }}
            >
              ⛶ Großbild anzeigen
            </button>
            <button
              onClick={onPrint}
              style={{
                background: '#F3EEFF',
                color: '#7C3AED',
                border: '1px solid #E9D5FF',
                borderRadius: 10,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🖨 Drucken
            </button>
          </div>
        </div>
      </div>

      {fullscreen && (
        <div
          onClick={() => setFullscreen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(22,11,46,0.92)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <p style={{ color: 'white', fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
            Scanne den Code mit deinem Handy
          </p>
          <p style={{ color: '#C4B5FD', fontSize: 18, marginBottom: 32 }}>
            So kommst du zum Lernspiel
          </p>
          <div style={{ background: 'white', padding: 24, borderRadius: 24 }}>
            <QrCode value={url} size={420} />
          </div>
          <p style={{ color: '#C4B5FD', fontSize: 14, marginTop: 32, fontFamily: 'monospace' }}>
            {url}
          </p>
          <p style={{ color: '#7A6A94', fontSize: 12, marginTop: 24 }}>
            Klick irgendwo zum Schließen
          </p>
        </div>
      )}
    </>
  )
}
