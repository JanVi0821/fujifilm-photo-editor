type TopBarProps = {
  onExport: () => void
  onUpload: (file: File) => void
  canExport: boolean
  isProcessing: boolean
}

const BTN_BASE =
  'inline-flex items-center justify-center px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] rounded-[2px] border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

export function TopBar({ onExport, onUpload, canExport, isProcessing }: TopBarProps) {
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-panel px-4 md:px-6">
      <div className="flex items-center gap-8">
        <h1 className="m-0 font-serif text-[16px] font-normal tracking-[0.02em] text-fg md:text-[18px]">
          Fujifilm Simulator
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <label
          className={`${BTN_BASE} border-border-light bg-transparent text-fg-secondary hover:bg-hover hover:text-fg`}
        >
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
          className={`${BTN_BASE} border-accent bg-accent text-app hover:border-accent-hover hover:bg-accent-hover`}
          onClick={onExport}
          disabled={!canExport || isProcessing}
        >
          Export
        </button>
      </div>
    </header>
  )
}
