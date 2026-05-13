export async function exportGraphPng(
  exportAsSvgText: (options: { embedImages: boolean }) => Promise<string>
): Promise<void> {
  try {
    let svgText = await exportAsSvgText({ embedImages: true })

    // Inject font styles into SVG so exported PNG has readable text.
    // The SVG loses CSS class references and external fonts on export.
    const fontStyle = `<style>
      text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      text[font-family*="monospace"] { font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; }
    </style>`
    svgText = svgText.replace(/<svg([^>]*)>/, `<svg$1>${fontStyle}`)

    // Add dark background to the SVG
    const bgRect = `<rect width="100%" height="100%" fill="#0a0a0a" />`
    svgText = svgText.replace(/<svg([^>]*)>(<style>[\s\S]*?<\/style>)/, `<svg$1>$2${bgRect}`)

    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth * 2
      canvas.height = img.naturalHeight * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `topology-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
    }
    img.src = url
  } catch {
    // Export failed silently
  }
}
