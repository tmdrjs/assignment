interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** 되돌릴 수 없는 동작 전에 한 번 더 확인받는 화면 안 대화상자. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="overlay overlay--fixed" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="overlay__panel overlay__panel--sm">
        <h2 className="overlay__title" id="confirm-title">
          {title}
        </h2>
        <p className="overlay__message">{message}</p>
        <div className="overlay__actions">
          <button type="button" className="button button--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="button" onClick={onCancel} autoFocus>
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
