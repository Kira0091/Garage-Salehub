import { useEffect, useMemo, useState } from "react";

const MAX_VIDEO_SECONDS = 30;

export default function VerificationMediaUploader({
  photos,
  setPhotos,
  videoFile,
  setVideoFile,
  uploadProgress = null,
  existingMedia = null,
}) {
  const [videoError, setVideoError] = useState("");
  const [photoUrls, setPhotoUrls] = useState([]);
  const videoPreview = useMemo(() => (videoFile ? URL.createObjectURL(videoFile) : ""), [videoFile]);

  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPhotoUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  useEffect(() => () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
  }, [videoPreview]);

  const onPhotoFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;
    const merged = [...photos, ...selected].slice(0, 8);
    setPhotos(merged);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, idx) => idx !== index));
  };

  const validateVideoDuration = (file) =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.src = url;
      probe.onloadedmetadata = () => {
        const valid = probe.duration <= MAX_VIDEO_SECONDS;
        URL.revokeObjectURL(url);
        resolve(valid);
      };
      probe.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
    });

  const onVideoFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const valid = await validateVideoDuration(file);
    if (!valid) {
      setVideoError("Verification video must be 30 seconds or shorter.");
      setVideoFile(null);
      return;
    }
    setVideoError("");
    setVideoFile(file);
  };

  return (
    <section style={{ gridColumn: "1 / -1", marginTop: 6 }}>
      <h3 style={{ marginBottom: 6 }}>Verification Media</h3>
      <p style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 12 }}>
        Upload at least 3 photos and 1 video (max 30s) showing the item with a handwritten note containing your username and today&apos;s date.
      </p>

      {existingMedia && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, border: "1px solid var(--gray-200)", background: "#f8fafc" }}>
          <div style={{ fontSize: 12, color: "var(--gray-600)" }}>
            Existing verification media: {existingMedia.photos?.length || 0} photo(s), {existingMedia.video ? "1 video" : "0 video"}
          </div>
          <div style={{ fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>
            Uploading new files will replace the current verification media.
          </div>
        </div>
      )}

      <div className="input-group" style={{ marginBottom: 10 }}>
        <label>Verification Photos * (minimum 3)</label>
        <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 6 }}>
          Admin-only proof photos. These are for verification review and are separate from listing images.
        </div>
        <input className="input-field" type="file" accept="image/*" multiple onChange={onPhotoFiles} />
      </div>

      {photoUrls.length > 0 && (
        <div style={{ marginBottom: 10, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
          {photoUrls.map((url, index) => (
            <div key={url} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--gray-200)" }}>
              <img src={url} alt={`Verification ${index + 1}`} style={{ width: "100%", height: 110, objectFit: "cover" }} />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  border: "none",
                  borderRadius: 999,
                  width: 22,
                  height: 22,
                  cursor: "pointer",
                  background: "rgba(0,0,0,0.75)",
                  color: "white",
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="input-group" style={{ marginBottom: 8 }}>
        <label>Verification Video * (max 30 seconds)</label>
        <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 6 }}>
          Admin-only proof video showing the item and handwritten note (username + date).
        </div>
        <input className="input-field" type="file" accept="video/*" onChange={onVideoFile} />
      </div>
      {videoError && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 8 }}>{videoError}</div>}

      {videoPreview && (
        <div style={{ marginBottom: 10 }}>
          <video controls src={videoPreview} style={{ width: "100%", maxWidth: 320, borderRadius: 8, border: "1px solid var(--gray-200)" }} />
          <div style={{ marginTop: 6 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVideoFile(null)}>
              Remove Video
            </button>
          </div>
        </div>
      )}

      {uploadProgress !== null && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "var(--gray-600)", marginBottom: 4 }}>Upload Progress: {uploadProgress}%</div>
          <div style={{ width: "100%", height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${uploadProgress}%`, height: "100%", background: "#ef4444", transition: "width 0.2s ease" }} />
          </div>
        </div>
      )}
    </section>
  );
}
