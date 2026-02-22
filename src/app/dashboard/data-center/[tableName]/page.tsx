
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import TableView from './TableView';

export default function TableViewPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3">Loading Table...</p>
      </div>
    }>
      <TableView />
    </Suspense>
  );
}
