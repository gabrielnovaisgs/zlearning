// client/src/features/chat/ContextSourceBar.tsx
import { useState, useRef, useEffect } from 'react';
import type { ContextSources } from './chat.service';

interface ContextSourceBarProps {
  value: ContextSources;
  onChange: (sources: ContextSources) => void;
}

export function ContextSourceBar({ value, onChange }: ContextSourceBarProps) {
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha painéis ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpenPanel(null);
        setShowProviderMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const localSources = value['local'] ?? [];
  const webEnabled = (value['web'] ?? []).length > 0;

  function toggleWeb() {
    if (webEnabled) {
      const { web: _, ...rest } = value;
      onChange(rest);
    } else {
      onChange({ ...value, web: [{ type: 'url', source: '__web__' }] });
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border-b border-border text-xs relative flex-wrap"
    >
      <span className="text-text-muted uppercase tracking-wider text-[10px]">Contexto</span>

      {/* Local chip */}
      <button
        onClick={() => setOpenPanel(openPanel === 'local' ? null : 'local')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors ${
          localSources.length > 0
            ? 'border-accent text-accent'
            : 'border-border text-text-muted hover:border-text-muted'
        }`}
      >
        📁 Local
        {localSources.length > 0 && (
          <span className="bg-accent text-bg-primary rounded-full px-1.5 text-[10px] font-semibold">
            {localSources.length}
          </span>
        )}
      </button>

      {/* Local panel */}
      {openPanel === 'local' && (
        <div className="absolute top-full left-0 mt-1 ml-3 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 min-w-65">
          <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
            Arquivos locais
          </div>
          {localSources.length === 0 && (
            <div className="px-3 py-3 text-text-muted text-xs">Nenhum arquivo adicionado</div>
          )}
          {localSources.map((src, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-bg-hover group">
              <span className="text-sm">📄</span>
              <span className="flex-1 text-text-primary truncate">{src.source}</span>
              <button
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary"
                onClick={() => onChange({
                  ...value,
                  local: localSources.filter((_, j) => j !== i),
                })}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Web chip */}
      <button
        onClick={toggleWeb}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors ${
          webEnabled
            ? 'border-blue-400 text-blue-400'
            : 'border-border text-text-muted hover:border-text-muted'
        }`}
      >
        🌐 Web
        {webEnabled && (
          <span className="bg-blue-400 text-bg-primary rounded-full px-1.5 text-[10px] font-semibold">
            on
          </span>
        )}
      </button>

      {/* Add source button */}
      <button
        onClick={() => setShowProviderMenu(!showProviderMenu)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-border text-text-muted hover:border-text-muted hover:text-text-primary text-xs transition-colors"
      >
        ＋ fonte
      </button>

      {/* Provider menu */}
      {showProviderMenu && (
        <div className="absolute top-full left-0 mt-1 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 w-70">
          <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
            Adicionar fonte de contexto
          </div>
          <div className="py-1">
            {[
              { icon: '📁', name: 'Arquivos locais', desc: 'Notas markdown e PDFs', provider: 'local', available: false, label: 'ativo' },
              { icon: '🌐', name: 'Busca web', desc: 'Resultados em tempo real', provider: 'web', available: false, label: 'ativo' },
              { icon: '🦙', name: 'Ollama', desc: 'Modelos locais (privado)', provider: 'ollama', available: true, label: '+ add' },
            ].map((p) => (
              <div
                key={p.provider}
                className={`flex items-center gap-3 px-3 py-2 ${p.available ? 'hover:bg-bg-hover cursor-pointer' : 'opacity-50'}`}
              >
                <span className="text-lg w-6 text-center">{p.icon}</span>
                <div className="flex-1">
                  <div className="text-text-primary text-xs font-medium">{p.name}</div>
                  <div className="text-text-muted text-[10px]">{p.desc}</div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  p.available ? 'bg-accent text-bg-primary' : 'bg-bg-hover text-text-muted'
                }`}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
