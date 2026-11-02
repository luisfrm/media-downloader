#!/usr/bin/env node
/**
 * Generates the shared image (Open Graph / Twitter card) and the icons.
 *
 * Everything is rendered locally at build time with Satori + resvg, so the
 * image is byte-identical on every machine and the landing never has to run a
 * Worker just to serve a social preview.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fontDir = path.join(root, 'src/assets/fonts')
const publicDir = path.join(root, 'public')
const iconFile = path.join(root, 'src/assets/app-icon.png')

const [geist400, geist600, inter400, inter600, mono400] = await Promise.all(
  ['Geist-Regular.ttf', 'Geist-SemiBold.ttf', 'Inter-Regular.ttf', 'Inter-SemiBold.ttf', 'JetBrainsMono-Regular.ttf'].map(
    (name) => readFile(path.join(fontDir, name)),
  ),
)

const screenshot = await sharp(path.join(root, 'src/assets/app-home.png'))
  .extract({ left: 238, top: 0, width: 942, height: 644 })
  .resize(496, 340, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toBuffer()

const icon = await sharp(iconFile).resize(120, 120).png({ compressionLevel: 9 }).toBuffer()

const colors = {
  bg: '#0B111E',
  surface: '#111A2E',
  ink: '#DDE2F5',
  ink2: '#BAC9CC',
  ink3: '#849396',
  cyan: '#00E5FF',
  line: 'rgba(255,255,255,0.10)',
}

const dataUri = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`

function chip(label, dot) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 9999,
        border: `1px solid ${colors.line}`,
        backgroundColor: 'rgba(255,255,255,0.03)',
        fontSize: 17,
        color: colors.ink2,
        fontFamily: 'Inter',
      },
      children: [
        { type: 'div', props: { style: { width: 7, height: 7, borderRadius: 9999, backgroundColor: dot } } },
        { type: 'span', props: { children: label } },
      ],
    },
  }
}

function text(value, style) {
  return { type: 'div', props: { style, children: value } }
}

const og = {
  type: 'div',
  props: {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
      width: 1200,
      height: 630,
      backgroundColor: colors.bg,
      backgroundImage:
        'radial-gradient(circle at 88% 8%, rgba(0,229,255,0.22), rgba(11,17,30,0) 46%), radial-gradient(circle at 8% 100%, rgba(37,99,235,0.20), rgba(11,17,30,0) 45%)',
      padding: 52,
      fontFamily: 'Inter',
      color: colors.ink,
    },
    children: [
      {
        type: 'div',
        props: {
          style: { display: 'flex', flexDirection: 'column', width: 576, height: 526 },
          children: [
            {
              type: 'div',
              props: {
                style: { display: 'flex', alignItems: 'center', gap: 16 },
                children: [
                  {
                    type: 'img',
                    props: { src: dataUri(icon), width: 60, height: 60, style: { borderRadius: 15 } },
                  },
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', flexDirection: 'column' },
                      children: [
                        text('Media Downloader', {
                          fontFamily: 'Geist',
                          fontWeight: 600,
                          fontSize: 27,
                          lineHeight: 1.1,
                        }),
                        text('yt-dlp + ffmpeg · todo local', {
                          fontFamily: 'JetBrainsMono',
                          fontSize: 13,
                          color: colors.ink3,
                          marginTop: 3,
                        }),
                      ],
                    },
                  },
                ],
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 44,
                  fontFamily: 'Geist',
                  fontWeight: 600,
                  fontSize: 56,
                  lineHeight: 1.06,
                  letterSpacing: '-0.03em',
                },
                children: [
                  { type: 'div', props: { style: { display: 'flex' }, children: 'Bajá videos y' } },
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex' },
                      children: [
                        { type: 'span', props: { style: { color: colors.cyan }, children: 'audio' } },
                        { type: 'span', props: { children: '\u00A0de tus redes.' } },
                      ],
                    },
                  },
                ],
              },
            },
            {
              type: 'div',
              props: {
                style: { marginTop: 16, fontSize: 21, lineHeight: 1.45, color: colors.ink2, maxWidth: 540 },
                children: 'Elegí resolución, formato y subtítulos. Sin cuenta, sin anuncios y sin subir nada a un servidor.',
              },
            },
            {
              type: 'div',
              props: {
                style: { display: 'flex', gap: 8, marginTop: 26 },
                children: [
                  chip('YouTube', '#FF0033'),
                  chip('X', '#E7E9EA'),
                  chip('TikTok', '#25F4EE'),
                  chip('Instagram', '#E1306C'),
                  chip('Facebook', '#1877F2'),
                ],
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  marginTop: 26,
                  fontFamily: 'JetBrainsMono',
                  fontSize: 15,
                  color: colors.ink3,
                },
                children: [
                  { type: 'div', props: { style: { width: 7, height: 7, borderRadius: 9999, backgroundColor: colors.cyan } } },
                  { type: 'span', props: { children: 'Windows · Linux · macOS' } },
                  { type: 'span', props: { children: '·' } },
                  { type: 'span', props: { children: 'Open source' } },
                ],
              },
            },
          ],
        },
      },
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: 496,
            marginTop: 18,
            borderRadius: 18,
            border: `1px solid rgba(255,255,255,0.14)`,
            backgroundColor: colors.surface,
            boxShadow: '0 40px 90px -30px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,229,255,0.08)',
            overflow: 'hidden',
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 38,
                  padding: '0 16px',
                  borderRadius: 2,
                  borderBottom: `1px solid ${colors.line}`,
                },
                children: [0, 1, 2].map(() => ({
                  type: 'div',
                  props: {
                    style: { width: 9, height: 9, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.18)' },
                  },
                })),
              },
            },
            {
              type: 'img',
              props: {
                src: dataUri(screenshot),
                width: 496,
                height: 340,
                style: { objectFit: 'cover' },
              },
            },
          ],
        },
      },
    ],
  },
}

async function renderPng(node, width) {
  const svg = await satori(node, {
    width,
    height: width === 1200 ? 630 : width,
    fonts: [
      { name: 'Geist', data: geist400, weight: 400, style: 'normal' },
      { name: 'Geist', data: geist600, weight: 600, style: 'normal' },
      { name: 'Inter', data: inter400, weight: 400, style: 'normal' },
      { name: 'Inter', data: inter600, weight: 600, style: 'normal' },
      { name: 'JetBrainsMono', data: mono400, weight: 400, style: 'normal' },
    ],
  })
  // resvg 2.6 cannot parse the empty masks Satori emits for fully rounded
  // corners (the three window dots). Dropping them keeps the clip radius.
  const sanitized = svg.replace(/ mask="url\(#[^"]*\)"/g, '').replace(/<mask[\s\S]*?<\/mask>/g, '')
  return new Resvg(sanitized, { fitTo: { mode: 'width', value: width } }).render().asPng()
}

await mkdir(publicDir, { recursive: true })
await writeFile(path.join(publicDir, 'shared-image.png'), await renderPng(og, 1200))

for (const size of [180, 192, 512]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`
  await writeFile(path.join(publicDir, name), await sharp(iconFile).resize(size, size).png().toBuffer())
}

console.log('✓ shared-image.png (1200×630) e iconos generados')
