interface CustomCssValidationSectionProps {
  validation: { ok: boolean; error?: string };
}

export function CustomCssValidationSection({ validation }: CustomCssValidationSectionProps) {
  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3">
      <div className="text-sm text-zinc-200 font-medium">Validation</div>
      <div className="text-xs text-zinc-500 mt-1">Best-effort CSS parse check using browser APIs. Not a full linter, but catches obvious syntax failures.</div>

      <div className="mt-3">
        {validation.ok ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-sm text-emerald-200">
            CSS parsed OK
          </div>
        ) : (
          <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-200">
            CSS parse error
            <div className="mt-2 text-xs text-red-200/80 whitespace-pre-wrap font-mono">{validation.error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

