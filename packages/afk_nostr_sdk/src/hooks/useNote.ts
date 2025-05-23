import {NDKKind} from '@nostr-dev-kit/ndk';
import {useQuery} from '@tanstack/react-query';

import {useNostrContext} from '../context/NostrContext';
export type UseNoteOptions = {
  noteId: string;
};

export const useNote = (options: UseNoteOptions) => {
  const {ndk} = useNostrContext();

  return useQuery({
    queryKey: ['note', options.noteId, ndk],
    queryFn: async () => {
      const note = await ndk.fetchEvent({
        kinds: [NDKKind.Text, NDKKind.Article],
        ids: [options.noteId],
      });

      return note ?? undefined;
    },
  });
};
