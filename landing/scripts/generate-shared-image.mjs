#!/usr/bin/env node
/**
 * Cobalt shared image and icons.
 *
 * The page, the OG card and the icons are one system: cool paper, cobalt,
 * Familjen Grotesk over IBM Plex Sans, JetBrains Mono for machine values.
 * Everything is rendered at build time, so the Worker only serves bytes.
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

const [familjen600, familjen500, plex400, plex500, mono400] = await Promise.all(
  [
    'FamiljenGrotesk-SemiBold.ttf',
    'FamiljenGrotesk-Medium.ttf',
    'IBMPlexSans-Regular.ttf',
    'IBMPlexSans-Medium.ttf',
    'JetBrainsMono-Regular.ttf',
  ].map((name) => readFile(path.join(fontDir, name))),
)

const screenshot = await sharp(path.join(root, 'src/assets/app-queue.png'))
  .extract({ left: 240, top: 0, width: 1200, height: 750 })
  .resize(520, 325, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toBuffer()

const icon = await sharp(iconFile).resize(112, 112).png({ compressionLevel: 9 }).toBuffer()
const dataUri = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`

const colors = {
  paper: '#F7F9FC',
  paper2: '#EFF2F7',
  ink: '#171B22',
  ink2: '#3C414B',
  muted: '#6B7280',
  rule: '#E1E5EC',
  accent: '#1F4FD8',
  accentInk: '#F7F9FC',
  graphite: '#1B1F27',
  graphiteInk: '#E9EDF5',
  glyph: '#AFC4EA',
}

const field = [
  'x.com/DonShelby_/status/2116216248  mp4 1280x1590  13.2 MB',
  'youtube.com/watch  mp4 3840x2160  vtt es',
  'tiktok.com/@  mp4 1080x1920  sin marca de agua',
  'instagram.com/reel  mp4 1080x1350  carrusel',
  'facebook.com/watch  mp4 1280x720  reels',
  'mp3 320  flac  m4a  wav  opus',
  'windows-x64  70.6 MB  linux-x64  142 MB  macos-arm64  37.9 MB',
  'x.com/DonShelby_/status/2116216248  mp4 1280x1590  13.2 MB',
  'youtube.com/watch  mp4 3840x2160  vtt es',
  'tiktok.com/@  mp4 1080x1920  sin marca de agua',
  'instagram.com/reel  mp4 1080x1350  carrusel',
  'facebook.com/watch  mp4 1280x720  reels',
  'mp3 320  flac  m4a  wav  opus',
  'windows-x64  70.6 MB  linux-x64  142 MB  macos-arm64  37.9 MB',
].join('\n')

const og = {
  type: 'div',
  props: {
    style: {
      display: 'flex',
      width: 1200,
      height: 630,
      backgroundColor: colors.paper,
      color: colors.ink,
      fontFamily: 'IBM Plex Sans',
      padding: 56,
      position: 'relative',
      overflow: 'hidden',
    },
    children: [
      {
        type: 'div',
        props: {
          style: {
            position: 'absolute',
            left: 540,
            top: 24,
            width: 660,
            height: 582,
            overflow: 'hidden',
            opacity: 0.7,
          },
          children: {
            type: 'div',
            props: {
              style: {
                fontFamily: 'JetBrains Mono',
                fontSize: 11,
                lineHeight: '16px',
                color: colors.glyph,
                whiteSpace: 'pre',
              },
              children: field,
            },
          },
        },
      },
      {
        type: 'div',
        props: {
          style: { display: 'flex', flexDirection: 'column', width: 500, height: '100%' },
          children: [
            {
              type: 'div',
              props: {
                style: { display: 'flex', alignItems: 'center', gap: 14 },
                children: [
                  {
                    type: 'img',
                    props: { src: dataUri(icon), width: 54, height: 54, style: { borderRadius: 12 } },
                  },
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', flexDirection: 'column' },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: { fontFamily: 'Familjen Grotesk', fontWeight: 600, fontSize: 25, lineHeight: 1.1 },
                            children: 'Media Downloader',
                          },
                        },
                        {
                          type: 'div',
                          props: {
                            style: {
                              fontFamily: 'JetBrains Mono',
                              fontSize: 12,
                              color: colors.muted,
                              marginTop: 3,
                            },
                            children: 'yt-dlp + ffmpeg',
                          },
                        },
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
                  marginTop: 42,
                  fontFamily: 'Familjen Grotesk',
                  fontWeight: 600,
                  fontSize: 58,
                  lineHeight: 1.02,
                  letterSpacing: '-0.03em',
                },
                children: [
                  { type: 'div', props: { style: { display: 'flex' }, children: 'Bajá el video' } },
                  { type: 'div', props: { style: { display: 'flex' }, children: 'o el audio.' } },
                ],
              },
            },
            {
              type: 'div',
              props: {
                style: { marginTop: 16, fontSize: 21, lineHeight: 1.45, color: colors.ink2, maxWidth: 430 },
                children: 'Windows, Linux y macOS. Sin cuenta y sin subir enlaces.',
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: 30,
                  height: 52,
                  paddingLeft: 24,
                  paddingRight: 24,
                  width: 200,
                  borderRadius: 6,
                  backgroundColor: colors.accent,
                  color: colors.accentInk,
                  fontFamily: 'Familjen Grotesk',
                  fontWeight: 500,
                  fontSize: 18,
                  justifyContent: 'center',
                },
                children: 'Descargar',
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: 26,
                  fontSize: 14,
                  color: colors.muted,
                },
                children: 'Instaladores con yt-dlp y ffmpeg',
              },
            },
          ],
        },
      },
      {
        type: 'div',
        props: {
          style: {
            position: 'absolute',
            left: 602,
            top: 132,
            display: 'flex',
            flexDirection: 'column',
            width: 536,
            padding: 8,
            border: `1px solid ${colors.rule}`,
            borderRadius: 8,
            backgroundColor: colors.paper,
            boxShadow: '0 20px 50px -30px rgba(23,27,34,0.45)',
          },
          children: [
            {
              type: 'img',
              props: {
                src: dataUri(screenshot),
                width: 520,
                height: 325,
                style: { objectFit: 'cover', borderRadius: 4 },
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                  fontFamily: 'JetBrains Mono',
                  fontSize: 10,
                  color: colors.muted,
                },
                children: [
                  { type: 'span', props: { children: 'cola real, descarga de X completada' } },
                  { type: 'span', props: { children: 'MP4 1280x1590' } },
                ],
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
      { name: 'Familjen Grotesk', data: familjen600, weight: 600, style: 'normal' },
      { name: 'Familjen Grotesk', data: familjen500, weight: 500, style: 'normal' },
      { name: 'IBM Plex Sans', data: plex400, weight: 400, style: 'normal' },
      { name: 'IBM Plex Sans', data: plex500, weight: 500, style: 'normal' },
      { name: 'JetBrains Mono', data: mono400, weight: 400, style: 'normal' },
    ],
  })
  // resvg 2.6 cannot parse the empty masks Satori emits for fully rounded
  // corners. Dropping them keeps the clip radius.
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
