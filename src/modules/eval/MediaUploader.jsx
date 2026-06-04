import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function MediaUploader({ athleteId, skillId, sessionId, existingMedia, onSaved, onDeleted }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  async function handleDelete() {
    if (!confirm('Remove this photo/video?')) return
    setPreview(null)
    onDeleted()
  }

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    if (!isVideo && !isImage) {
      setError('Please upload a photo or video file.')
      return
    }

    // 100MB limit for video, 10MB for photos
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError(isVideo ? 'Video must be under 100MB.' : 'Photo must be under 10MB.')
      return
    }

    setError('')
    setUploading(true)

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview({ url: objectUrl, type: isVideo ? 'video' : 'image' })

    try {
      const ext = file.name.split('.').pop()
      const path = `${sessionId}/${athleteId}/${skillId}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('eval-media')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('eval-media')
        .getPublicUrl(path)

      onSaved(publicUrl, isVideo ? 'video' : 'photo')
    } catch (err) {
      console.error(err)
      setError('Upload failed. Please try again.')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const mediaUrl = preview?.url || existingMedia?.url
  const mediaType = preview?.type || existingMedia?.type

  return (
    <div className="mt-2">
      {error && (
        <div className="text-xs text-red-600 mb-1">{error}</div>
      )}

      {mediaUrl ? (
        <div className="flex items-start gap-2">
          {mediaType === 'video' ? (
            <video
              src={mediaUrl}
              className="w-32 h-20 object-cover rounded-lg border border-gray-200"
              controls
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Skill media"
              className="w-20 h-20 object-cover rounded-lg border border-gray-200"
            />
          )}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => fileRef.current?.click()}
              className="px-2 py-1 bg-[#1B2E4B] text-white rounded-lg text-xs font-medium hover:bg-[#243d63] transition-colors"
              title="Replace"
            >
              Replace
            </button>
            <button
              onClick={handleDelete}
              className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
              title="Delete"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              📎 Add photo/video
            </>
          )}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
