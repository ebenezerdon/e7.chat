import { useState, useEffect } from 'react'

const ImageGenerationAnimation = ({ prompt }) => {
  const [progress, setProgress] = useState(0)
  const [noiseOffset, setNoiseOffset] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const duration = 10000 // 10 seconds

    const animate = () => {
      const elapsed = Date.now() - startTime
      const currentProgress = Math.min(elapsed / duration, 1)

      setProgress(currentProgress)
      setNoiseOffset((prev) => prev + 0.1) // Slow noise animation

      if (currentProgress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }, [])

  // Blur decreases from 15px to 0px
  const blurAmount = Math.max(15 - progress * 15, 0)

  // Simple realistic image with animated noise
  const placeholderImage = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E
    %3Cdefs%3E
      %3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E
        %3Cstop offset='0%25' style='stop-color:%23a0a0a0' /%3E
        %3Cstop offset='50%25' style='stop-color:%238a8a8a' /%3E
        %3Cstop offset='100%25' style='stop-color:%23757575' /%3E
      %3C/linearGradient%3E
      %3Cfilter id='noise'%3E
        %3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' seed='${Math.floor(
          noiseOffset,
        )}' stitchTiles='stitch'/%3E
      %3C/filter%3E
    %3C/defs%3E
    %3Crect width='400' height='400' fill='url(%23bg)' /%3E
    %3Crect width='400' height='400' fill='white' filter='url(%23noise)' opacity='0.3' mix-blend-mode='overlay' /%3E
  %3C/svg%3E`

  return (
    <div className="generated-image-display">
      <img
        src={placeholderImage}
        alt="Generating image..."
        className="chat-generated-image"
        style={{
          filter: `blur(${blurAmount}px)`,
        }}
      />
    </div>
  )
}

export default ImageGenerationAnimation
