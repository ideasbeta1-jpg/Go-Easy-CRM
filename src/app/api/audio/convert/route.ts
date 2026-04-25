import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let inputPath: string | null = null
  let outputPath: string | null = null

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const timestamp = Date.now()
    inputPath = path.join(tmpdir(), `audio_in_${timestamp}.webm`)
    outputPath = path.join(tmpdir(), `audio_out_${timestamp}.ogg`)

    const buffer = Buffer.from(await audioFile.arrayBuffer())
    await writeFile(inputPath, buffer)

    // Convert webm/mp4 → ogg opus (what Meta accepts)
    await execAsync(`ffmpeg -y -i "${inputPath}" -c:a libopus -b:a 64k "${outputPath}"`)

    const oggBuffer = await readFile(outputPath)

    return new Response(oggBuffer, {
      headers: {
        'Content-Type': 'audio/ogg',
        'Content-Disposition': 'attachment; filename="audio.ogg"',
      },
    })
  } catch (error: any) {
    console.error('[audio/convert] Error:', error?.message || error)
    const isNotFound = error?.message?.includes('not found') || error?.message?.includes('No such file')
    return NextResponse.json(
      { error: isNotFound ? 'ffmpeg_not_installed' : 'conversion_failed', detail: error?.message },
      { status: 500 }
    )
  } finally {
    for (const p of [inputPath, outputPath]) {
      if (p) unlink(p).catch(() => {})
    }
  }
}
