import { useEffect, useState, type CSSProperties } from 'react';
import { BookOpen } from 'lucide-react';
import { GuestPromptEditor } from '../../features/guestPrompt/GuestPromptEditor';
import { createLibraryBridge, type LibraryBridge } from './bridge';
import { PersonalLibraryWidget } from './PersonalLibraryWidget';
import './widget.css';
import './promptViews.css';

function GuestWidget({ bridge, claimOrigin }: { bridge: LibraryBridge; claimOrigin: string }) {
  return <main className="library-widget library-mode-inline library-extra">
    <header className="library-header"><div className="library-brand"><BookOpen size={20} aria-hidden="true" /><h1>Crea un prompt</h1></div></header>
    <GuestPromptEditor claimOrigin={claimOrigin} publishTransfer={async input => {
      await bridge.connect();
      return bridge.call('create_prompt_transfer', input);
    }} />
  </main>;
}

export function PromptViews({ view, claimOrigin }: { view: 'guest' | 'personal'; claimOrigin: string }) {
  const [bridge] = useState(createLibraryBridge);
  const [layout, setLayout] = useState(() => bridge.layoutContext());
  useEffect(() => {
    const unsubscribe = bridge.subscribe(event => { if (event.type === 'context') setLayout(bridge.layoutContext()); });
    void bridge.connect();
    return unsubscribe;
  }, [bridge]);
  const style = {
    '--library-safe-top': `${layout.safeAreaInsets.top}px`,
    '--library-safe-right': `${layout.safeAreaInsets.right}px`,
    '--library-safe-bottom': `${layout.safeAreaInsets.bottom}px`,
    '--library-safe-left': `${layout.safeAreaInsets.left}px`,
    ...(layout.maxHeight ? { '--library-host-max-height': `${layout.maxHeight}px` } : {}),
  } as CSSProperties;
  return <div style={style}>
    {view === 'guest' ? <GuestWidget bridge={bridge} claimOrigin={claimOrigin} /> : <PersonalLibraryWidget bridge={bridge} />}
  </div>;
}
