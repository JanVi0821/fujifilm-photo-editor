type TopBarProps = {
  onExport: () => void
  onUpload: (file: File) => void
  canExport: boolean
  isProcessing: boolean
}

export function TopBar({ onExport, onUpload, canExport, isProcessing }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <h1 className="logo">Fujifilm Editor</h1>
      </div>

      <div className="top-bar-right">
        <label className="btn btn-ghost upload-btn">
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUpload(file)
              e.target.value = ''
            }}
          />
          Upload
        </label>
        <button
          className="btn btn-primary"
          onClick={onExport}
          disabled={!canExport || isProcessing}
        >
          Export
        </button>
      </div>
    </header>
  )
}
