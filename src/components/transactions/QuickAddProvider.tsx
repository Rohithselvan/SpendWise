import * as React from 'react';
import { QuickAddContext, type QuickAddRequest } from './QuickAddContext';
import { TransactionSheet } from './TransactionSheet';

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = React.useState<QuickAddRequest | null>(null);
  const [open, setOpen] = React.useState(false);
  // A key forces a fresh form (reset) each time the sheet opens.
  const [nonce, setNonce] = React.useState(0);

  const api = React.useMemo(
    () => ({
      open: (req: QuickAddRequest = { mode: 'create', type: 'expense' }) => {
        setRequest(req);
        setNonce((n) => n + 1);
        setOpen(true);
      },
    }),
    [],
  );

  return (
    <QuickAddContext.Provider value={api}>
      {children}
      {request && <TransactionSheet key={nonce} open={open} onOpenChange={setOpen} request={request} onAddAnother={(type) => api.open({ mode: 'create', type })} />}
    </QuickAddContext.Provider>
  );
}
