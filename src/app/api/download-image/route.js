export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const imageUrl = searchParams.get('url')
    const filename = searchParams.get('filename') || 'generated-image.png'

    if (!imageUrl) {
      return Response.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Fetch the image from the external URL
    const response = await fetch(imageUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'

    // Return the image with appropriate headers
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
  } catch (error) {
    console.error('Image download failed:', error)
    return Response.json({ error: 'Failed to download image' }, { status: 500 })
  }
}
